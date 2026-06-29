import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { AskCanberraChat } from "@/components/AskCanberraChat";
import { buildMeta, canonicalLinks } from "@/lib/seo";
import { cityName, siteName } from "@/lib/city";

export const Route = createFileRoute("/ask")({
  ssr: false,
  head: () => ({
    meta: buildMeta({
      title: `Ask ${cityName()} | ${siteName()}`,
      description: `Ask anything about ${cityName()}. AI assistant trained on ${siteName()} newsroom: news, events, places to eat and things to do.`,
      path: "/ask",
    }),
    links: canonicalLinks("/ask"),
  }),
  component: AskPage,
});

function AskPage() {
  return (
    <>
      <SiteHeader activePath="/ask" />
      <main className="container-news py-8">
        <nav className="meta mb-4">
          <a href="/">Home</a> / Ask {cityName()}
        </nav>
        <AskCanberraChat />
      </main>
    </>
  );
}
