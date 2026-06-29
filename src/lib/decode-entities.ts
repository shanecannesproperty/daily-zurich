// Decode common HTML entities in plain-text strings.
//
// Some ingested article titles and deks arrive HTML-encoded (e.g.
// "The City&#39;s" or "Tom &amp; Jerry"). JSX then escapes the ampersand
// again, so the literal entity shows on the page. We decode at the data
// boundary so every surface (homepage, article page, share cards) renders
// clean text.
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
};

export function decodeEntities<T extends string | null | undefined>(input: T): T {
  if (input == null) return input;
  const s = String(input);
  if (s.indexOf("&") === -1) return s as T;
  const decoded = s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const cp = parseInt(body.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    if (body.startsWith("#")) {
      const cp = parseInt(body.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : match;
    }
    const named = NAMED[body];
    return named ?? match;
  });
  return decoded as T;
}
