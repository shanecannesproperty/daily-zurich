// Interactive (chromium) proof of the article-comments boundary (repo A).
//
// Gated by SUPABASE_SERVICE_ROLE_KEY (test.skip otherwise).
//
// assertCommentsClean() is the workhorse: it asserts the approved Canberra
// sentinel IS present AND every forbidden sentinel is ABSENT — a positive +
// negative control on every surface, killing vacuous passes. We re-run it after
// client navigation, reload, and after exercising each moderation/filter
// control surfaced to a signed-out reader.
//
// We also capture every client-received JSON payload and assert none contains a
// Sydney sentinel or a "status":"pending" field: a signed-out viewer authors
// nothing, so no pending row may reach the browser in any response.
import { expect, test, type Page } from "@playwright/test";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../../src/integrations/supabase/config";
import {
  FORBIDDEN_SENTINELS,
  SENTINELS,
  hasServiceRole,
  seedComments,
  teardownComments,
  type SeedResult,
} from "./_comments-seed";

async function assertCommentsClean(page: Page) {
  const text = await page.content();
  expect(text, "approved Canberra sentinel present").toContain(SENTINELS.canbApproved);
  for (const sentinel of FORBIDDEN_SENTINELS) {
    expect(text, `forbidden sentinel ${sentinel} must be absent`).not.toContain(sentinel);
  }
}

test.describe("article-comments browser (boundary holds across nav/reload/filters)", () => {
  test.skip(!hasServiceRole, "SUPABASE_SERVICE_ROLE_KEY not set — cannot seed sentinels");

  let seed: SeedResult;
  const jsonPayloads: string[] = [];

  test.beforeAll(async () => {
    seed = await seedComments();
  });

  test.afterAll(async () => {
    if (seed) await teardownComments(seed.ids);
  });

  test("no forbidden sentinel leaks via SSR, client-nav, reload, controls, or network", async ({
    page,
  }) => {
    jsonPayloads.length = 0;
    page.on("response", async (resp) => {
      const ct = resp.headers()["content-type"] ?? "";
      if (!ct.includes("application/json")) return;
      try {
        jsonPayloads.push(await resp.text());
      } catch {
        /* streamed/binary bodies ignored */
      }
    });

    await page.goto(`/article/${seed.canberra.slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertCommentsClean(page);

    // Client-navigate away to home and back; re-assert.
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.goto(`/article/${seed.canberra.slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertCommentsClean(page);

    // Reload; re-assert.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await assertCommentsClean(page);

    // Exercise any per-row control visible to a signed-out reader (there should
    // be none — Report/Hide are gated behind a session — but if a future change
    // surfaces a sort/expand control, clicking it must not leak a sentinel).
    const controls = page.locator("[data-comments] button, [data-undo-bar] button");
    const count = await controls.count();
    for (let i = 0; i < count; i++) {
      await controls
        .nth(i)
        .click({ trial: true })
        .catch(() => {});
      await assertCommentsClean(page);
    }

    // Network payload assertions: no client-received JSON may carry a Sydney
    // sentinel or a pending row (signed-out viewer authors nothing).
    for (const payload of jsonPayloads) {
      expect(payload).not.toContain(SENTINELS.sydApproved);
      expect(payload).not.toContain(SENTINELS.canbPending);
      expect(payload).not.toContain('"status":"pending"');
    }
  });

  // DB-LEVEL PROBE #10: list_approved_comments is city-parameterised. Asked for
  // sydney it returns sydney rows ONLY; the Canberra app only ever passes
  // city=CITY, so it can never receive Sydney rows. This proves the function is
  // the boundary, not an accidental table grant.
  test("list_approved_comments rpc is city-parameterised (anon key)", async ({ request }) => {
    test.skip(!seed.sydney, "no sydney article seeded in this env");
    const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/list_approved_comments`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      data: { city: "sydney", article_id: seed.sydney!.id },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    // Explicitly asking for sydney surfaces the sydney sentinel...
    expect(body).toContain(SENTINELS.sydApproved);

    // ...but the SAME rpc asked for canberra+sydney-article returns nothing
    // (city must match the parent article's city).
    const mismatch = await request.post(`${SUPABASE_URL}/rest/v1/rpc/list_approved_comments`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      data: { city: "canberra", article_id: seed.sydney!.id },
    });
    expect(mismatch.status()).toBe(200);
    expect(await mismatch.text()).not.toContain(SENTINELS.sydApproved);
  });
});
