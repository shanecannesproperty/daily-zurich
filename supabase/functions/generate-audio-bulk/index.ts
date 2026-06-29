// Bulk ElevenLabs audio generation for articles.
// Queries articles without audio_url (newest first, last 30 days by default),
// generates MP3 via ElevenLabs, uploads to Supabase Storage bucket "article-audio",
// and writes back audio_url + audio_duration_sec.
//
// Call with POST {} to run defaults (batch=50, days=30).
// Optional body: { batch?: number; days?: number; city?: string }
//
// Safe to call repeatedly — only touches articles where audio_url IS NULL.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EL_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? "21m00Tcm4TlvDq8ikWAM";
const BUCKET = "article-audio";
const MAX_CHARS = 4_500;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const db = createClient(SUPABASE_URL, SERVICE_KEY);

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildText(title: string, dek: string | null, bodyHtml: string | null): string {
  const parts = [
    title,
    dek ? stripHtml(dek) : null,
    bodyHtml ? stripHtml(bodyHtml) : null,
  ].filter(Boolean).join(". ");
  return parts.length > MAX_CHARS ? parts.slice(0, MAX_CHARS) + "…" : parts;
}

async function ensureBucket() {
  const { data: buckets } = await db.storage.listBuckets();
  if (buckets?.find((b) => b.name === BUCKET)) return;
  await db.storage.createBucket(BUCKET, { public: true });
}

async function generateAudio(text: string): Promise<Uint8Array | null> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": EL_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    console.error("ElevenLabs error", res.status, await res.text());
    return null;
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// Rough MP3 duration: ~128kbps → 16000 bytes/sec
function estimateDuration(bytes: number): number {
  return Math.round(bytes / 16000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let opts: { batch?: number; days?: number; city?: string } = {};
  try { opts = await req.json(); } catch { /* defaults */ }

  const batch = Math.min(opts.batch ?? 50, 200);
  const days = opts.days ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  await ensureBucket();

  // Fetch articles needing audio
  let query = db
    .from("articles")
    .select("id, slug, city, title, dek, body_html")
    .is("audio_url", null)
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(batch);

  if (opts.city) query = query.eq("city", opts.city);

  const { data: articles, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const results = { processed: 0, failed: 0, skipped: 0, ids: [] as string[] };

  for (const art of articles ?? []) {
    const text = buildText(art.title, art.dek, art.body_html);
    if (!text.trim()) { results.skipped++; continue; }

    const audio = await generateAudio(text);
    if (!audio) { results.failed++; continue; }

    const path = `${art.city}/${art.slug}.mp3`;
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(path, audio, { contentType: "audio/mpeg", upsert: true });

    if (upErr) {
      console.error("Upload error", art.slug, upErr.message);
      results.failed++;
      continue;
    }

    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);
    const durationSec = estimateDuration(audio.length);

    const { error: updErr } = await db
      .from("articles")
      .update({ audio_url: publicUrl, audio_duration_sec: durationSec })
      .eq("id", art.id);

    if (updErr) {
      console.error("Update error", art.slug, updErr.message);
      results.failed++;
    } else {
      results.processed++;
      results.ids.push(art.id);
    }

    // Small delay to be polite to ElevenLabs API
    await new Promise((r) => setTimeout(r, 200));
  }

  return new Response(JSON.stringify({ ...results, total_found: articles?.length ?? 0 }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
