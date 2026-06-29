// Inline reader poll embedded mid-article. Vote stored in localStorage
// (one vote per poll per browser). Results are seeded with realistic totals
// so the chart looks plausible before any real votes come in.
import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { siteName } from "@/lib/city";

export type PollOption = { id: string; label: string };
export type PollDef = {
  id: string;
  question: string;
  options: PollOption[];
  /** Seeded vote count per option id. Total should sit between 300 and 800. */
  seed: Record<string, number>;
};

// Three reusable sample polls. Article authors pick by id or let the helper
// below auto-select one deterministically per article.
export const SAMPLE_POLLS: PollDef[] = [
  {
    id: "light-rail-2026",
    question: "Should Canberra build more light rail?",
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
      { id: "info", label: "Need more info" },
    ],
    seed: { yes: 312, no: 168, info: 94 },
  },
  {
    id: "todays-top-story",
    question: "Rate today's top story",
    options: [
      { id: "hot", label: "🔥 Hot" },
      { id: "good", label: "👍 Good" },
      { id: "neutral", label: "😐 Neutral" },
    ],
    seed: { hot: 221, good: 287, neutral: 112 },
  },
  {
    id: "what-matters",
    question: "What matters most to you?",
    options: [
      { id: "news", label: "Local news" },
      { id: "weather", label: "Weather" },
      { id: "events", label: "Events" },
      { id: "jobs", label: "Jobs" },
    ],
    seed: { news: 264, weather: 138, events: 192, jobs: 86 },
  },
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic poll pick so each article always gets the same poll. */
export function pickPollForSlug(slug: string): PollDef {
  return SAMPLE_POLLS[hashSlug(slug) % SAMPLE_POLLS.length];
}

const STORAGE_PREFIX = "dc_poll_v1_";

export function ArticlePoll({ poll }: { poll: PollDef }) {
  const storageKey = STORAGE_PREFIX + poll.id;
  const [votedId, setVotedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const prior = localStorage.getItem(storageKey);
      if (prior) setVotedId(prior);
    } catch {
      /* SSR */
    }
  }, [storageKey]);

  function vote(optionId: string) {
    if (votedId) return;
    try {
      localStorage.setItem(storageKey, optionId);
    } catch {
      /* ignore */
    }
    setVotedId(optionId);
  }

  // Totals = seed + (this browser's vote, if any)
  const counts: Record<string, number> = { ...poll.seed };
  if (votedId) counts[votedId] = (counts[votedId] ?? 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  async function shareResult() {
    if (!votedId) return;
    const chosen = poll.options.find((o) => o.id === votedId);
    if (!chosen) return;
    const text = `I voted ${chosen.label} on ${siteName()} poll: ${poll.question}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <aside
      className="my-8 border border-[var(--hairline,#d6d2c9)] bg-[var(--surface,#e8e4dd)] p-5 print:hidden"
      aria-label="Reader poll"
    >
      <p className="kicker">Reader poll</p>
      <h3 className="serif text-xl mt-2">{poll.question}</h3>

      {!votedId ? (
        <ul className="mt-4 space-y-2">
          {poll.options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => vote(opt.id)}
                className="w-full text-left border border-[var(--hairline,#d6d2c9)] bg-[var(--bg,#f5f3ee)] px-4 py-2.5 text-sm font-medium hover:border-[var(--ink,#2d2d2d)] hover:bg-[var(--bg,#f5f3ee)]"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="mt-4 space-y-2" aria-live="polite">
            {poll.options.map((opt) => {
              const pct = Math.round(((counts[opt.id] ?? 0) / total) * 100);
              const isPick = opt.id === votedId;
              return (
                <li key={opt.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={isPick ? "font-semibold" : ""}>
                      {isPick && (
                        <Check
                          size={14}
                          className="inline-block mr-1 text-[var(--accent,#A32D2D)]"
                          aria-hidden
                        />
                      )}
                      {opt.label}
                    </span>
                    <span className="meta">{pct}%</span>
                  </div>
                  <div
                    className="mt-1 h-2 bg-[var(--bg,#f5f3ee)] border border-[var(--hairline,#d6d2c9)] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={
                        isPick
                          ? "h-full bg-[var(--accent,#A32D2D)]"
                          : "h-full bg-[var(--ink,#2d2d2d)] opacity-60"
                      }
                      style={{ width: pct + "%" }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="meta">{total.toLocaleString()} votes</p>
            <button
              type="button"
              onClick={shareResult}
              className="inline-flex items-center gap-1.5 border border-[var(--hairline,#d6d2c9)] px-3 py-1 text-xs uppercase tracking-[0.14em] hover:bg-[var(--bg,#f5f3ee)]"
            >
              <Share2 size={12} aria-hidden />
              {copied ? "Copied!" : "Share your result"}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
