import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { siteDomain } from "@/lib/city";

export const Route = createFileRoute("/rss/")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 308,
          headers: { Location: `${siteDomain()}/rss/news.xml` },
        }),
    },
  },
});
