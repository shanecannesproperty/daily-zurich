// Server-only content distribution orchestrator. For each recently-published
// article it: (1) notifies search engines (IndexNow + Google Indexing API) and
// (2) posts to Facebook + Instagram — skipping any channel already completed for
// that article. Per-channel completion is recorded in content_distribution_log
// so search URLs are not needlessly resubmitted and socials are never double-posted.
//
// Driven by the public cron hook (/api/public/hooks/distribute, shared-secret)
// and re-runs the current request's citySlug(). ONE deploy serves every Daily
// Network city, so the cron pins each city per request (see the cron migration).
//
// The *.server.ts extension blocks client imports.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/integrations/supabase/config";
import { citySlug, siteDomain } from "@/lib/city";
import { submitIndexNow, submitGoogleIndexing } from "@/lib/search-submit.server";
import {
  postArticleToFacebook,
  postArticleToInstagram,
  type SocialArticle,
} from "@/lib/social-publish.server";

export type Channel = "indexnow" | "google" | "facebook" | "instagram";
const ALL_CHANNELS: Channel[] = ["indexnow", "google", "facebook", "instagram"];
const SOCIAL_CHANNELS: Channel[] = ["facebook", "instagram"];

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  hero_image: string | null;
  category: string | null;
  published_at: string | null;
}

export interface DistributionResult {
  ok: boolean;
  ran_at: string;
  city: string;
  considered: number;
  results: Record<Channel, { done: number; skipped: number; failed: number }>;
  detail?: string;
}

function emptyTally(): DistributionResult["results"] {
  return {
    indexnow: { done: 0, skipped: 0, failed: 0 },
    google: { done: 0, skipped: 0, failed: 0 },
    facebook: { done: 0, skipped: 0, failed: 0 },
    instagram: { done: 0, skipped: 0, failed: 0 },
  };
}

function articleUrl(slug: string): string {
  return `${siteDomain()}/article/${slug}`;
}

async function alreadyDone(
  client: SupabaseClient,
  city: string,
  slugs: string[],
): Promise<Set<string>> {
  // Returns a set of `${slug}|${channel}` keys already logged as ok.
  const done = new Set<string>();
  if (slugs.length === 0) return done;
  const { data } = await client
    .from("content_distribution_log")
    .select("slug,channel")
    .eq("city", city)
    .eq("status", "ok")
    .in("slug", slugs);
  for (const row of (data ?? []) as { slug: string; channel: string }[]) {
    done.add(`${row.slug}|${row.channel}`);
  }
  return done;
}

async function logSuccess(
  client: SupabaseClient,
  city: string,
  article: ArticleRow,
  channel: Channel,
  detail?: string,
): Promise<void> {
  await client.from("content_distribution_log").upsert(
    {
      city,
      article_id: article.id,
      slug: article.slug,
      channel,
      status: "ok",
      detail: detail ?? null,
    },
    { onConflict: "city,slug,channel" },
  );
}

/**
 * Distribute recent published articles for the current city. Looks back
 * `lookbackHours` (default 72) and processes up to `limit` articles. `channels`
 * restricts which channels run. Never throws; failures are tallied and returned.
 */
export async function runDistribution(opts?: {
  limit?: number;
  lookbackHours?: number;
  channels?: Channel[];
}): Promise<DistributionResult> {
  const ran_at = new Date().toISOString();
  const city = citySlug();
  const limit = Math.max(1, Math.min(100, opts?.limit ?? 25));
  const lookbackHours = Math.max(1, Math.min(720, opts?.lookbackHours ?? 72));
  const channels = (opts?.channels ?? ALL_CHANNELS).filter((c): c is Channel =>
    ALL_CHANNELS.includes(c as Channel),
  );

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!SUPABASE_URL || !serviceKey) {
    return {
      ok: false,
      ran_at,
      city,
      considered: 0,
      results: emptyTally(),
      detail: "missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    };
  }
  const client = createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });

  const cutoff = new Date(Date.now() - lookbackHours * 3600 * 1000).toISOString();
  const { data, error } = await client
    .from("articles")
    .select("id,slug,title,dek,hero_image,category,published_at")
    .eq("city", city)
    .eq("is_published", true)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    return { ok: false, ran_at, city, considered: 0, results: emptyTally(), detail: error.message };
  }
  const articles = (data ?? []) as ArticleRow[];
  const tally = emptyTally();
  if (articles.length === 0) {
    return { ok: true, ran_at, city, considered: 0, results: tally };
  }

  const done = await alreadyDone(
    client,
    city,
    articles.map((a) => a.slug),
  );
  const has = (slug: string, ch: Channel) => done.has(`${slug}|${ch}`);

  // ── Search engines: batch the URLs that still need each channel ─────────────
  if (channels.includes("indexnow")) {
    const pending = articles.filter((a) => !has(a.slug, "indexnow"));
    if (pending.length) {
      const res = await submitIndexNow(pending.map((a) => articleUrl(a.slug)));
      if (res.ok && !res.skipped) {
        for (const a of pending) {
          await logSuccess(client, city, a, "indexnow");
          tally.indexnow.done += 1;
        }
      } else if (res.skipped) {
        tally.indexnow.skipped += pending.length;
      } else {
        tally.indexnow.failed += pending.length;
      }
    }
  }

  if (channels.includes("google")) {
    const pending = articles.filter((a) => !has(a.slug, "google"));
    if (pending.length) {
      const res = await submitGoogleIndexing(pending.map((a) => articleUrl(a.slug)));
      if (res.skipped) {
        tally.google.skipped += pending.length;
      } else if (res.ok) {
        // The Google channel is per-URL; on a partial batch we still mark the
        // batch done to avoid resubmitting (the API is idempotent regardless).
        for (const a of pending) {
          await logSuccess(client, city, a, "google");
          tally.google.done += 1;
        }
      } else {
        tally.google.failed += pending.length;
      }
    }
  }

  // ── Social: one post per article, never to sponsored content ────────────────
  const wantsSocial = channels.some((c) => SOCIAL_CHANNELS.includes(c));
  if (wantsSocial) {
    for (const a of articles) {
      if ((a.category || "").toLowerCase() === "sponsored") continue;
      const social: SocialArticle = {
        slug: a.slug,
        title: a.title,
        url: articleUrl(a.slug),
        dek: a.dek,
        hero_image: a.hero_image,
        category: a.category,
      };
      if (channels.includes("facebook") && !has(a.slug, "facebook")) {
        const r = await postArticleToFacebook(social);
        if (r.skipped) tally.facebook.skipped += 1;
        else if (r.ok) {
          await logSuccess(client, city, a, "facebook", r.id);
          tally.facebook.done += 1;
        } else tally.facebook.failed += 1;
      }
      if (channels.includes("instagram") && !has(a.slug, "instagram")) {
        const r = await postArticleToInstagram(social);
        if (r.skipped) tally.instagram.skipped += 1;
        else if (r.ok) {
          await logSuccess(client, city, a, "instagram", r.id);
          tally.instagram.done += 1;
        } else tally.instagram.failed += 1;
      }
    }
  }

  const failed =
    tally.indexnow.failed + tally.google.failed + tally.facebook.failed + tally.instagram.failed;
  return { ok: failed === 0, ran_at, city, considered: articles.length, results: tally };
}
