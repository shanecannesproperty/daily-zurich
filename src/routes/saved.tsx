import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/SiteHeader";
import { CategoryNav } from "@/components/CategoryNav";
import { ArticleCard } from "@/components/ArticleCard";
import { EmptyState } from "@/components/EmptyState";
import { useSavedArticles } from "@/lib/saved-articles";
import { getArticlesBySlugs } from "@/lib/data.functions";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";
import type { ArticleRow } from "@/lib/schema";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      ...buildMeta({
        title: `Saved articles | ${siteName()}`,
        description: `Your saved ${cityName()} stories from ${siteName()}.`,
        path: "/saved",
      }),
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: canonicalLinks("/saved"),
  }),
  component: SavedPage,
});

function SavedPage() {
  const { slugs, ready } = useSavedArticles();
  const fetchBySlugs = useServerFn(getArticlesBySlugs);
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (slugs.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchBySlugs({ data: { slugs } })
      .then((res) => {
        if (!cancelled) setRows(res.rows);
      })
      .catch((err) => {
        console.error("[saved] fetch failed", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, slugs, fetchBySlugs]);

  return (
    <>
      <SiteHeader />
      <CategoryNav />
      <main className="container-news py-10">
        <p className="kicker">Your reading list</p>
        <h1 className="h1-news mt-1">Saved articles</h1>
        <p className="dek mt-2">
          Stories you&apos;ve saved for later, kept on this device.
        </p>
        <div aria-hidden className="mt-6 hairline" />

        {!ready || loading ? (
          <p className="meta mt-10">Loading your saved stories…</p>
        ) : slugs.length === 0 ? (
          <EmptyState
            icon={<span aria-hidden="true" style={{ fontSize: 22 }}>🔖</span>}
            title="No saved stories yet"
            message="Tap the bookmark icon on any article to keep it here for later. Your reading list stays on this device."
            primaryHref="/"
            primaryLabel="Find something to save →"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Your saved stories are no longer available"
            message="None of the articles you saved are currently published. Browse the latest stories instead."
            primaryHref="/"
            primaryLabel="Browse all articles →"
          />
        ) : (
          <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-3">
            {rows.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
