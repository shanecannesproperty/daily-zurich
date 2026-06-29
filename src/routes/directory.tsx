import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listDirectory } from "@/lib/data.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { SponsorCta } from "@/components/SponsorCta";
import { JsonLd } from "@/components/JsonLd";
import { buildMeta, canonicalLinks, absUrl } from "@/lib/seo";
import { cityName, siteName, cityRegion } from "@/lib/city";

const q = queryOptions({ queryKey: ["directory"], queryFn: () => listDirectory() });

export const Route = createFileRoute("/directory")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  head: () => ({
    meta: buildMeta({
      title: `${cityName()} business directory | ${siteName()}`,
      description: `Local businesses across ${cityName()}, curated by ${siteName()}.`,
      path: "/directory",
    }),
    links: canonicalLinks("/directory"),
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const { data } = useSuspenseQuery(q);
  const byCategory: Record<string, typeof data> = {};
  for (const l of data) {
    const k = l.category ?? "Other";
    byCategory[k] ??= [];
    byCategory[k].push(l);
  }
  const cats = Object.keys(byCategory).sort();

  return (
    <>
      <SiteHeader activePath="/directory" />
      <main className="container-news py-10">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Directory
        </nav>
        <h1 className="h1-news">{cityName()} business directory</h1>
        <p className="dek mt-2">Curated local businesses. Featured first.</p>
        <div className="hairline mt-6" />
        {cats.length === 0 ? (
          <p className="meta mt-10">No listings yet.</p>
        ) : (
          cats.map((cat) => (
            <section key={cat} className="mt-10">
              <h2 className="kicker">{cat}</h2>
              <ul className="mt-4 grid gap-x-10 gap-y-6 md:grid-cols-2 border-t border-[var(--hairline)] pt-4">
                {byCategory[cat].map((l) => (
                  <li key={l.id} className="grid gap-3 sm:grid-cols-12">
                    {l.image_url && (
                      <img
                        src={l.image_url}
                        alt={l.business_name}
                        className="sm:col-span-4 aspect-[4/3] object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <div className={l.image_url ? "sm:col-span-8" : "sm:col-span-12"}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="h3-card">{l.business_name}</h3>
                        {(l.is_featured || l.is_sponsored) && (
                          <span className="label-sponsored">
                            {l.is_sponsored ? "Sponsored" : "Featured"}
                          </span>
                        )}
                      </div>
                      {l.suburb && <p className="meta">{l.suburb}</p>}
                      <p className="meta mt-1 flex flex-wrap gap-3">
                        {l.website_url && (
                          <a href={l.website_url} target="_blank" rel="noopener">
                            Website
                          </a>
                        )}
                        {l.phone && <a href={`tel:${l.phone}`}>{l.phone}</a>}
                        <a href={l.source_url} target="_blank" rel="noopener nofollow ugc">
                          Source
                        </a>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        <div className="mt-12">
          <SponsorCta page="/directory" />
        </div>
      </main>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${cityName()} business directory | ${siteName()}`,
          url: absUrl("/directory"),
        }}
      />
      {data.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: data.slice(0, 100).map((l, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "LocalBusiness",
                name: l.business_name,
                url: l.website_url ?? l.source_url,
                ...(l.image_url ? { image: l.image_url } : {}),
                ...(l.phone ? { telephone: l.phone } : {}),
                ...(l.suburb
                  ? {
                      address: {
                        "@type": "PostalAddress",
                        addressLocality: l.suburb,
                        addressRegion: cityRegion(),
                        addressCountry: "AU",
                      },
                    }
                  : {}),
              },
            })),
          }}
        />
      )}
    </>
  );
}
