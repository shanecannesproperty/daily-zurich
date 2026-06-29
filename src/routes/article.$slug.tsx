import { useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Eye } from "lucide-react";
import { getArticleBySlug } from "@/lib/data.functions";
import { trackArticleView } from "@/lib/articles.functions";
import { useServerFn } from "@tanstack/react-start";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { InlineSubscribeCTA } from "@/components/InlineSubscribeCTA";
import { ListenButton } from "@/components/TTSPlayer";

import { ShareToolbar } from "@/components/ShareToolbar";
import { RelatedArticles } from "@/components/RelatedArticles";
import { YouMightAlsoLike } from "@/components/YouMightAlsoLike";
import { HowWeReportThis } from "@/components/HowWeReportThis";
import { EmojiReactions } from "@/components/EmojiReactions";
import { CorrectionLink } from "@/components/CorrectionLink";
import { bumpReadCount } from "@/components/ReadCountNudge";
import { bumpLifetimeRead } from "@/components/LoyaltyMilestone";
import { bumpCategory } from "@/lib/category-history";
import { EditorsPickCard } from "@/components/EditorsPickCard";

import { ArticleTOC } from "@/components/ArticleTOC";



import { TrendingToday } from "@/components/TrendingToday";
import { ShareRow } from "@/components/ShareRow";
import { ArticlePoll, pickPollForSlug } from "@/components/ArticlePoll";
import { bumpSessionRead } from "@/components/PushNotifyPrompt";
import { ArticleComments } from "@/components/ArticleComments";
import { JsonLd } from "@/components/JsonLd";
import { HeroImage } from "@/components/HeroImage";
import { ReadingProgressBar } from "@/components/ReadingProgressBar";
import { QuickSummary } from "@/components/QuickSummary";
import { LiveReaderCount } from "@/components/LiveReaderCount";
import { SaveBookmark } from "@/components/SaveBookmark";
import { ShareEarnPanel } from "@/components/ShareEarnPanel";
import { SponsoredBadge, isSponsored } from "@/components/SponsoredBadge";
import { CategoryNav } from "@/components/CategoryNav";
import { isRealImage } from "@/lib/media";
import { buildMeta, canonicalLinks, absUrl, pageTitle, clampDescription } from "@/lib/seo";
import { siteName, siteDomain, cityName, cityRegion, citySlug } from "@/lib/city";
import { CATEGORY_LABELS } from "@/lib/schema";
import { formatDateTime, isMeaningfullyUpdated, timeAgo, isoUtc } from "@/lib/date";


function articleQuery(slug: string) {
  return queryOptions({
    queryKey: ["article", slug],
    queryFn: () => getArticleBySlug({ data: { slug } }),
  });
}

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(articleQuery(params.slug));
    if (!data.article) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: pageTitle("Not found") }] };
    const path = `/article/${a.slug}`;
    return {
      meta: buildMeta({
        title: pageTitle(a.title),
        description: clampDescription(a.dek ?? `${a.title} from ${siteName()}.`),
        path,
        image: isRealImage(a.hero_image) ? a.hero_image : undefined,
        type: "article",
        publishedTime: isoUtc(a.published_at),
        modifiedTime: isoUtc(a.updated_at),
        author: a.author,
        section: CATEGORY_LABELS[a.category],
      }),
      links: canonicalLinks(path),
    };
  },
  component: ArticlePage,
});

function formatViewCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.floor(n / 1000)}k`;
}


function ArticlePage() {
  const { article, related } = useSuspenseQuery(articleQuery(Route.useParams().slug)).data;
  const track = useTrackEvent();
  const trackView = useServerFn(trackArticleView);
  const slug = article?.slug;
  useEffect(() => {
    if (slug) track("article_read", { ref: slug });
  }, [slug, track]);
  useEffect(() => {
    if (slug) trackView({ data: { slug } }).catch(() => undefined);
  }, [slug, trackView]);
  useEffect(() => {
    if (slug) bumpReadCount();
    if (slug) bumpLifetimeRead(slug);
    if (article?.category) bumpCategory(article.category);
    bumpSessionRead();

  }, [slug]);

  // Public view counter — pings the increment-view edge function once per
  // mount and reflects the new total beside the byline. Silent on failure so
  // a flaky network never blocks article rendering.
  const [viewCount, setViewCount] = useState(0);
  useEffect(() => {
    if (!slug) return;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
    if (!supabaseUrl || !anonKey) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/increment-view`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slug, city: citySlug() }),
          signal: ctrl.signal,
        });
        const data = (await res.json()) as { ok?: boolean; view_count?: number };
        if (data.ok && typeof data.view_count === "number") {
          setViewCount(data.view_count);
        }
      } catch {
        /* silent fail */
      }
    })();
    return () => ctrl.abort();
  }, [slug]);



  const wordCount = article?.body_html
    ? article.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length
    : 0;
  const readingMinutes = wordCount > 0 ? Math.ceil(wordCount / 200) : 0;
  // Long-form template gate: trigger on either an explicit DB flag or
  // >1500 words. Activates floating TOC + larger pull-quote styling +
  // the prominent save bookmark above the headline.
  const isLongForm =
    wordCount > 1500 ||
    (article as unknown as { long_form?: boolean }).long_form === true;

  // After the body renders, mark paragraphs that begin with a quotation
  // character so .long-form-body styles them as pull-quotes. Skipped when
  // the template isn't active so short articles read normally.
  useEffect(() => {
    if (!isLongForm) return;
    const root = document.querySelector(".long-form-body");
    if (!root) return;
    const ps = root.querySelectorAll("p");
    ps.forEach((p) => {
      const t = (p.textContent ?? "").trim();
      if (/^[“”"«»„‟‘']/.test(t)) p.setAttribute("data-pull-quote", "true");
    });
  }, [isLongForm, article?.body_html]);

  if (!article) return null;
  const showUpdated = isMeaningfullyUpdated(article.published_at, article.updated_at);
  const path = `/article/${article.slug}`;



  return (
    <>
      <ReadingProgressBar />
      <SiteHeader activePath={`/${article.category}`} />
      <CategoryNav activeSlug={article.category} />
      <main>
        <article className="container-read pt-10">
          <nav className="meta mb-4" aria-label="Breadcrumb">
            <a href="/">Home</a> &nbsp;/&nbsp;{" "}
            <a href={`/${article.category}`}>{CATEGORY_LABELS[article.category]}</a>
          </nav>
          {isSponsored(article) && <div className="mt-3"><SponsoredBadge size="md" /></div>}
          {isLongForm && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-y border-[var(--hairline,#d6d2c9)] py-2">
              <span className="kicker text-[var(--accent,#A32D2D)]">Long read · {readingMinutes} min</span>
              <span className="meta">·</span>
              <SaveBookmark slug={article.slug} label />
            </div>
          )}
          <p className="kicker mt-2">{CATEGORY_LABELS[article.category]}</p>

          <h1 className="h1-news mt-2">{article.title}</h1>
          {article.dek && <p className="dek mt-4">{article.dek}</p>}
          <ShareRow slug={article.slug} title={article.title} />
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from(
              new Set(
                [
                  CATEGORY_LABELS[article.category],
                  cityName(),
                  article.author ?? null,
                  "Local news",
                  "Australia",
                ].filter(Boolean) as string[],
              ),
            )
              .slice(0, 5)
              .map((tag) => {
                const slug = tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                return (
                  <a
                    key={tag}
                    href={`/topic/${slug}`}
                    className="inline-block text-[11px] uppercase tracking-[0.16em] border border-[var(--hairline,#d6d2c9)] px-2 py-0.5 no-underline hover:bg-[var(--surface,#e8e4dd)]"
                  >
                    #{tag}
                  </a>
                );
              })}
          </div>
          <p className="meta mt-5">
            By{" "}
            {article.author ? (
              <a href={`/author/${encodeURIComponent(article.author)}`}>
                {article.author}
              </a>
            ) : (
              <a href="/editorial-standards">AI-generated</a>
            )}
            {article.published_at && (
              <> &middot; Published {formatDateTime(article.published_at)}</>
            )}
            {viewCount > 0 && (
              <>
                {" "}&middot;{" "}
                <span
                  className="inline-flex items-center gap-1 align-baseline"
                  aria-label={`${viewCount.toLocaleString()} views`}
                >
                  <Eye size={13} aria-hidden="true" />
                  <span>{formatViewCount(viewCount)} views</span>
                </span>
              </>
            )}
          </p>

          {readingMinutes > 0 && (
            <p
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--ink-muted,#6b6b6b)]"
              aria-label={`Estimated reading time ${readingMinutes} minute${readingMinutes === 1 ? "" : "s"}`}
            >
              <Clock size={14} aria-hidden="true" />
              <span>{readingMinutes} min read</span>
            </p>
          )}
          <div className="mt-2 flex items-center gap-4">
            <LiveReaderCount slug={article.slug} />
            <SaveBookmark slug={article.slug} />
          </div>

          {showUpdated && (
            <p className="mt-2">
              <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] border border-[var(--accent,#A32D2D)] text-[var(--accent,#A32D2D)] px-2 py-0.5">
                Updated {timeAgo(article.updated_at)}
              </span>
              <span className="meta ml-2">· {formatDateTime(article.updated_at)}</span>
            </p>
          )}
          <HowWeReportThis />
        </article>




        {isRealImage(article.hero_image) && (
          <figure className="container-news mt-6">
            <HeroImage
              src={article.hero_image}
              alt={article.title}
              aspect="aspect-[3/2]"
              loading="eager"
              fetchPriority="high"
              blurUp
              width={1600}
              height={1067}
              sizes="(min-width: 1024px) 960px, 100vw"
            />
            {article.hero_image_credit && (
              <figcaption className="meta mt-2">
                Photo:{" "}
                {article.hero_image_source ? (
                  <a href={article.hero_image_source} target="_blank" rel="noopener nofollow">
                    {article.hero_image_credit}
                  </a>
                ) : (
                  article.hero_image_credit
                )}
              </figcaption>
            )}
          </figure>
        )}

        <div className="container-read mt-8">
          <div className="mt-3 flex justify-end print:hidden">
            <ListenButton
              audioUrl={article.audio_url}
              title={article.title}
              bodyHtml={article.body_html}
              dek={article.dek}
            />
          </div>



          <QuickSummary bodyHtml={article.body_html} summary={(article as unknown as { summary?: string | null }).summary ?? null} />


          {article.body_html ? (() => {
            const bodyClass = isLongForm ? "prose-news long-form-body" : "prose-news";
            const parts = article.body_html.split("</p>");
            const poll = pickPollForSlug(article.slug);
            if (parts.length > 4) {
              const intro = parts.slice(0, 2).join("</p>") + "</p>";
              const mid = parts.slice(2, 3).join("</p>") + "</p>";
              const tail = parts.slice(3).join("</p>");
              return (
                <>
                  <div className={bodyClass} dangerouslySetInnerHTML={{ __html: intro }} />
                  <ArticlePoll poll={poll} />
                  <div className={bodyClass} dangerouslySetInnerHTML={{ __html: mid }} />
                  <EditorsPickCard category={article.category} excludeSlug={article.slug} />
                  <InlineSubscribeCTA />
                  <div className={bodyClass} dangerouslySetInnerHTML={{ __html: tail }} />
                </>
              );

            }
            if (parts.length > 2) {
              const intro = parts.slice(0, 2).join("</p>") + "</p>";
              const tail = parts.slice(2).join("</p>");
              return (
                <>
                  <div className={bodyClass} dangerouslySetInnerHTML={{ __html: intro }} />
                  <ArticlePoll poll={poll} />
                  <div className={bodyClass} dangerouslySetInnerHTML={{ __html: tail }} />
                  <InlineSubscribeCTA />
                </>
              );
            }
            return (
              <>
                <div className={bodyClass} dangerouslySetInnerHTML={{ __html: article.body_html }} />
                <InlineSubscribeCTA />
              </>
            );
          })() : (
            <p className="prose-news">{article.dek}</p>
          )}
          {isLongForm && <ArticleTOC containerSelector=".long-form-body" />}


          <YouMightAlsoLike items={related} />

          <RelatedArticles currentSlug={article.slug} />

          <TrendingToday currentSlug={article.slug} />

          <EmojiReactions slug={article.slug} />


          <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
            <ShareToolbar slug={article.slug} title={article.title} />
            <button
              type="button"
              onClick={() => { if (typeof window !== "undefined") window.print(); }}
              className="inline-flex items-center gap-1.5 border border-[var(--hairline,#d6d2c9)] px-3 py-1 text-xs uppercase tracking-[0.14em] hover:bg-[var(--surface,#e8e4dd)]"
              aria-label="Print this article"
            >
              <span aria-hidden>🖨️</span>
              Print
            </button>
          </div>

          <section className="mt-12 border-t border-[var(--ink)] pt-6">
            <h2 className="kicker">Have your say</h2>
            <div className="mt-4">
              <ArticleComments articleId={article.id} articleSlug={article.slug} />
            </div>
          </section>

          {article.source_urls && article.source_urls.length > 0 && (
            <section className="mt-10 border-t border-[var(--hairline)] pt-6">
              <h2 className="kicker">Sources</h2>
              <ul className="mt-3 space-y-2">
                {article.source_urls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noopener nofollow ugc" className="break-words">
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12 border-t border-[var(--ink)] pt-6">
            <p className="kicker">About this article</p>
            <p className="serif mt-2 text-lg">Published by {siteName()}</p>
            <p className="meta mt-1">
              Covering {(CATEGORY_LABELS[article.category] ?? article.category ?? "news").toString().toLowerCase()} in {cityName()}. This article was generated by AI from the linked sources and was not reviewed by a human editor before publishing. See our{" "}
              <a href="/editorial-standards">editorial standards</a>.
            </p>
          </section>

          <ShareToolbar slug={article.slug} title={article.title} />

          <CorrectionLink title={article.title} slug={article.slug} />


          <EndOfArticleNudge slug={article.slug} />






        </div>
      </main>
      <ShareEarnPanel title={article.title} slug={article.slug} />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: article.title.slice(0, 110),
          description: article.dek ?? undefined,
          image: isRealImage(article.hero_image) ? [article.hero_image] : undefined,
          datePublished: isoUtc(article.published_at),
          dateModified: isoUtc(article.updated_at),
          author: { "@type": "Organization", name: article.author ?? siteName() },
          publisher: {
            "@type": "NewsMediaOrganization",
            name: siteName(),
            logo: { "@type": "ImageObject", url: `${siteDomain()}/logo.svg` },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(path) },
          articleSection: CATEGORY_LABELS[article.category],
          inLanguage: "en-AU",
          areaServed: { "@type": "City", name: cityName(), containedInPlace: { "@type": "State", name: cityRegion(), containedInPlace: { "@type": "Country", name: "Australia" } } },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
            {
              "@type": "ListItem",
              position: 2,
              name: CATEGORY_LABELS[article.category],
              item: absUrl(`/${article.category}`),
            },
            { "@type": "ListItem", position: 3, name: article.title, item: absUrl(path) },
          ],
        }}
      />
    </>
  );
}

function EndOfArticleNudge({ slug }: { slug: string }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setSubscribed(Boolean(localStorage.getItem("tdc_nl_subscribed")));
    } catch {
      setSubscribed(false);
    }
  }, []);

  return (
    <section className="mt-10 border-t border-[var(--ink)] pt-8">
      {subscribed ? (
        <p className="meta">You&apos;re subscribed. &#10003;</p>
      ) : (
        <>
          <p className="kicker">Daily brief</p>
          <h2 className="h2-news mt-1">
            Enjoyed this? Wake up to {cityName()} news every morning.
          </h2>
          <p className="dek mt-2">Free, in your inbox before 7am. Weekdays.</p>
          <div className="mt-4">
            <NewsletterForm source={`article-end:${slug}`} variant="compact" />
          </div>
        </>
      )}
    </section>
  );
}

