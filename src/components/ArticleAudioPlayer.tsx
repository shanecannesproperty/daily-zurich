// Narrated-article audio player. Renders an HTML5 <audio> element for the
// optional `audio_url` track produced by the narration pipeline. Returns
// nothing when there's no track. NOT related to the browser-TTS "Listen"
// feature — that lives in TTSPlayer.tsx.
interface Props {
  src: string | null;
  durationSec: number | null;
  title: string;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ArticleAudioPlayer({ src, durationSec, title }: Props) {
  if (!src) return null;
  const duration = formatDuration(durationSec);

  return (
    <figure
      className="my-4 border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] p-4 print:hidden"
      aria-label={`Narrated audio for ${title}`}
    >
      <figcaption className="flex items-center justify-between">
        <span className="kicker">Narrated edition</span>
        {duration && (
          <span className="meta tabular-nums text-[var(--ink-grey,#6b6b6b)]">
            {duration}
          </span>
        )}
      </figcaption>
      <audio
        src={src}
        controls
        preload="none"
        className="mt-3 w-full"
        aria-label={`Audio: ${title}`}
      >
        Your browser doesn&apos;t support embedded audio.{" "}
        <a href={src} className="underline">Download the file</a>.
      </audio>
    </figure>
  );
}
