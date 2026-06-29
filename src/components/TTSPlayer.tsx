// Unified ElevenLabs "Listen" button for articles.
// If audio_url (pre-generated) is available it plays immediately.
// Otherwise it calls the /tts edge function on-demand and plays the stream.
// The browser Web Speech API is no longer used.
import { useRef, useState } from "react";
import { Headphones } from "lucide-react";

type Phase = "idle" | "loading" | "playing" | "paused" | "error";

export function ListenButton({
  audioUrl,
  title,
  bodyHtml,
  dek,
}: {
  audioUrl?: string | null;
  title: string;
  bodyHtml: string | null;
  dek?: string | null;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<string | null>(null);

  function getOrCreateAudio(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current;
    const el = new Audio();
    el.onended = () => setPhase("idle");
    el.onerror = () => { setPhase("error"); setError("Playback failed."); };
    audioRef.current = el;
    return el;
  }

  function cleanup() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  }

  async function handleClick() {
    if (phase === "playing") {
      audioRef.current?.pause();
      setPhase("paused");
      return;
    }
    if (phase === "paused") {
      audioRef.current?.play().catch(() => setPhase("error"));
      setPhase("playing");
      return;
    }
    if (phase === "loading") return;

    // Fresh play
    cleanup();
    setError(null);

    if (audioUrl) {
      const el = getOrCreateAudio();
      el.src = audioUrl;
      setPhase("loading");
      el.oncanplay = () => {
        el.oncanplay = null;
        el.play().then(() => setPhase("playing")).catch(() => setPhase("error"));
      };
      el.load();
      return;
    }

    // On-demand via edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !anonKey) {
      setError("Audio unavailable.");
      setPhase("error");
      return;
    }

    setPhase("loading");
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ title, bodyHtml, dek }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      const el = getOrCreateAudio();
      el.src = url;
      el.play().then(() => setPhase("playing")).catch(() => setPhase("error"));
    } catch (e) {
      setPhase("error");
      setError("Could not load audio. Try again.");
      console.error("[TTSPlayer]", e);
    }
  }

  function stop() {
    cleanup();
    setPhase("idle");
    setError(null);
  }

  const icon =
    phase === "loading" ? "⏳" :
    phase === "playing" ? "❚❚" :
    phase === "paused"  ? "▶" : null;

  return (
    <div className="inline-flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={handleClick}
        disabled={phase === "loading"}
        aria-label={
          phase === "playing" ? `Pause: ${title}` :
          phase === "paused"  ? `Resume: ${title}` :
          phase === "loading" ? "Loading audio…" :
          `Listen to: ${title}`
        }
        className="inline-flex items-center gap-1.5 border border-[var(--hairline,#d6d2c9)] bg-transparent px-3 py-1 text-xs uppercase tracking-[0.14em] hover:bg-[var(--surface,#e8e4dd)] disabled:opacity-50"
      >
        {icon ? (
          <span aria-hidden>{icon}</span>
        ) : (
          <Headphones className="h-3.5 w-3.5" aria-hidden />
        )}
        {phase === "loading" ? "Loading…" :
         phase === "playing" ? "Pause" :
         phase === "paused"  ? "Resume" : "Listen"}
      </button>

      {(phase === "playing" || phase === "paused") && (
        <button
          type="button"
          onClick={stop}
          aria-label="Stop audio"
          className="inline-flex items-center gap-1 border border-[var(--hairline,#d6d2c9)] bg-transparent px-2 py-1 text-xs hover:bg-[var(--surface,#e8e4dd)]"
        >
          <span aria-hidden>■</span>
        </button>
      )}

      {phase === "error" && error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}

// Legacy export kept for any residual imports — renders nothing now that
// the fixed-bottom player is handled inline by ListenButton.
export function TTSPlayer() {
  return null;
}
