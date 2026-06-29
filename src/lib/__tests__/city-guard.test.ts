// Integration tests for the city-guard Supabase wrapper.
// These fail if a query against a city-scoped table is awaited without the
// city filter applied. They cover the exact chain shapes used by the
// /best index and /best/$slug pages (listPublishedGuides + getGuideBySlug).
import { describe, expect, it } from "vitest";
import { withCityGuard } from "@/lib/city-guard";
import { citySlug } from "@/lib/city";

// A slug guaranteed to differ from the active citySlug(), so the "wrong city" cases
// stay wrong under any VITE_SITE_CITY build.
const WRONG_CITY = citySlug() === "sydney" ? "canberra" : "sydney";

// Minimal Postgrest-builder-shaped fake. Every chainable method returns the
// same builder; awaiting resolves to a benign empty result. The guard runs
// before .then resolves, so a missing city filter throws synchronously when
// the promise settles.
type Builder = {
  select: (...args: unknown[]) => Builder;
  insert: (...args: unknown[]) => Builder;
  upsert: (...args: unknown[]) => Builder;
  update: (...args: unknown[]) => Builder;
  delete: (...args: unknown[]) => Builder;
  eq: (...args: unknown[]) => Builder;
  neq: (...args: unknown[]) => Builder;
  not: (...args: unknown[]) => Builder;
  is: (...args: unknown[]) => Builder;
  in: (...args: unknown[]) => Builder;
  order: (...args: unknown[]) => Builder;
  limit: (...args: unknown[]) => Builder;
  range: (...args: unknown[]) => Builder;
  maybeSingle: (...args: unknown[]) => Builder;
  single: (...args: unknown[]) => Builder;
  then: (resolve: (v: unknown) => unknown) => Promise<unknown>;
};

type FakeClient = {
  from: (table: string) => Builder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<unknown>;
};

function fakeClient(): FakeClient {
  const builder = (table: string): Builder => {
    const b = { _table: table } as unknown as Builder;
    const chain = (..._args: unknown[]) => b;
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
    ] as const) {
      (b as unknown as Record<string, unknown>)[m] = chain;
    }
    b.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    return b;
  };
  const rpc = (_fn: string, _args?: Record<string, unknown>) =>
    Promise.resolve({ data: null, error: null });
  return { from: builder, rpc };
}

function wrap(): FakeClient {
  return withCityGuard(fakeClient() as never) as unknown as FakeClient;
}

describe("city-guard: city-scoped tables", () => {
  for (const table of [
    "articles",
    "events",
    "guides",
    "listings",
    "obituaries",
    // Have Your Say comments. comment_flags has a city column too, so it is
    // CITY_SCOPED (NOT in UNSCOPED_ALLOWLIST) and must be city-filtered.
    "article_comments",
    "comment_flags",
  ] as const) {
    it(`${table}.select requires .eq('city', '${citySlug()}')`, async () => {
      const c = wrap();
      await expect(
        c
          .from(table)
          // missing city filter
          .select("*")
          .eq("is_published", true),
      ).rejects.toThrow(/city-guard/);
    });

    it(`${table}.select passes when .eq('city', '${citySlug()}') is applied`, async () => {
      const c = wrap();
      await expect(
        c.from(table).select("*").eq("city", citySlug()).eq("is_published", true),
      ).resolves.toBeTruthy();
    });

    it(`${table}.select with wrong city throws`, async () => {
      const c = wrap();
      await expect(c.from(table).select("*").eq("city", WRONG_CITY)).rejects.toThrow(/city-guard/);
    });

    it(`${table}.update requires city filter`, async () => {
      const c = wrap();
      await expect(c.from(table).update({ x: 1 }).eq("id", "abc")).rejects.toThrow(/city-guard/);
    });

    it(`${table}.delete requires city filter`, async () => {
      const c = wrap();
      await expect(c.from(table).delete().eq("id", "abc")).rejects.toThrow(/city-guard/);
    });
  }
});

describe("city-guard: subscribers and enquiries (insert/upsert)", () => {
  it("subscribers.upsert without city throws", async () => {
    const c = wrap();
    await expect(c.from("subscribers").upsert({ email: "a@b.com" })).rejects.toThrow(/city-guard/);
  });

  it("subscribers.upsert with city passes", async () => {
    const c = wrap();
    await expect(
      c.from("subscribers").upsert({ city: citySlug(), email: "a@b.com" }),
    ).resolves.toBeTruthy();
  });

  it("enquiries.insert without city throws", async () => {
    const c = wrap();
    await expect(c.from("enquiries").insert({ type: "tip", payload: {} })).rejects.toThrow(
      /city-guard/,
    );
  });

  it("enquiries.insert with city passes", async () => {
    const c = wrap();
    await expect(
      c.from("enquiries").insert({ city: citySlug(), type: "tip", payload: {} }),
    ).resolves.toBeTruthy();
  });
});

describe("city-guard: guide_entries (no city column)", () => {
  it("select without guide_id or id throws", async () => {
    const c = wrap();
    await expect(c.from("guide_entries").select("*")).rejects.toThrow(/city-guard/);
  });

  it("select scoped by guide_id passes", async () => {
    const c = wrap();
    await expect(c.from("guide_entries").select("*").eq("guide_id", "g1")).resolves.toBeTruthy();
  });

  it("update by id passes (admin entry editor)", async () => {
    const c = wrap();
    await expect(c.from("guide_entries").update({ rank: 1 }).eq("id", "e1")).resolves.toBeTruthy();
  });

  it("insert passes (admin entry creation)", async () => {
    const c = wrap();
    await expect(
      c.from("guide_entries").insert({ guide_id: "g1", business_name: "x" }),
    ).resolves.toBeTruthy();
  });
});

describe("city-guard: /best page chains", () => {
  // Mirrors listPublishedGuides in src/lib/data.functions.ts → /best index.
  it("listPublishedGuides chain passes", async () => {
    const c = wrap();
    await expect(
      c
        .from("guides")
        .select("*")
        .eq("city", citySlug())
        .eq("is_published", true)
        .order("title", { ascending: true })
        .limit(500),
    ).resolves.toBeTruthy();
  });

  // Mirrors getGuideBySlug → /best/$slug detail page.
  it("getGuideBySlug guide read passes", async () => {
    const c = wrap();
    await expect(
      c
        .from("guides")
        .select("*")
        .eq("city", citySlug())
        .eq("slug", "best-coffee")
        .eq("is_published", true)
        .maybeSingle(),
    ).resolves.toBeTruthy();
  });

  it("getGuideBySlug entries read passes (scoped by guide_id)", async () => {
    const c = wrap();
    await expect(
      c
        .from("guide_entries")
        .select("*")
        .eq("guide_id", "g1")
        .not("source_url", "is", null)
        .order("rank", { ascending: true }),
    ).resolves.toBeTruthy();
  });

  // Regression: a /best page that forgot the city filter must fail.
  it("guides read without city filter throws (regression for /best)", async () => {
    const c = wrap();
    await expect(
      c.from("guides").select("*").eq("is_published", true).order("title", { ascending: true }),
    ).rejects.toThrow(/city-guard/);
  });
});

describe("city-guard: /obituaries page chain", () => {
  // Mirrors listObituaries in src/lib/data.functions.ts → /obituaries page.
  it("listObituaries chain passes", async () => {
    const c = wrap();
    await expect(
      c
        .from("obituaries")
        .select("*")
        .eq("city", citySlug())
        .eq("is_published", true)
        .eq("status", "approved")
        .order("published_at", { ascending: false })
        .limit(200),
    ).resolves.toBeTruthy();
  });

  // Regression: an obituaries read that forgot the city filter must fail closed.
  it("obituaries read without city filter throws", async () => {
    const c = wrap();
    await expect(
      c
        .from("obituaries")
        .select("*")
        .eq("is_published", true)
        .eq("status", "approved")
        .order("published_at", { ascending: false }),
    ).rejects.toThrow(/city-guard/);
  });
});

describe("city-guard: cities table is keyed by slug", () => {
  it("cities.select by slug passes without city filter", async () => {
    const c = wrap();
    await expect(
      c.from("cities").select("*").eq("slug", citySlug()).eq("is_live", true),
    ).resolves.toBeTruthy();
  });

  describe("city-guard: RPC calls", () => {
    it("rpc without arguments throws", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("search_articles")).rejects.toThrow(/city-guard/);
    });

    it("rpc without city argument throws", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("search_articles", { q: "budget" })).rejects.toThrow(/city-guard/);
    });

    it("rpc with city argument passes", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("search_articles", { city: citySlug(), q: "budget" })).resolves.toBeTruthy();
    });

    it("allowlisted rpc (has_role) passes without city", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("has_role", { _user_id: "u1", _role: "admin" })).resolves.toBeTruthy();
    });

    // Have Your Say rpcs are NOT in UNSCOPED_RPC_ALLOWLIST: each takes a `city`
    // arg, so a call WITHOUT city must be rejected and WITH { city: citySlug() } passes.
    it("submit_comment without city throws", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("submit_comment", { article_id: "a1", body: "hi" })).rejects.toThrow(
        /city-guard/,
      );
    });

    it("submit_comment with city passes", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        c.rpc("submit_comment", { city: citySlug(), article_id: "a1", body: "hi" }),
      ).resolves.toBeTruthy();
    });

    it("list_approved_comments without city throws", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("list_approved_comments", { article_id: "a1" })).rejects.toThrow(
        /city-guard/,
      );
    });

    it("list_approved_comments with city passes", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        c.rpc("list_approved_comments", { city: citySlug(), article_id: "a1" }),
      ).resolves.toBeTruthy();
    });

    it("flag_comment without city throws", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("flag_comment", { comment_id: "c1" })).rejects.toThrow(/city-guard/);
    });

    it("flag_comment with city passes", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(c.rpc("flag_comment", { city: citySlug(), comment_id: "c1" })).resolves.toBeTruthy();
    });

    it("author_hide_comment without city throws", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        c.rpc("author_hide_comment", { comment_id: "c1", hidden: true }),
      ).rejects.toThrow(/city-guard/);
    });

    it("author_hide_comment with city passes", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        c.rpc("author_hide_comment", { city: citySlug(), comment_id: "c1", hidden: true }),
      ).resolves.toBeTruthy();
    });

    it("moderate_comment without city throws", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        c.rpc("moderate_comment", { comment_id: "c1", action: "approve" }),
      ).rejects.toThrow(/city-guard/);
    });

    it("moderate_comment with city passes", async () => {
      const c = wrap() as unknown as {
        rpc: (n: string, a?: Record<string, unknown>) => Promise<unknown>;
      };
      await expect(
        c.rpc("moderate_comment", { city: citySlug(), comment_id: "c1", action: "approve" }),
      ).resolves.toBeTruthy();
    });

    it("comment_flags is treated as CITY_SCOPED (a select without city throws)", async () => {
      const c = wrap();
      await expect(c.from("comment_flags").select("*").eq("comment_id", "c1")).rejects.toThrow(
        /city-guard/,
      );
    });
  });

  describe("city-guard: default-deny for unknown tables and views", () => {
    it("unknown table without city filter throws", async () => {
      const c = wrap();
      await expect(c.from("articles_with_author").select("*")).rejects.toThrow(/city-guard/);
    });

    it("view queried via .from() passes when city-filtered", async () => {
      const c = wrap();
      await expect(
        c.from("articles_with_author").select("*").eq("city", citySlug()),
      ).resolves.toBeTruthy();
    });

    it("unknown table insert without city on row throws", async () => {
      const c = wrap();
      await expect(c.from("audit_log").insert({ event: "x" })).rejects.toThrow(/city-guard/);
    });

    it("explicitly unscoped table (user_roles) passes", async () => {
      const c = wrap();
      await expect(c.from("user_roles").select("*").eq("user_id", "u1")).resolves.toBeTruthy();
    });
  });

  describe("city-guard: helper utilities use the wrapped client", () => {
    // The helpers in src/lib/db.server.ts and src/lib/admin-db.ts build queries
    // on top of the same wrapped Supabase client. Their query shapes are tested
    // here against a fake client to prove that the guard fires identically when
    // any helper utility forgets to apply the city filter.
    it("a helper that returns from(table).select(*) without .eq(city) throws", async () => {
      const c = wrap();
      const badHelper = (table: string) => c.from(table).select("*");
      await expect(badHelper("listings")).rejects.toThrow(/city-guard/);
    });

    it("a helper that returns from(table).update(patch).eq(id) without city throws", async () => {
      const c = wrap();
      const badUpdate = (id: string) => c.from("articles").update({ title: "x" }).eq("id", id);
      await expect(badUpdate("a1")).rejects.toThrow(/city-guard/);
    });

    it("a properly-scoped helper passes", async () => {
      const c = wrap();
      const goodHelper = (table: string) =>
        c.from(table).select("*").eq("city", citySlug()).order("created_at", { ascending: false });
      await expect(goodHelper("listings")).resolves.toBeTruthy();
    });
  });
});
