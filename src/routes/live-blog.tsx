import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName } from "@/lib/city";

// Seeded sample live blog article. In a future iteration this is keyed off
// `articles.is_live` or the `live` tag on a real article row.
const LIVE_ARTICLE = {
  title: "Severe storm warning for the ACT — live updates",
  dek: "Heavy rain and damaging winds are sweeping across the capital. We are tracking SES callouts, road closures and power outages in real time.",
  is_live: true,
  started_at_iso: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
  updates: [
    { time: "8:02am", headline: "BOM upgrades warning to severe", body: "The Bureau of Meteorology has upgraded its weather warning to 'severe' for the ACT and surrounding districts. Damaging winds of up to 90km/h are expected through the morning." },
    { time: "9:18am", headline: "First SES callouts in Belconnen", body: "ACT SES has confirmed at least 12 callouts across Belconnen, mostly for fallen trees and minor roof damage. No injuries reported." },
    { time: "10:34am", headline: "Power out across parts of Tuggeranong", body: "Evoenergy reports approximately 4,200 properties without power in Tuggeranong and Woden. Crews are en route. Estimated restoration: early afternoon." },
    { time: "11:20am", headline: "Light rail services suspended south of Civic", body: "Transport Canberra has paused light rail services between Civic and Gungahlin while crews inspect overhead wiring. Replacement buses are running." },
    { time: "12:05pm", headline: "Worst of the storm has passed", body: "The BOM says the main band has cleared the ACT but light rain and gusty winds will continue into the afternoon. We'll keep this live blog open until services are restored." },
  ],
};

export const Route = createFileRoute("/live-blog")({
  head: () => ({
    meta: buildMeta({
      title: `LIVE: ${LIVE_ARTICLE.title} | ${siteName()}`,
      description: LIVE_ARTICLE.dek,
      path: "/live-blog",
    }),
    links: canonicalLinks("/live-blog"),
  }),
  component: LiveBlogPage,
});

function LiveBlogPage() {
  const [now, setNow] = useState(Date.now());
  const [showSubscribe, setShowSubscribe] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const lastUpdate = new Date(LIVE_ARTICLE.started_at_iso).getTime() + 4 * 3600_000;
  const minsAgo = Math.max(1, Math.round((now - lastUpdate) / 60_000));

  return (
    <>
      <SiteHeader activePath="/live-blog" />
      <main className="container-news py-10 max-w-3xl">
        <nav className="meta mb-4"><a href="/">Home</a> / Live blog</nav>

        {LIVE_ARTICLE.is_live && (
          <div className="inline-flex items-center gap-2 bg-[var(--ink-red)] text-white px-3 py-1 text-[11px] uppercase tracking-widest font-semibold">
            <span className="inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
            Live
          </div>
        )}

        <h1 className="h1-news mt-3">{LIVE_ARTICLE.title}</h1>
        <p className="dek mt-3">{LIVE_ARTICLE.dek}</p>
        <p className="meta mt-3">Last updated: {minsAgo} minute{minsAgo === 1 ? "" : "s"} ago · {cityName()} newsroom</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => setShowSubscribe((s) => !s)} className="btn-primary">
            Follow this story
          </button>
          <span className="meta">Get an email when this live blog updates.</span>
        </div>

        {showSubscribe && (
          <div className="mt-4 border border-[var(--hairline)] p-4 bg-[var(--surface)]">
            <NewsletterForm source="live-blog" variant="inline" />
          </div>
        )}

        <ol className="mt-10 border-l-2 border-[var(--ink)] pl-6 space-y-8">
          {LIVE_ARTICLE.updates.slice().reverse().map((u, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[31px] top-1 inline-block h-3 w-3 rounded-full bg-[var(--ink-red)]" />
              <p className="meta font-semibold">{u.time}</p>
              <h2 className="serif text-xl font-bold mt-1">{u.headline}</h2>
              <p className="mt-2">{u.body}</p>
            </li>
          ))}
        </ol>

        <section className="mt-16 border-t border-[var(--ink)] pt-8">
          <NewsletterForm source="live-blog-footer" variant="band" />
        </section>
      </main>
    </>
  );
}
