import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { siteDomain } from "@/lib/city";

export const Route = createFileRoute("/sitemap-index.xml")({
  server: {
    handlers: {
      GET: () => {
        const domain = siteDomain();
        const now = new Date().toISOString();
        const body = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          `  <sitemap><loc>${domain}/sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>`,
          `  <sitemap><loc>${domain}/news-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>`,
          `  <sitemap><loc>${domain}/feed.xml</loc><lastmod>${now}</lastmod></sitemap>`,
          `  <sitemap><loc>${domain}/podcast.rss</loc><lastmod>${now}</lastmod></sitemap>`,
          `</sitemapindex>`,
        ].join("\n");
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
