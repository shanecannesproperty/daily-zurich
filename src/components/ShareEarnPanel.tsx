// "Share & earn" panel that slides up once the reader has scrolled to 90%
// of the article. Auto-dismisses after 10s or on close. Sessionscoped so we
// don't pester readers across multiple articles in the same visit.
import { useEffect, useState } from "react";
import { Facebook, Twitter, Link as LinkIcon, X } from "lucide-react";

const SESSION_KEY = "tdc_share_panel_shown";
const AUTO_DISMISS_MS = 10_000;

export function ShareEarnPanel({ title, slug }: { title: string; slug: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === slug) return;
    } catch { /* ignore */ }

    function onScroll() {
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const total = doc.scrollHeight;
      if (total <= 0) return;
      const pct = scrolled / total;
      if (pct >= 0.9) {
        setVisible(true);
        try { sessionStorage.setItem(SESSION_KEY, slug); } catch { /* ignore */ }
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [visible]);

  if (!visible) return null;

  const url = typeof window !== "undefined" ? window.location.href : `/article/${slug}`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const twUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  async function copyLink() {
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div
      role="region"
      aria-label="Share this article"
      className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[var(--ink,#2d2d2d)] bg-[var(--paper,#f5f3ee)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-[slide-up_280ms_ease-out] print:hidden"
      style={{ animation: "share-slide-up 280ms ease-out" }}
    >
      <style>{`
        @keyframes share-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      <div className="container-news flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="kicker">Enjoyed this story?</p>
          <p className="serif text-[15px] leading-snug mt-0.5">
            Share it and help grow local journalism.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <a
            href={fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-[var(--ink,#2d2d2d)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] no-underline hover:bg-[var(--surface,#e8e4dd)]"
          >
            <Facebook size={14} aria-hidden /> Facebook
          </a>
          <a
            href={twUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-[var(--ink,#2d2d2d)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] no-underline hover:bg-[var(--surface,#e8e4dd)]"
          >
            <Twitter size={14} aria-hidden /> X / Twitter
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 border border-[var(--ink,#2d2d2d)] px-3 py-1.5 text-xs uppercase tracking-[0.14em] hover:bg-[var(--surface,#e8e4dd)]"
          >
            <LinkIcon size={14} aria-hidden /> {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            className="ml-1 inline-flex h-7 w-7 items-center justify-center text-[var(--ink-grey,#6b6b6b)] hover:text-[var(--ink,#2d2d2d)]"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
