// Compact inline share row used near the top of an article (right under
// the dek). The full ShareToolbar still renders at the bottom of the body.
import { useEffect, useState } from "react";
import { siteDomain } from "@/lib/city";

export function ShareRow({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const url = `${siteDomain()}/article/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const twitterHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  function nativeShare() {
    navigator.share?.({ title, url }).catch(() => {});
  }

  const btn =
    "inline-flex items-center justify-center h-8 w-8 border border-[var(--hairline,#d6d2c9)] hover:bg-[var(--surface,#e8e4dd)] hover:border-[var(--ink,#2d2d2d)] text-[var(--ink,#2d2d2d)]";

  return (
    <div className="mt-4 flex items-center gap-2 print:hidden" aria-label="Share this article">
      <span className="meta uppercase tracking-widest text-[10px] font-semibold mr-1">Share</span>
      <a href={twitterHref} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className={btn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a href={facebookHref} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className={btn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.044 1.613.115v3.146c-.427-.044-.72-.065-1.088-.065-1.545 0-2.143.584-2.143 2.101v2.261h3.07l-.527 3.667h-2.543v8.11C19.395 23.025 24 18.07 24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.618Z" />
        </svg>
      </a>
      <a href={linkedinHref} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" className={btn}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      <button type="button" onClick={copyLink} aria-label="Copy link" className={btn + " text-[11px] font-semibold uppercase tracking-[0.1em] w-auto px-2"}>
        {copied ? "Copied" : "Copy link"}
      </button>
      {canNativeShare && (
        <button type="button" onClick={nativeShare} aria-label="More share options" className={btn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" strokeLinecap="round" />
            <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
