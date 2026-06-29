import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Share2, Twitter } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/confirmed")({
  head: () => ({
    meta: [
      ...buildMeta({
        title: `You're subscribed — ${siteName()}`,
        description: `Welcome to ${siteName()}. Your morning briefing arrives at 6am AEST every day.`,
        path: "/confirmed",
      }),
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: canonicalLinks("/confirmed"),
  }),
  component: ConfirmedPage,
});

function ConfirmedPage() {
  const [shared, setShared] = useState(false);

  async function onShare() {
    const shareData = {
      title: siteName(),
      text: `I just subscribed to ${siteName()} — the daily ${cityName()} briefing. You should too:`,
      url: typeof window !== "undefined" ? window.location.origin : "/",
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator as any).share(shareData);
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="container-read py-16 text-center">
        <span
          aria-hidden="true"
          className="envelope-bounce mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#1f7a3b] bg-[#e7f4ec] text-[#1f7a3b]"
        >
          <Check size={42} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <h1 className="h1-news mt-6">You&apos;re in! Welcome to {siteName()}</h1>
        <p className="dek mt-3 mx-auto max-w-[52ch]">
          Your morning briefing arrives at 6am AEST every day. No fluff — just
          the {cityName()} stories worth your coffee.
        </p>

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
          <a
            href="/"
            className="block border border-[var(--hairline,#d6d2c9)] p-5 no-underline hover:bg-[var(--surface,#e8e4dd)]"
          >
            <p className="kicker">Step 1</p>
            <p className="serif mt-2 text-lg font-semibold">
              Read today&apos;s top story
            </p>
            <p className="meta mt-2">
              See what&apos;s making news in {cityName()} right now.
            </p>
          </a>
          <button
            type="button"
            onClick={onShare}
            className="block w-full border border-[var(--hairline,#d6d2c9)] p-5 text-left no-underline hover:bg-[var(--surface,#e8e4dd)]"
          >
            <p className="kicker">Step 2</p>
            <p className="serif mt-2 text-lg font-semibold inline-flex items-center gap-2">
              <Share2 size={18} aria-hidden="true" />
              {shared ? "Thanks for sharing!" : "Share with a friend"}
            </p>
            <p className="meta mt-2">
              Independent local journalism grows by word of mouth.
            </p>
          </button>
          <a
            href="https://twitter.com/intent/follow?screen_name=dailycanberra"
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-[var(--hairline,#d6d2c9)] p-5 no-underline hover:bg-[var(--surface,#e8e4dd)]"
          >
            <p className="kicker">Step 3</p>
            <p className="serif mt-2 text-lg font-semibold inline-flex items-center gap-2">
              <Twitter size={18} aria-hidden="true" />
              Follow us on social
            </p>
            <p className="meta mt-2">
              Breaking news between editions, on the platform you use.
            </p>
          </a>
        </div>

        <div className="mt-10">
          <a href="/editions" className="btn-primary">
            Read today&apos;s edition →
          </a>
        </div>
      </main>
    </>
  );
}
