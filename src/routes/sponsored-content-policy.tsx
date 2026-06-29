import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, siteEmail } from "@/lib/city";

export const Route = createFileRoute("/sponsored-content-policy")({
  head: () => ({
    meta: buildMeta({
      title: `Sponsored content policy — ${siteName()}`,
      description: `How ${siteName()} handles sponsored content, paid partnerships, and the wall between editorial and advertising.`,
      path: "/sponsored-content-policy",
    }),
    links: canonicalLinks("/sponsored-content-policy"),
  }),
  component: PolicyPage,
});

function PolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-read py-12">
        <p className="kicker">Policy</p>
        <h1 className="h1-news mt-1">Our sponsored content policy</h1>
        <p className="dek mt-3 max-w-[60ch]">
          This page is maintained by the {siteName()} editorial team to explain
          how we handle paid placements. It is intended to meet ACCC guidance
          for digital publishers and the disclosure expectations of major ad
          networks.
        </p>

        <div className="prose-news mt-10 space-y-6">
          <section>
            <h2>What is sponsored content?</h2>
            <p>
              Sponsored content is any article, newsletter slot, or on-page
              placement paid for by a third-party advertiser, sponsor, or
              commercial partner. It includes branded content, native ads, paid
              partnerships, and advertorials.
            </p>
          </section>

          <section>
            <h2>How sponsored content is labelled</h2>
            <p>
              Every sponsored placement on {siteName()} is clearly labelled. You
              will see one of these labels above or alongside the content:
            </p>
            <ul>
              <li><strong>Sponsored</strong> — a paid article from an advertiser.</li>
              <li><strong>Paid Partnership</strong> — content produced with a partner organisation.</li>
              <li><strong>Promoted</strong> — a paid placement within a list or feed.</li>
            </ul>
            <p>
              Labels are visually distinct from editorial bylines and appear
              before the headline, so readers can identify sponsored content at
              a glance — on the homepage, in feeds, and on the article page
              itself.
            </p>
          </section>

          <section>
            <h2>Editorial independence</h2>
            <p>
              The {siteName()} editorial team operates independently of our
              commercial team. Sponsors do not see editorial articles before
              publication, do not direct our reporting, and cannot pay to alter
              or remove news coverage. Our editorial decisions are made on news
              merit alone.
            </p>
            <p>
              Where a sponsor is also the subject of editorial coverage, we
              disclose the commercial relationship inside the article.
            </p>
          </section>

          <section>
            <h2>What we will not accept</h2>
            <ul>
              <li>Sponsored content that misleads readers about a product, service, or person.</li>
              <li>Content that impersonates news reporting or obscures the sponsor.</li>
              <li>Placements from gambling, tobacco, or other restricted categories where local rules apply.</li>
              <li>Content that targets minors or vulnerable audiences.</li>
            </ul>
          </section>

          <section>
            <h2>Enquire about sponsored placements</h2>
            <p>
              For rates, formats, and editorial guidelines for sponsored content,
              email{" "}
              <a href={`mailto:${siteEmail("advertise")}`}>
                {siteEmail("advertise")}
              </a>
              {" "}or visit our{" "}
              <a href="/media-kit">Media Kit</a>.
            </p>
          </section>

          <section>
            <h2>Questions or concerns</h2>
            <p>
              If you believe a placement on {siteName()} is not labelled
              correctly, please contact our editor at{" "}
              <a href={`mailto:${siteEmail("editor")}`}>
                {siteEmail("editor")}
              </a>
              . We review every complaint and update or remove placements that
              do not meet this policy.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
