import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getWorldArticleBySlug } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsletterForm } from "@/components/NewsletterForm";
import { ListenButton } from "@/components/TTSPlayer";
import { ShareToolbar } from "@/components/ShareToolbar";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, absUrl } from "@/lib/seo";
import { siteName, siteDomain } from "@/lib/city";
import { formatDateTime, isUpdatedDaysAfter, isoUtc } from "@/lib/date";

const LABEL = "The World";

function worldArticleQuery(slug: string) {
  return queryOptions({
    queryKey: ["world-article", slug],
    queryFn: () => getWorldArticleBySlug({ data: { slug } }),
  });
}

export const Route = createFileRoute("/world/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(worldArticleQuery(params.slug));
    if (!data.article) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: `Not found | ${siteName()}` }] };
    const path = `/world/${a.slug}`;
    const canonical = a.canonical_url ?? absUrl(path);
    return {
      meta: buildMeta({
        title: `${a.title} | ${siteName()}`,
        description: a.dek ?? `${a.title} from ${siteName()}.`,
        path,
        image: a.hero_image,
        type: "article",
        publishedTime: isoUtc(a.published_at),
        modifiedTime: isoUtc(a.updated_at),
        author: a.author,
        section: LABEL,
      }),
      links: [
        { rel: "canonical", href: canonical },
        { rel: "alternate", hrefLang: "en-AU", href: canonical },
        { rel: "alternate", hrefLang: "x-default", href: canonical },
      ],
    };
  },
  component: WorldArticlePage,
});

function WorldArticlePage() {
  const { article, related } = useSuspenseQuery(
    worldArticleQuery(Route.useParams().slug),
  ).data;
  if (!article) return null;
  const showUpdated = isUpdatedDaysAfter(article.published_at, article.updated_at);
  const path = `/world/${article.slug}`;

  return (
    <>
      <SiteHeader activePath="/world" />
      <main>
        <article className="container-read pt-10">
          <nav className="meta mb-4" aria-label="Breadcrumb">
            <a href="/">Home</a> &nbsp;/&nbsp; <a href="/world">{LABEL}</a>
          </nav>
          <p className="kicker">{LABEL}</p>
          <h1 className="h1-news mt-2">{article.title}</h1>
          {article.dek && <p className="dek mt-4">{article.dek}</p>}
          <p className="meta mt-5">
            By <a href="/editorial-standards">{article.author ?? "AI-generated"}</a>
            {article.published_at && (
              <> &middot; Published {formatDateTime(article.published_at)}</>
            )}
          </p>
          {showUpdated && <p className="meta">Updated {formatDateTime(article.updated_at)}</p>}
        </article>

        {article.hero_image && (
          <figure className="container-news mt-6">
            <img
              src={article.hero_image}
              alt={article.title}
              className="w-full"
              loading="eager"
              fetchPriority="high"
              width={1600}
              height={1067}
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
          <div className="mb-3 flex justify-end print:hidden">
            <ListenButton
              audioUrl={article.audio_url}
              title={article.title}
              bodyHtml={article.body_html}
            />
          </div>

          {article.body_html ? (
            <div
              className="prose-news"
              dangerouslySetInnerHTML={{ __html: article.body_html }}
            />
          ) : (
            <p className="prose-news">{article.dek}</p>
          )}

          <ShareToolbar slug={article.slug} title={article.title} />

          {article.source_urls && article.source_urls.length > 0 && (
            <section className="mt-10 border-t border-[var(--hairline)] pt-6">
              <h2 className="kicker">Sources</h2>
              <ul className="mt-3 space-y-2">
                {article.source_urls.map((u) => (
                  <li key={u}>
                    <a
                      href={u}
                      target="_blank"
                      rel="noopener nofollow ugc"
                      className="break-words"
                    >
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10 border-t border-[var(--hairline)] pt-6">
            <NewsletterForm source={`world-post-read:${article.slug}`} variant="band" />
          </section>

          {related.length > 0 && (
            <section className="mt-12 border-t border-[var(--ink)] pt-6">
              <p className="kicker">More from The World</p>
              <ul className="mt-3 divide-y divide-[var(--hairline)]">
                {related.map((r) => (
                  <li key={r.id} className="py-3">
                    <a
                      href={`/world/${r.slug}`}
                      className="serif text-lg no-underline hover:underline"
                    >
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: article.title.slice(0, 110),
          description: article.dek ?? undefined,
          image: article.hero_image ? [article.hero_image] : undefined,
          datePublished: isoUtc(article.published_at),
          dateModified: isoUtc(article.updated_at),
          author: article.author
            ? { "@type": "Person", name: article.author }
            : { "@type": "Organization", name: siteName() },
          publisher: {
            "@type": "NewsMediaOrganization",
            name: siteName(),
            logo: { "@type": "ImageObject", url: `${siteDomain()}/logo.svg` },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(path) },
          articleSection: LABEL,
        }}
      />
    </>
  );
}
