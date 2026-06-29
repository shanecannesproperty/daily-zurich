import { useState } from "react";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 280);
}

function deriveBullets(bodyHtml: string | null, summary: string | null): string[] {
  if (summary && summary.trim().length > 0) {
    const fromSummary = splitSentences(summary).slice(0, 3);
    if (fromSummary.length > 0) return fromSummary;
  }
  if (!bodyHtml) return [];
  // first 2 paragraphs
  const paras = bodyHtml.split(/<\/p>/i).slice(0, 2).join(" ");
  const text = stripHtml(paras);
  const sentences = splitSentences(text);
  // score by length sweet-spot
  const scored = sentences.map((s) => ({ s, score: 1 / Math.abs(s.length - 120) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3).map((x) => x.s);
  // preserve original order
  return sentences.filter((s) => top.includes(s)).slice(0, 3);
}

export function QuickSummary({
  bodyHtml,
  summary,
}: {
  bodyHtml: string | null;
  summary?: string | null;
}) {
  const [open, setOpen] = useState(true);
  const bullets = deriveBullets(bodyHtml ?? null, summary ?? null);
  if (bullets.length === 0) return null;

  return (
    <aside
      className="my-6 border-l-4 border-[var(--accent,#A32D2D)] bg-[var(--surface,#e8e4dd)]/60 px-5 py-4"
      aria-label="Quick summary"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="kicker">Quick summary</span>
        <span className="text-xs text-[var(--ink-muted,#6b6b6b)]" aria-hidden="true">
          {open ? "Hide −" : "Show +"}
        </span>
      </button>
      {open && (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 serif text-[0.98rem] leading-relaxed">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </aside>
  );
}
