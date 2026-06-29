// On-demand ElevenLabs TTS for articles that don't yet have a pre-generated
// audio_url. Strips HTML, truncates to 5 000 chars, streams audio/mpeg back
// to the browser. Called from TTSPlayer.tsx when audio_url is absent.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? "21m00Tcm4TlvDq8ikWAM";
const MAX_CHARS = 5_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (!ELEVENLABS_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ELEVENLABS_API_KEY not set" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  let body: { title?: string; bodyHtml?: string; dek?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const raw = [
    body.title ?? "",
    body.dek ? stripHtml(body.dek) : "",
    body.bodyHtml ? stripHtml(body.bodyHtml) : "",
  ]
    .filter(Boolean)
    .join(". ");

  const text = raw.length > MAX_CHARS ? raw.slice(0, MAX_CHARS) + "…" : raw;

  if (!text.trim()) {
    return new Response(
      JSON.stringify({ error: "No text provided" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const elRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );

  if (!elRes.ok) {
    const err = await elRes.text();
    return new Response(
      JSON.stringify({ error: "ElevenLabs error", detail: err }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  return new Response(elRes.body, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
});
