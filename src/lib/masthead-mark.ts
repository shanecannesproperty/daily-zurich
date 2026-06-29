// Shared, city-aware masthead favicon mark. ISOMORPHIC-safe: only reads the
// active city via the synchronous city getters, builds an SVG string, and does
// no I/O. Used by the /favicon.svg and /favicon.ico server routes so both stay
// in lockstep and vary by the active city's accent colour. Canberra renders in
// its existing red, every other city in its own accent.
import { getCity, cityName } from "@/lib/city";

function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

// A bold serif initial of the active city in its accent colour on cream paper,
// framed by thin masthead rules. Not tied to any one city.
export function buildFaviconSvg(): string {
  const name = cityName();
  const accent = xmlEscape(getCity().accent);
  const initial = xmlEscape((name.trim()[0] ?? "D").toUpperCase());
  const label = xmlEscape(`The Daily ${name}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${label}">
  <rect width="64" height="64" rx="8" fill="#f5f3ee"/>
  <rect x="12" y="15" width="40" height="3" rx="1.5" fill="${accent}"/>
  <text x="32" y="50" text-anchor="middle" font-family="'Source Serif 4', Georgia, 'Times New Roman', serif" font-weight="700" font-size="40" fill="${accent}">${initial}</text>
  <rect x="12" y="55" width="40" height="2" rx="1" fill="${accent}" opacity="0.55"/>
</svg>
`;
}
