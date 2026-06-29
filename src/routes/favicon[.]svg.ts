import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { buildFaviconSvg } from "@/lib/masthead-mark";

export const Route = createFileRoute("/favicon.svg")({
  server: {
    handlers: {
      GET: () => {
        // City-aware masthead mark: a bold serif initial of the active city in
        // its accent colour on cream paper. Not Canberra-specific, so every
        // city renders a recognisably different tile that varies by accent.
        const body = buildFaviconSvg();
        return new Response(body, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
