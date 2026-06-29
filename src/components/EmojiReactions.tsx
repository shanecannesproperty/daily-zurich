// Emoji reactions bar shown beneath every article body. One reaction per
// article per device, persisted in localStorage. Counts are seeded per-slug
// using a deterministic hash (so the seed is stable across reloads and
// devices) and incremented locally on click — we deliberately avoid a
// server round-trip; this is a micro-engagement signal, not analytics.
import { useEffect, useMemo, useState } from "react";

const REACTIONS = [
  { key: "fire", emoji: "🔥", label: "Hot take" },
  { key: "wow", emoji: "😮", label: "Surprised" },
  { key: "agree", emoji: "👍", label: "Agree" },
  { key: "bulb", emoji: "💡", label: "Insightful" },
  { key: "heart", emoji: "❤️", label: "Love this" },
] as const;
type Key = (typeof REACTIONS)[number]["key"];

const PICK_KEY = (slug: string) => `tdc_reaction:${slug}`;
const COUNTS_KEY = (slug: string) => `tdc_reaction_counts:${slug}`;

// FNV-1a 32-bit — deterministic per (slug, reaction) so seed numbers don't
// shift between server-rendered and client-rendered passes.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}
function seed(slug: string, key: Key): number {
  return 4 + (hash(`${slug}:${key}`) % 44); // 4..47 inclusive
}

type Counts = Record<Key, number>;

function freshCounts(slug: string): Counts {
  return REACTIONS.reduce((acc, r) => {
    acc[r.key] = seed(slug, r.key);
    return acc;
  }, {} as Counts);
}

function readCounts(slug: string): Counts {
  if (typeof window === "undefined") return freshCounts(slug);
  try {
    const raw = localStorage.getItem(COUNTS_KEY(slug));
    if (!raw) return freshCounts(slug);
    const parsed = JSON.parse(raw) as Partial<Counts>;
    const base = freshCounts(slug);
    for (const r of REACTIONS) {
      const v = parsed[r.key];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) base[r.key] = v;
    }
    return base;
  } catch {
    return freshCounts(slug);
  }
}

export function EmojiReactions({ slug }: { slug: string }) {
  const initial = useMemo(() => freshCounts(slug), [slug]);
  const [counts, setCounts] = useState<Counts>(initial);
  const [picked, setPicked] = useState<Key | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCounts(readCounts(slug));
    try {
      const stored = localStorage.getItem(PICK_KEY(slug));
      if (stored) setPicked(stored as Key);
    } catch { /* ignore */ }
    setReady(true);
  }, [slug]);

  function toggle(k: Key) {
    setCounts((prev) => {
      const next = { ...prev };
      if (picked === k) {
        next[k] = Math.max(0, next[k] - 1);
      } else {
        if (picked) next[picked] = Math.max(0, next[picked] - 1);
        next[k] = next[k] + 1;
      }
      try {
        localStorage.setItem(COUNTS_KEY(slug), JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
    setPicked((prev) => {
      const nextPick = prev === k ? null : k;
      try {
        if (nextPick) localStorage.setItem(PICK_KEY(slug), nextPick);
        else localStorage.removeItem(PICK_KEY(slug));
      } catch { /* ignore */ }
      return nextPick;
    });
  }

  return (
    <section
      className="mt-10 border-t border-[var(--hairline,rgba(0,0,0,0.12))] pt-5 print:hidden"
      aria-labelledby="article-reactions-h"
    >
      <h3 id="article-reactions-h" className="kicker">
        How did this story land?
      </h3>
      <div role="group" aria-label="Reactions" className="mt-3 flex flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const active = picked === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => toggle(r.key)}
              aria-pressed={active}
              title={r.label}
              className={[
                "inline-flex items-center gap-2 border px-3 py-1.5 text-sm transition",
                active
                  ? "border-[var(--ink-red,#A32D2D)] bg-[var(--ink-red,#A32D2D)] text-white"
                  : "border-[var(--ink,#2d2d2d)] bg-transparent text-[var(--ink,#2d2d2d)] hover:bg-[var(--surface,#e8e4dd)]",
              ].join(" ")}
            >
              <span aria-hidden className="text-base leading-none">{r.emoji}</span>
              <span className="text-[12px] uppercase tracking-[0.14em]">{r.label}</span>
              <span
                className={[
                  "tabular-nums text-xs",
                  active ? "text-white/90" : "text-[var(--ink-grey,#6b6b6b)]",
                ].join(" ")}
              >
                {ready ? counts[r.key].toLocaleString("en-AU") : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
