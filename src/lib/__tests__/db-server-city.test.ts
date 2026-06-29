// Proves that every public read goes through db.server's city-scoped helpers
// (cityTable / guideEntries / cityTableSelect) and that the underlying client
// is wrapped by the city-guard. Together with city-guard.test.ts this means:
//   - Every helper-built query injects city='canberra' (or scopes by guide_id
//     for guide_entries, or by slug for cities).
//   - Any query that bypasses the helpers and hits the wrapped client without
//     the required scope throws.
//
// We mock @supabase/supabase-js so importing db.server does not touch the
// network; the fake captures every chained call and surfaces them for asserts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { citySlug } from "@/lib/city";
import fs from "node:fs";
import path from "node:path";

type Call = { method: string; args: unknown[] };

function makeFakeClient() {
  const queries: Array<{ table: string; calls: Call[] }> = [];
  const rpcCalls: Array<{ fn: string; args?: Record<string, unknown> }> = [];
  const rpc = (fn: string, args?: Record<string, unknown>) => {
    rpcCalls.push({ fn, args });
    return Promise.resolve({ data: [], error: null });
  };

  function builder(table: string) {
    const calls: Call[] = [];
    queries.push({ table, calls });
    const b: Record<string, unknown> = {};
    const chain =
      (name: string) =>
      (...args: unknown[]) => {
        calls.push({ method: name, args });
        return b;
      };
    for (const m of [
      "select",
      "insert",
      "upsert",
      "update",
      "delete",
      "eq",
      "neq",
      "not",
      "is",
      "in",
      "order",
      "limit",
      "range",
      "maybeSingle",
      "single",
    ]) {
      b[m] = chain(m);
    }
    b.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return b;
  }
  return {
    client: { from: builder, rpc },
    queries,
    rpcCalls,
  };
}

let fake: ReturnType<typeof makeFakeClient>;

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => fake.client,
}));

beforeEach(() => {
  fake = makeFakeClient();
  vi.resetModules();
});

afterEach(() => vi.clearAllMocks());

async function loadDb() {
  // Fresh import after the mock + reset so db.server picks up our fake client.
  return await import("@/lib/db.server");
}

function hasFilter(calls: Call[], method: string, col: string, val: unknown) {
  return calls.some(
    (c) => c.method === method && c.args[0] === col && (val === undefined || c.args[1] === val),
  );
}

describe("db.server helpers always scope reads", () => {
  it.each(["articles", "events", "guides", "listings"] as const)(
    "cityTable('%s') applies .eq('city', '%s') and resolves",
    async (table) => {
      const { cityTable } = await loadDb();
      await expect(cityTable(table)).resolves.toBeTruthy();
      const q = fake.queries.find((x) => x.table === table)!;
      expect(hasFilter(q.calls, "eq", "city", citySlug())).toBe(true);
    },
  );

  it.each(["audio_briefings", "live_feed", "obituaries"] as const)(
    "cityTable('%s') applies .eq('city', '%s') and resolves",
    async (table) => {
      const { cityTable } = await loadDb();
      await expect(cityTable(table)).resolves.toBeTruthy();
      const q = fake.queries.find((x) => x.table === table)!;
      expect(hasFilter(q.calls, "eq", "city", citySlug())).toBe(true);
    },
  );

  it("cityTable('cities') applies .eq('slug', citySlug()) instead of city", async () => {
    const { cityTable } = await loadDb();
    await expect(cityTable("cities")).resolves.toBeTruthy();
    const q = fake.queries.find((x) => x.table === "cities")!;
    expect(hasFilter(q.calls, "eq", "slug", citySlug())).toBe(true);
  });

  it("guideEntries(guideId) scopes by guide_id and excludes null source_url", async () => {
    const { guideEntries } = await loadDb();
    await expect(guideEntries("g-123")).resolves.toBeTruthy();
    const q = fake.queries.find((x) => x.table === "guide_entries")!;
    expect(hasFilter(q.calls, "eq", "guide_id", "g-123")).toBe(true);
    expect(
      q.calls.some((c) => c.method === "not" && c.args[0] === "source_url" && c.args[1] === "is"),
    ).toBe(true);
  });

  it("cityTableSelect injects city on a column-projected read", async () => {
    const { cityTableSelect } = await loadDb();
    await expect(cityTableSelect("articles", "id,slug,title")).resolves.toBeTruthy();
    const q = fake.queries.find((x) => x.table === "articles")!;
    expect(hasFilter(q.calls, "eq", "city", citySlug())).toBe(true);
  });

  it("listApprovedCommentsRpc calls list_approved_comments with city===citySlug()", async () => {
    const { listApprovedCommentsRpc } = await loadDb();
    await expect(listApprovedCommentsRpc("article-uuid")).resolves.toBeTruthy();
    const call = fake.rpcCalls.find((c) => c.fn === "list_approved_comments");
    expect(call, "rpc was invoked").toBeTruthy();
    expect(call!.args?.city).toBe(citySlug());
    expect(call!.args?.article_id).toBe("article-uuid");
  });
});

describe("unscoped queries on the wrapped client throw", () => {
  it.each([
    "articles",
    "events",
    "guides",
    "listings",
    "audio_briefings",
    "live_feed",
    "obituaries",
  ] as const)(
    "raw .from('%s').select() without city filter throws via city-guard",
    async (table) => {
      const { dbInsertClient } = await loadDb();
      const raw = dbInsertClient();
      await expect(raw.from(table).select("*")).rejects.toThrow(/city-guard/);
    },
  );

  it("raw .from('guide_entries').select() without guide_id throws", async () => {
    const { dbInsertClient } = await loadDb();
    const raw = dbInsertClient();
    await expect(raw.from("guide_entries").select("*")).rejects.toThrow(/city-guard/);
  });
});

// Source-level guarantee: data.functions.ts must not bypass db.server helpers
// by calling supabase.from(...) directly. The only allowed query entry points
// for public reads are cityTable / cityTableSelect / guideEntries.
describe("data.functions.ts source code shape", () => {
  const file = path.resolve(__dirname, "../data.functions.ts");
  const source = fs.readFileSync(file, "utf8");

  it("never calls .from(...) directly (must use helpers)", () => {
    // Strip comments so example references inside comments don't count.
    const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(stripped).not.toMatch(/\bsupabase\s*\.from\s*\(/);
    expect(stripped).not.toMatch(
      /\.from\s*\(\s*["'`](articles|events|guides|listings|guide_entries|cities|article_comments|comment_flags)["'`]\s*\)/,
    );
  });

  it("imports cityTable from db.server", () => {
    expect(source).toMatch(/import\(\s*["']@\/lib\/db\.server["']\s*\)/);
    expect(source).toMatch(/cityTable/);
  });
});
