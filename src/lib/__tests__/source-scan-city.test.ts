// Repo-wide source scan that complements the runtime city-guard:
//
//   1. Components (src/components/**) and hooks (src/hooks/**) MUST NOT query
//      city-scoped Supabase tables directly. All such reads belong on the
//      server (createServerFn / server routes) where db.server's helpers and
//      the city-guard wrapper inject `.eq('city', citySlug())` automatically.
//
//   2. Every server-side module that calls `.from('<city-scoped table>')`
//      with a SELECT must either go through a db.server helper (cityTable /
//      cityTableSelect / cityCount / guideEntries) or co-locate an
//      `.eq('city', ...)` filter in the same statement. INSERT / UPSERT
//      shapes are left to the runtime city-guard, which checks that every
//      row carries `city: citySlug()` before the query resolves.
//
// Together with db-server-city.test.ts and city-guard.test.ts this fails the
// build the moment a new content read forgets the city filter.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const CITY_SCOPED_TABLES = [
  "articles",
  "events",
  "guides",
  "guide_entries",
  "listings",
  "audio_briefings",
  "live_feed",
  "obituaries",
];

// db.server and city-guard own the wrapped Supabase client itself.
const SERVER_ALLOWLIST = new Set([
  path.join("src", "lib", "db.server.ts"),
  path.join("src", "lib", "city-guard.ts"),
]);

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const fromCall = new RegExp(
  `\\.from\\s*\\(\\s*["'\`](${CITY_SCOPED_TABLES.join("|")})["'\`]\\s*\\)([\\s\\S]{0,400})`,
  "g",
);

// A `.from(scoped)` is considered safe when, within the next ~400 chars, the
// chain either selects with a city filter, or performs an insert/upsert/update/
// delete (those mutation shapes are runtime-checked by city-guard).
function isSafeUsage(tail: string): boolean {
  const isMutation = /\.(insert|upsert|update|delete)\s*\(/.test(tail);
  if (isMutation) return true;
  const hasCityFilter = /\.eq\s*\(\s*["'`]city["'`]\s*,/.test(tail);
  if (hasCityFilter) return true;
  // guide_entries is scoped by guide_id, cities by slug — both go through
  // the db.server helpers, so a raw .from() on them is never legitimate here.
  return false;
}

describe("components and hooks never read city-scoped tables directly", () => {
  const clientFiles = [
    ...walk(path.join(ROOT, "src", "components")),
    ...walk(path.join(ROOT, "src", "hooks")),
  ].filter((f) => !f.includes(`${path.sep}__tests__${path.sep}`));

  it.each(clientFiles)("%s does not call .from('<city-scoped>')", (file) => {
    const stripped = stripComments(fs.readFileSync(file, "utf8"));
    const match = stripped.match(
      new RegExp(`\\.from\\s*\\(\\s*["'\`](${CITY_SCOPED_TABLES.join("|")})["'\`]\\s*\\)`),
    );
    expect(
      match,
      `${path.relative(ROOT, file)} must call a server function, not Supabase directly, for city-scoped reads`,
    ).toBeNull();
  });
});

describe("server modules SELECT only with a city filter", () => {
  const serverFiles = [
    ...walk(path.join(ROOT, "src", "lib")),
    ...walk(path.join(ROOT, "src", "routes", "api")),
  ].filter(
    (f) =>
      /\.functions\.ts$/.test(f) ||
      /\.server\.ts$/.test(f) ||
      f.includes(`${path.sep}routes${path.sep}api${path.sep}`),
  );

  it.each(serverFiles)("%s SELECTs city-scoped tables only with .eq('city', ...)", (file) => {
    const rel = path.relative(ROOT, file);
    if (SERVER_ALLOWLIST.has(rel)) return;
    const src = stripComments(fs.readFileSync(file, "utf8"));
    const offenders: string[] = [];
    for (const m of src.matchAll(fromCall)) {
      const table = m[1];
      const tail = m[2] ?? "";
      if (!isSafeUsage(tail)) offenders.push(table);
    }
    expect(
      offenders,
      `${rel} calls .from('${offenders[0] ?? ""}') without .eq('city', ...) — use cityTable() instead`,
    ).toEqual([]);
  });
});
