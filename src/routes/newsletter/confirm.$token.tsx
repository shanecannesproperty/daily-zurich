import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { buildMeta } from "@/lib/seo";
import { siteName } from "@/lib/city";

export const Route = createFileRoute("/newsletter/confirm/$token")({
  head: () => ({
    meta: buildMeta({
      title: `Subscription confirmed | ${siteName()}`,
      description: "You're subscribed.",
      path: "/newsletter/confirm",
    }),
  }),
  component: () => (
    <>
      <SiteHeader />
      <main className="container-read py-16 text-center">
        <h1 className="h1-news">You're subscribed</h1>
        <p className="dek mt-4 max-w-lg mx-auto">
          You'll receive the {siteName()} brief in your inbox each weekday morning.
        </p>
        <a href="/" className="btn-primary inline-block mt-8">
          Back to the news
        </a>
      </main>
    </>
  ),
});
