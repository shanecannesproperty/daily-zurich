import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { siteName, cityAccent } from "@/lib/city";

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

export const Route = createFileRoute("/logo.svg")({
  server: {
    handlers: {
      GET: () => {
        // City wordmark with a city-aware accent rule beneath it, so the
        // masthead lockup carries the active city's brand colour.
        const name = xmlEscape(siteName());
        const accent = xmlEscape(cityAccent());
        const body = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120" role="img" aria-label="${name}">
  <rect width="600" height="120" fill="#FFFFFF"/>
  <text x="300" y="68" text-anchor="middle" textLength="560" lengthAdjust="spacingAndGlyphs" font-family="'Source Serif 4', Georgia, serif" font-weight="600" font-size="44" letter-spacing="-1" fill="#1A1A18">${name}</text>
  <rect x="170" y="88" width="260" height="4" rx="2" fill="${accent}"/>
</svg>
`;
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
