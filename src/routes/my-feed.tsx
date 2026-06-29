// Personalized "My Feed" — articles from the reader's most-visited
// categories, derived from localStorage tracking. Empty-state still shows
// the latest articles so the page is useful on a first visit, with a hint
// to keep reading to personalize.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { getFeedByCategories } from "@/lib/data.functions";
import { topCategories } from "@/lib/category-history";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatDate } from "@/lib/date";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/my-feed")({
  head: () => ({
    meta: buildMeta({
      title: `My Feed — ${siteName()}`,
      description: `Your personalized ${cityName()} news feed based on what you read.`,
      path: "/my-feed",

    }),
    links: canonicalLinks("/my-feed"),
  }),
  component: MyFeedPage,
});

function MyFeedPage() {
  const [cats, setCats] = useState<string[] | null>(null);
  useEffect(() => {
    setCats(topCategories(2));
  }, []);

  const fetchFeed = useServerFn(getFeedByCategories);
  const { data, isLoading } = useQuery({
    queryKey: ["my-feed", cats],
    queryFn: () => fetchFeed({ data: { categories: cats ?? [] } }),
    enabled: cats !== null,
    staleTime: 60_000,
  });

  const personalized = data?.personalized ?? false;
  const rows = data?.rows ?? [];

  return (
    <>
      <SiteHeader activePath="/my-feed" />
      <main className="container-news py-10">
        <p className="kicker text-[var(--accent,#A32D2D)]">For you</p>
        <h1 className="h1-news mt-2">
          {personalized ? "Your personalized feed" : "Your feed"}
        </h1>
        <p className="dek mt-3 max-w-[60ch]">
          {personalized
            ? `Based on what you read on ${siteName()}. Tracked privately on this device.`
            : "Keep reading to personalize this feed — we'll tune it to the categories you read most."}
        </p>
        {personalized && cats && cats.length > 0 && (
          <p className="meta mt-3">
            Your top categories:{" "}
            {cats
              .map((c) => CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c)
              .join(", ")}
            .
          </p>
        )}

        {isLoading || cats === null ? (
          <p className="meta mt-10">Loading your feed…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Your feed is empty"
            message={`We haven't published anything yet today for the categories you read. Browse the homepage to discover stories — we'll personalize this feed as you go.`}
            primaryHref="/"
            primaryLabel="Browse all articles →"
          />
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((a) => (
              <li key={a.id} className="border-t border-[var(--hairline,#d6d2c9)] pt-4">
                <p className="kicker">
                  {CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category}
                </p>
                <h2 className="serif mt-1 text-lg font-semibold leading-tight">
                  <Link
                    to="/article/$slug"
                    params={{ slug: a.slug }}
                    className="no-underline hover:underline"
                  >
                    {a.title}
                  </Link>
                </h2>
                {a.dek ? <p className="meta mt-1 line-clamp-2">{a.dek}</p> : null}
                {a.published_at && (
                  <p className="meta mt-2">{formatDate(a.published_at)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
