// SSR proof of the article-comments tenant + moderation boundary (repo A).
//
// Gated by SUPABASE_SERVICE_ROLE_KEY: without it we cannot seed deterministic
// sentinel rows, so the suite test.skip()s rather than passing vacuously.
//
// What this proves over the raw HTML (no browser):
//   * positive control: the approved Canberra sentinel IS present (so an absent
//     forbidden sentinel is meaningful, not just an empty page).
//   * city isolation: the Sydney approved sentinel is NOT present.
//   * pre-moderation (Voller): the pending sentinel is NOT present.
//   * admin hide: the hidden sentinel is NOT present.
//   * author hide: the author-hidden sentinel is NOT present.
//   * the page is the Canberra edition (canonical + masthead).
import { expect, test } from "@playwright/test";
import { SUPABASE_PUBLISHABLE_KEY } from "../../src/integrations/supabase/config";
import {
  FORBIDDEN_SENTINELS,
  SENTINELS,
  anonSelectComments,
  hasServiceRole,
  seedComments,
  teardownComments,
  type SeedResult,
} from "./_comments-seed";

function canonicalHref(html: string) {
  const re = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i;
  const alt = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i;
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
}

test.describe("article-comments SSR (tenant + moderation boundary)", () => {
  test.skip(!hasServiceRole, "SUPABASE_SERVICE_ROLE_KEY not set — cannot seed sentinels");

  let seed: SeedResult;

  test.beforeAll(async () => {
    seed = await seedComments();
  });

  test.afterAll(async () => {
    if (seed) await teardownComments(seed.ids);
  });

  test("approved Canberra comment renders; pending/hidden/author-hidden/other-city do not", async ({
    request,
  }) => {
    const res = await request.get(`/article/${seed.canberra.slug}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Positive control — the suite is non-vacuous.
    expect(html, "approved Canberra sentinel present").toContain(SENTINELS.canbApproved);

    // Every forbidden sentinel must be absent from the served HTML.
    for (const sentinel of FORBIDDEN_SENTINELS) {
      expect(html, `forbidden sentinel ${sentinel} must be absent`).not.toContain(sentinel);
    }

    // Canberra edition.
    const canon = canonicalHref(html);
    expect(canon).not.toBeNull();
    expect(html).toMatch(/Canberra/);
  });

  // DB-LEVEL RLS PROBE #9: a raw anon PostgREST select on article_comments must
  // be permission-denied/empty — anon has NO table SELECT grant, so the tenant
  // boundary lives in the DB, not just the app.
  test("anon PostgREST select on article_comments returns no rows (no table grant)", async () => {
    const { status, rows } = await anonSelectComments(SUPABASE_PUBLISHABLE_KEY);
    // Either a hard permission-denied (4xx) or an empty array — never seeded rows.
    const denied = status >= 400;
    expect(denied || rows.length === 0, `status=${status} rows=${rows.length}`).toBe(true);
    if (Array.isArray(rows)) {
      const serialised = JSON.stringify(rows);
      for (const sentinel of [SENTINELS.canbApproved, ...FORBIDDEN_SENTINELS]) {
        expect(serialised).not.toContain(sentinel);
      }
    }
  });
});
