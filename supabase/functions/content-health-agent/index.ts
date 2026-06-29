// content-health-agent: a scheduled content-QA agent for the Daily Network.
//
// Runs every 30 minutes (pg_cron). Each run samples recently-published
// articles across every city, asks Anthropic Claude (vision) whether each
// hero photo actually, correctly illustrates THAT city's article, and auto-
// fixes the failures it finds by clearing the wrong/broken hero so the
// existing acquisition pipeline re-fills it under the location-aware rules.
// Every decision is written to public.content_health_log for review.
//
// Why a separate Supabase function (vs the in-app photo cron): the Anthropic
// key lives in Supabase, so the Anthropic-powered QA brain runs here, next to
// the key, independent of the web deploy. It is deliberately conservative —
// it only ever NULLs a hero (reversible; the acquirer refills it). It never
// edits article text, never unpublishes, never fabricates.
//
// Auth: caller must present x-hook-secret == AGENTS_WEBHOOK_SECRET.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const BATCH = 25; // max articles inspected per run (caps Anthropic spend)

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

// Read a secret from the function env first, then fall back to Supabase Vault
// (the service role can decrypt it) so it works wherever the key is stored.
async function getSecret(...names: string[]): Promise<string> {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v) return v;
  }
  // Vault isn't exposed via PostgREST, so read it through a service-role-only
  // SECURITY DEFINER accessor (public.get_vault_secret).
  for (const n of names) {
    const { data } = await admin.rpc("get_vault_secret", { p_name: n });
    if (typeof data === "string" && data) return data;
  }
  return "";
}

interface Verdict {
  ok: boolean; // true = photo correctly illustrates this city's article
  reason: string;
}

const SYSTEM = (city: string, region: string) =>
  `You are a photo-desk editor for The Daily ${city}, a local news site for ${city}, ${region}, Australia. ` +
  `Decide whether the photo correctly illustrates the article. Read ALL visible text — business/building names, street and suburb signs, posters, number plates. ` +
  `Answer is WRONG (ok=false) if: the photo shows a landmark, business, suburb, or city OTHER than ${city}; or it is a logo/diagram/document/screenshot; or it is unrelated to the headline; or it is broken/blank. ` +
  `A generic unlabelled scene that could plausibly be ${city} is acceptable. ` +
  `Reply with ONLY JSON: {"ok": <true|false>, "reason": "<12 words max>"}.`;

function extractJson(s: string): string {
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

async function judge(
  apiKey: string,
  city: string,
  region: string,
  headline: string,
  imageUrl: string,
): Promise<Verdict | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 80,
        system: SYSTEM(city, region),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `Headline: "${headline}"\nArticle city: ${city}, ${region}\nIs this photo correct?` },
              { type: "image", source: { type: "url", url: imageUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text: string = (j?.content ?? [])
      .filter((b: { type?: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("");
    const parsed = JSON.parse(extractJson(text)) as { ok?: boolean; reason?: string };
    return { ok: parsed.ok !== false, reason: (parsed.reason ?? "").slice(0, 120) };
  } catch {
    return null; // outage => no opinion; never churn on error
  } finally {
    clearTimeout(t);
  }
}

const REGION: Record<string, string> = {
  canberra: "ACT", sydney: "NSW", newcastle: "NSW", wollongong: "NSW", centralcoast: "NSW",
  melbourne: "VIC", geelong: "VIC", ballarat: "VIC", bendigo: "VIC",
  brisbane: "QLD", goldcoast: "QLD", sunshinecoast: "QLD", townsville: "QLD", toowoomba: "QLD", cairns: "QLD",
  perth: "WA", adelaide: "SA", darwin: "NT", tasmania: "TAS",
};
const CITY_NAME: Record<string, string> = {
  goldcoast: "Gold Coast", sunshinecoast: "Sunshine Coast", centralcoast: "Central Coast",
};
const niceCity = (slug: string) => CITY_NAME[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);

Deno.serve(async (req) => {
  const ranAt = new Date().toISOString();
  const expected = await getSecret("AGENTS_WEBHOOK_SECRET");
  const provided = req.headers.get("x-hook-secret") ?? "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const apiKey = await getSecret("ANTHROPIC_API_KEY", "ANTHROPIC_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, detail: "missing ANTHROPIC_API_KEY" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  let limit = BATCH;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number") limit = Math.max(1, Math.min(60, body.limit));
  } catch { /* no body */ }

  // Newest published, non-sponsored articles with a hero that have NOT already
  // been judged "keep" in the last 7 days. The RPC does that dedup in SQL so we
  // don't re-pay Anthropic for unchanged content every run, and each run
  // advances to fresh/stale articles instead of re-checking the same top-N.
  const { data: rows, error } = await admin.rpc("articles_needing_health_check", { p_limit: limit });

  if (error) {
    return new Response(JSON.stringify({ ok: false, detail: error.message }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }

  let checked = 0, fixed = 0, skipped = 0;
  const log: Array<Record<string, unknown>> = [];

  for (const r of rows ?? []) {
    const city = r.city as string;
    const region = REGION[city] ?? "Australia";
    const verdict = await judge(apiKey, niceCity(city), region, r.title as string, r.hero_image as string);
    if (!verdict) { skipped++; continue; }
    checked++;
    if (verdict.ok) {
      log.push({ article_id: r.id, city, decision: "keep", reason: verdict.reason, prev_hero: r.hero_image, ran_at: ranAt });
      continue;
    }
    // Auto-fix: clear the wrong/broken hero; the acquisition cron refills it.
    const { error: upErr } = await admin
      .from("articles")
      .update({ hero_image: null, hero_image_credit: null, hero_image_source: null })
      .eq("id", r.id);
    if (!upErr) {
      fixed++;
      log.push({ article_id: r.id, city, decision: "cleared", reason: verdict.reason, prev_hero: r.hero_image, ran_at: ranAt });
    }
  }

  if (log.length) {
    await admin.from("content_health_log").insert(log).then(() => undefined, () => undefined);
  }

  return new Response(
    JSON.stringify({ ok: true, ran_at: ranAt, inspected: rows?.length ?? 0, checked, fixed, skipped }),
    { headers: { "content-type": "application/json" } },
  );
});
