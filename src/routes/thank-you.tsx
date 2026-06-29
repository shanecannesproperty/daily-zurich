import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getAllArticles } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

const recentQuery = queryOptions({
  queryKey: ["thankYouRecent"],
  queryFn: () => getAllArticles({ data: { page: 1 } }),
});

export const Route = createFileRoute("/thank-you")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recentQuery),
  head: () => ({
    meta: [
      ...buildMeta({
        title: `Thanks for subscribing | ${siteName()}`,
        description: `You're subscribed to ${siteName()}. Your first briefing arrives tomorrow morning.`,
        path: "/thank-you",
      }),
      { name: "robots", content: "noindex,follow" },
    ],
    links: canonicalLinks("/thank-you"),
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  const { data } = useSuspenseQuery(recentQuery);
  const recent = data.rows.slice(0, 3);
  const shareUrl = absUrl("/");
  const shareText = `I just subscribed to ${siteName()} — a free daily briefing for ${cityName()}.`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(`Have you seen ${siteName()}?`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;

  return (
    <>
      <SiteHeader />
      <main className="container-news py-16">
        <div className="max-w-2xl mx-auto text-center">
          <p className="kicker">Welcome aboard</p>
          <h1 className="h1-news mt-2">You&apos;re subscribed! Check your inbox.</h1>
          <p className="dek mt-4">
            Your first {siteName()} briefing arrives tomorrow morning at 6am. While you wait,
            here are today&apos;s top stories.
          </p>
        </div>

        {recent.length > 0 && (
          <div className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {recent.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}

        <div className="mt-16 border-t border-[var(--hairline)] pt-10 text-center max-w-xl mx-auto">
          <p className="kicker">Spread the word</p>
          <h2 className="h2-news mt-2">
            Know someone who&apos;d love {siteName()}? Share it:
          </h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={twitterHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Share on X
            </a>
            <a href={emailHref} className="btn-ghost">
              Share by email
            </a>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a href="/" className="btn-primary">
            Back to the front page
          </a>
        </div>
      </main>
    </>
  );
}
