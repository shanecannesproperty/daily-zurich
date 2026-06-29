import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { siteName, cityName, siteEmail } from "@/lib/city";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: buildMeta({
      title: `Privacy Policy | ${siteName()}`,
      description: `How ${siteName()} collects, uses and protects your personal information under the Australian Privacy Principles.`,
      path: "/privacy",
    }),
    links: canonicalLinks("/privacy"),
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-read py-12">
        <h1 className="h1-news">Privacy Policy</h1>
        <p className="meta mt-2">Last updated: 26 June 2026.</p>
        <div className="prose-news mt-6">
          <p>
            {siteName()} ("we", "us", "our") respects your privacy. This policy explains
            what personal information we collect, how we use it, who we share it with,
            and your rights under the Privacy Act 1988 (Cth) and the Australian Privacy
            Principles (APPs).
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Newsletter:</strong> your email address, the page you signed up
              from, the date you subscribed, and basic engagement signals (whether
              emails are opened or links clicked).
            </li>
            <li>
              <strong>Enquiries:</strong> the name, business, email and message you
              provide when contacting us through a form on the site.
            </li>
            <li>
              <strong>Analytics:</strong> aggregated, non-identifying usage data —
              pages viewed, referrer, device type, and approximate region. We do not
              build advertising profiles of individual readers.
            </li>
          </ul>

          <h2>How we use it</h2>
          <ul>
            <li>To send you the daily {cityName()} briefing and operational messages.</li>
            <li>To respond to enquiries you submit.</li>
            <li>To understand which stories are useful and improve the publication.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell your personal information. We do not share
            it with third parties for their own marketing.
          </p>

          <h2>Service providers</h2>
          <p>
            We rely on a small number of trusted providers to deliver the newsletter
            and run the website (email delivery, hosting, and analytics). They process
            data only on our instructions and under appropriate confidentiality and
            security obligations.
          </p>

          <h2>Your rights</h2>
          <p>
            You can unsubscribe at any time using the link in any newsletter, which
            removes your email from our list. You can also ask us to access, correct
            or delete your personal information by emailing us at the address below.
          </p>

          <h2>Cookies</h2>
          <p>
            We use a small number of cookies and similar storage to remember your
            preferences and measure aggregate traffic. You can clear or block cookies
            in your browser settings.
          </p>

          <h2>Security</h2>
          <p>
            We take reasonable steps to protect personal information from misuse,
            interference, loss, and unauthorised access. No system is perfectly
            secure; if a notifiable data breach occurs, we will comply with the
            Notifiable Data Breaches scheme.
          </p>

          <h2>Contact and complaints</h2>
          <p>
            Privacy requests and complaints:{" "}
            <a href={`mailto:${siteEmail("privacy")}`}>
              {siteEmail("privacy")}
            </a>
            . If we cannot resolve a complaint to your satisfaction, you may refer it
            to the Office of the Australian Information Commissioner (OAIC) at{" "}
            <a href="https://www.oaic.gov.au" target="_blank" rel="noopener">
              oaic.gov.au
            </a>
            .
          </p>
        </div>
      </main>
    </>
  );
}
