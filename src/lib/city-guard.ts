// Automated safeguard: every Supabase query against a city-scoped table MUST
// either (a) filter by .eq('city', citySlug()) for select/update/delete, or
// (b) include city='canberra' on every row for insert/upsert. The guard wraps
// the Supabase client transparently and throws if the query is awaited without
// the required scope. guide_entries has no city column and is scoped by
// guide_id or by primary key id. cities is keyed by slug. Other tables (e.g.
// auth) are passed through unchanged.
import { citySlug } from "@/lib/city";

// Default-deny: any table not explicitly listed below is treated as
// city-scoped, so a brand-new table or a misspelled name fails closed.
const CITY_SCOPED = new Set([
  "articles",
  "events",
  "guides",
  "listings",
  "subscribers",
  "enquiries",
  "agent_config",
  "agent_runs",
  "sources",
  "audio_briefings",
  "live_feed",
  "obituaries",
  "site_events",
  "jobs",
  "daily_editions",
  // REAXML property-listings PUBLIC VIEWS. Both carry a `city` column and are
  // city-scoped, so they go through the same .eq('city', citySlug()) default-deny as
  // every other tenant table. The frontend reads ONLY these views, never the
  // base public.property_listings table.
  "public_available_property_listings",
  "public_recently_sold",
  // Have Your Say comments. comment_flags HAS a city column (denormalised for
  // tenant-scoped admin reads), so both belong in CITY_SCOPED — never the
  // UNSCOPED_ALLOWLIST. Their public read is an rpc (list_approved_comments);
  // admin reads carry .eq('city', citySlug()). The comments rpcs are NOT in
  // UNSCOPED_RPC_ALLOWLIST: every one takes a `city` arg, so a call like
  // rpc('submit_comment', { city: citySlug(), ... }) satisfies the guard natively
  // and the function re-asserts city against the parent article.
  "article_comments",
  "comment_flags",
]);
const GUIDE_SCOPED = new Set(["guide_entries"]);
const SLUG_KEYED = new Set(["cities"]);
// Tables (or views) that legitimately have no city scope. Keep this tight.
// court_feed is STATE-scoped, not city-scoped: a city reads its own state's
// judgments plus the federal tiers, so it is filtered by state (not city) and
// must be allowlisted here rather than failing the default-deny city check.
const UNSCOPED_ALLOWLIST = new Set<string>([
  "user_roles",
  "court_feed",
  // Syndicated stories ingested from external RSS feeds. They cover Canberra
  // by source selection, not by a `city` column, so they sit outside the
  // city-scoped default-deny.
  "syndication_sources",
  "syndicated_stories",
]);

// RPC functions that legitimately do not need a city argument (auth/role
// helpers, etc). Every other rpc() call must pass { city: citySlug() }.
const UNSCOPED_RPC_ALLOWLIST = new Set<string>(["has_role", "claim_first_admin"]);

type Op = "select" | "insert" | "update" | "delete" | "upsert" | null;

type Guard = {
  table: string;
  op: Op;
  rowsHaveCity: boolean;
  filteredCity: boolean;
  filteredGuideId: boolean;
  filteredId: boolean;
};

function rowsHaveCity(rows: unknown): boolean {
  if (rows == null) return false;
  const arr = Array.isArray(rows) ? rows : [rows];
  if (arr.length === 0) return false;
  return arr.every(
    (r) => r && typeof r === "object" && (r as Record<string, unknown>).city === citySlug(),
  );
}

function assertGuard(g: Guard) {
  // No op chained yet (e.g. raw .from('x') stored but never queried) — nothing to assert.
  if (!g.op) return;
  if (SLUG_KEYED.has(g.table)) return;
  if (UNSCOPED_ALLOWLIST.has(g.table)) return;
  if (GUIDE_SCOPED.has(g.table)) {
    if (g.op === "insert" || g.op === "upsert") return;
    if (!g.filteredGuideId && !g.filteredId) {
      throw new Error(
        `[city-guard] ${g.table}.${g.op} must filter by .eq('guide_id', …) or .eq('id', …)`,
      );
    }
    return;
  }
  // Default-deny: treat unknown tables/views as city-scoped.
  if (g.op === "insert" || g.op === "upsert") {
    if (!g.rowsHaveCity) {
      throw new Error(
        `[city-guard] ${g.table}.${g.op} must set city='${citySlug()}' on every row (or add the table to UNSCOPED_ALLOWLIST)`,
      );
    }
    return;
  }
  if (!g.filteredCity) {
    throw new Error(
      `[city-guard] ${g.table}.${g.op} must filter by .eq('city', '${citySlug()}') (or add the table to UNSCOPED_ALLOWLIST)`,
    );
  }
  if (!CITY_SCOPED.has(g.table)) {
    // Belt and braces: warn (in dev) when a new table flows through.
    if (typeof console !== "undefined") {
      console.warn(
        `[city-guard] unrecognised table '${g.table}'; passing because it filters by city.`,
      );
    }
  }
}

function wrapBuilder<T extends object>(builder: T, guard: Guard): T {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "then") {
        // Awaiting the builder calls .then(resolve, reject). Run the guard
        // here and surface failures as a rejected promise, not a sync throw,
        // so callers see a normal Supabase-style error.
        return (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          try {
            assertGuard(guard);
          } catch (e) {
            return Promise.reject(e).then(resolve, reject);
          }
          if (typeof value === "function") {
            return (value as (...a: unknown[]) => unknown).call(target, resolve, reject);
          }
          return Promise.resolve(target).then(resolve, reject);
        };
      }
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        if (prop === "select" && !guard.op) guard.op = "select";
        else if (prop === "insert") {
          guard.op = "insert";
          guard.rowsHaveCity = rowsHaveCity(args[0]);
        } else if (prop === "upsert") {
          guard.op = "upsert";
          guard.rowsHaveCity = rowsHaveCity(args[0]);
        } else if (prop === "update") {
          guard.op = "update";
        } else if (prop === "delete") {
          guard.op = "delete";
        } else if (prop === "eq") {
          const col = args[0];
          const val = args[1];
          if (col === "city" && val === citySlug()) guard.filteredCity = true;
          if (col === "guide_id" && typeof val === "string") guard.filteredGuideId = true;
          if (col === "id" && typeof val === "string") guard.filteredId = true;
        }
        const result = (value as (...a: unknown[]) => unknown).apply(target, args);
        if (result && typeof result === "object") {
          return wrapBuilder(result as object, guard);
        }
        return result;
      };
    },
  }) as T;
}

// Wrap a Supabase client so every .from(table) and .rpc(fn, args) is guarded.
// Views are queried via .from() so they go through the same default-deny path.
export function withCityGuard<T extends { from: (table: string) => unknown }>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "from" && typeof value === "function") {
        return (table: string) => {
          const builder = (value as (t: string) => object).call(target, table);
          const guard: Guard = {
            table,
            op: null,
            rowsHaveCity: false,
            filteredCity: false,
            filteredGuideId: false,
            filteredId: false,
          };
          return wrapBuilder(builder, guard);
        };
      }
      if (prop === "rpc" && typeof value === "function") {
        return (fn: string, args?: Record<string, unknown>) => {
          const allowed = UNSCOPED_RPC_ALLOWLIST.has(fn);
          const hasCity = !!args && (args as Record<string, unknown>).city === citySlug();
          if (!allowed && !hasCity) {
            const err = new Error(
              `[city-guard] rpc('${fn}') must include { city: '${citySlug()}' } in arguments (or be added to UNSCOPED_RPC_ALLOWLIST)`,
            );
            // Return a thenable that rejects, so callers get a normal promise rejection.
            return {
              then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
                Promise.reject(err).then(resolve, reject),
              catch: (reject: (e: unknown) => unknown) => Promise.reject(err).catch(reject),
            };
          }
          return (value as (...a: unknown[]) => unknown).call(target, fn, args);
        };
      }
      return value;
    },
  });
}
