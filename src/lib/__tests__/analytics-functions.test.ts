// Proves the first-party event tracker writes a city-scoped row to site_events
// through the wrapped (city-guarded) client, and that the city-guard accepts a
// site_events insert only when city='canberra' is present.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { citySlug } from "@/lib/city";
import { withCityGuard } from "@/lib/city-guard";
import { SITE_EVENT_NAMES } from "@/lib/schema";

type Call = { method: string; args: unknown[] };

function makeFakeClient() {
  const queries: Array<{ table: string; calls: Call[] }> = [];
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
      "gte",
      "order",
      "limit",
    ]) {
      b[m] = chain(m);
    }
    b.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return b;
  }
  return {
    client: { from: builder, rpc: () => Promise.resolve({ data: null, error: null }) },
    queries,
  };
}

let fake: ReturnType<typeof makeFakeClient>;
vi.mock("@supabase/supabase-js", () => ({ createClient: () => fake.client }));

beforeEach(() => {
  fake = makeFakeClient();
  vi.resetModules();
});
afterEach(() => vi.clearAllMocks());

describe("trackEvent", () => {
  it("inserts a city-scoped site_events row", async () => {
    const { runWithStartContext } = await import("@tanstack/start-storage-context");
    const { trackEvent } = await import("@/lib/analytics.functions");
    // Server fns require Start AsyncLocalStorage context to run.
    await runWithStartContext({} as never, async () => {
      await trackEvent({ data: { eventName: "pageview", path: "/", anonSessionId: "abc" } });
    });
    const q = fake.queries.find((x) => x.table === "site_events");
    expect(q).toBeTruthy();
    const insert = q!.calls.find((c) => c.method === "insert");
    expect(insert).toBeTruthy();
    const row = insert!.args[0] as Record<string, unknown>;
    expect(row.city).toBe(citySlug());
    expect(row.event_name).toBe("pageview");
  });
});

describe("city-guard accepts site_events insert only with city", () => {
  function wrap() {
    return withCityGuard(fake.client as never) as unknown as {
      from: (t: string) => {
        insert: (r: unknown) => Promise<unknown>;
        select: (c: string) => { eq: (col: string, v: unknown) => Promise<unknown> };
      };
    };
  }

  it("insert without city throws", async () => {
    const c = wrap();
    await expect(c.from("site_events").insert({ event_name: "pageview" })).rejects.toThrow(
      /city-guard/,
    );
  });

  it("insert with city passes", async () => {
    const c = wrap();
    await expect(
      c.from("site_events").insert({ city: citySlug(), event_name: "pageview" }),
    ).resolves.toBeTruthy();
  });

  it("select without city filter throws (anon must never read events)", async () => {
    const c = wrap();
    await expect(c.from("site_events").select("*")).rejects.toThrow(/city-guard/);
  });
});

describe("event name set is the documented six", () => {
  it("matches the migration CHECK list", () => {
    expect(SITE_EVENT_NAMES).toEqual([
      "pageview",
      "newsletter_signup",
      "newsletter_confirmed",
      "article_read",
      "audio_play",
      "live_feed_click",
    ]);
  });
});
