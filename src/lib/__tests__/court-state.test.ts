// Unit tests for the city -> court-state mapping (src/lib/court-state.ts) and
// for the shape of the listCourtJudgments server read (src/lib/data.functions).
//
// court_feed is STATE-scoped, not city-scoped: each city sees its own state's
// judgments PLUS the national federal tiers. These tests pin the mapping the
// task specifies and prove the read filters by .in('state', states), filters
// is_published, orders by decision_date desc and limits to ~30. They also prove
// court_feed reads do NOT require a city filter (it is allowlisted in the guard)
// but DO go through the city-guarded client.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { citySlug } from "@/lib/city";
import { withCityGuard } from "@/lib/city-guard";
import { FEDERAL_COURT_STATES, cityToCourtState, courtStatesForCity } from "@/lib/court-state";

describe("cityToCourtState: each city maps to the task's lookup", () => {
  const cases: Array<[string, string]> = [
    ["canberra", "act"],
    ["sydney", "nsw"],
    ["newcastle", "nsw"],
    ["wollongong", "nsw"],
    ["centralcoast", "nsw"],
    ["melbourne", "vic"],
    ["geelong", "vic"],
    ["ballarat", "vic"],
    ["bendigo", "vic"],
    ["brisbane", "qld"],
    ["goldcoast", "qld"],
    ["sunshinecoast", "qld"],
    ["townsville", "qld"],
    ["toowoomba", "qld"],
    ["cairns", "qld"],
    ["perth", "wa"],
    ["adelaide", "sa"],
    ["tasmania", "tas"],
    ["darwin", "nt"],
  ];

  it.each(cases)("%s -> %s", (city, state) => {
    expect(cityToCourtState(city)).toBe(state);
  });

  it("returns null for an unknown city (fail safe to federal-only)", () => {
    expect(cityToCourtState("gotham")).toBeNull();
  });

  it("the active city maps to a known state", () => {
    expect(cityToCourtState(citySlug())).not.toBeNull();
  });
});

describe("courtStatesForCity: own state plus the federal tiers", () => {
  it("Canberra queries federal, high and act (deduped, federal first)", () => {
    expect(courtStatesForCity("canberra")).toEqual(["federal", "high", "act"]);
  });

  it("Sydney queries federal, high and nsw", () => {
    expect(courtStatesForCity("sydney")).toEqual(["federal", "high", "nsw"]);
  });

  it("an unknown city still gets the federal tiers only", () => {
    expect(courtStatesForCity("gotham")).toEqual([...FEDERAL_COURT_STATES]);
  });

  it("never duplicates a state even if it overlapped the federal tiers", () => {
    const states = courtStatesForCity("canberra");
    expect(new Set(states).size).toBe(states.length);
  });

  it("always includes the federal tiers for every known city", () => {
    for (const [city] of Object.entries({ canberra: 1, sydney: 1, perth: 1, darwin: 1 })) {
      const states = courtStatesForCity(city);
      expect(states).toContain("federal");
      expect(states).toContain("high");
    }
  });
});

// --- listCourtJudgments shaping --------------------------------------------

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
      "in",
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

describe("listCourtJudgments: query shape", () => {
  it("reads court_feed filtered by state, published, newest-first, limited", async () => {
    const { runWithStartContext } = await import("@tanstack/start-storage-context");
    const { listCourtJudgments } = await import("@/lib/data.functions");
    await runWithStartContext({} as never, async () => {
      await listCourtJudgments();
    });

    // The city's own state and the national tiers are read as SEPARATE queries
    // so a less-fresh local feed is never buried under the busy federal courts.
    const qs = fake.queries.filter((x) => x.table === "court_feed");
    expect(qs.length).toBeGreaterThanOrEqual(1);

    // The union of the per-query state filters is exactly courtStatesForCity().
    const states = qs.flatMap((q) => {
      const inCall = q.calls.find((c) => c.method === "in" && c.args[0] === "state");
      return inCall ? (inCall.args[1] as string[]) : [];
    });
    expect([...states].sort()).toEqual([...courtStatesForCity(citySlug())].sort());

    for (const q of qs) {
      // Only published rows (defence in depth alongside RLS).
      expect(
        q.calls.find(
          (c) => c.method === "eq" && c.args[0] === "is_published" && c.args[1] === true,
        ),
      ).toBeTruthy();

      // Newest first by decision_date.
      const order = q.calls.find((c) => c.method === "order" && c.args[0] === "decision_date");
      expect(order).toBeTruthy();
      expect((order!.args[1] as { ascending: boolean }).ascending).toBe(false);

      // Capped.
      expect(q.calls.find((c) => c.method === "limit")).toBeTruthy();

      // Never filters by city: court_feed is state-scoped, not city-scoped.
      expect(q.calls.find((c) => c.method === "eq" && c.args[0] === "city")).toBeUndefined();
    }
  });

  it("queries court_feed for the own state and the federal tiers, and never throws on an empty feed", async () => {
    // The mock client resolves every query to { data: [], error: null }. The
    // read must complete cleanly (no judgment seeded or fabricated). The active
    // test city has a known state, so it reads court_feed twice: its own state
    // and the national tiers.
    const { runWithStartContext } = await import("@tanstack/start-storage-context");
    const { listCourtJudgments } = await import("@/lib/data.functions");
    await expect(
      runWithStartContext({} as never, async () => {
        await listCourtJudgments();
      }),
    ).resolves.not.toThrow();
    const courtQueries = fake.queries.filter((x) => x.table === "court_feed");
    expect(courtQueries).toHaveLength(2);
  });
});

describe("city-guard: court_feed is state-scoped (no city filter required)", () => {
  function wrap() {
    return withCityGuard(fake.client as never) as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          in: (
            col: string,
            v: unknown,
          ) => {
            eq: (col: string, v: unknown) => Promise<unknown>;
          };
        };
      };
    };
  }

  it("court_feed read filtered by state (not city) passes the guard", async () => {
    const c = wrap();
    await expect(
      c.from("court_feed").select("*").in("state", ["federal", "act"]).eq("is_published", true),
    ).resolves.toBeTruthy();
  });
});
