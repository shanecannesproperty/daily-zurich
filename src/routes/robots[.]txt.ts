import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { siteDomain, cityLaunched } from "@/lib/city";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        // Draft (not-yet-launched) cities are kept out of search indexes entirely
        // so thin/empty content never gets crawled. The page head also emits a
        // `noindex` meta tag for these cities (belt and braces).
        if (!cityLaunched()) {
          const draftBody = ["User-agent: *", "Disallow: /", ""].join("\n");
          return new Response(draftBody, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "",
          "User-agent: GPTBot",
          "Allow: /",
          "",
          "User-agent: Google-Extended",
          "Allow: /",
          "",
          "User-agent: CCBot",
          "Allow: /",
          "",
          "User-agent: PerplexityBot",
          "Allow: /",
          "",
          "User-agent: ClaudeBot",
          "Allow: /",
          "",
          `Sitemap: ${siteDomain()}/sitemap.xml`,
          `Sitemap: ${siteDomain()}/news-sitemap.xml`,
          "",
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
