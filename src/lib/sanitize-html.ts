// Minimal, dependency-free HTML sanitiser for moderator-approved notice text.
//
// Obituary body_html is written or pasted by a family member or funeral
// director and approved by a moderator before publishing, but it still
// originates outside our newsroom, so we strip anything that could execute or
// exfiltrate before it is rendered. This is an allowlist sanitiser: only a
// small set of plain formatting tags survive, everything else is removed.
//
// It is intentionally conservative (no SVG, no images, no iframes, no inline
// styles) and runs the same on the server and the client.

// Tags a notice legitimately needs: paragraphs, line breaks, emphasis and lists.
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h2",
  "h3",
  "a",
]);

// On <a> we keep only href (validated below) plus link-safety attributes.
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
};

function isSafeHref(value: string): boolean {
  const v = value.trim().toLowerCase();
  // Allow only http(s), mailto and tel. Block javascript:, data:, vbscript: etc.
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:") ||
    v.startsWith("/") ||
    v.startsWith("#")
  );
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  let html = String(input);

  // 1. Remove whole dangerous elements including their content.
  html = html.replace(
    /<\s*(script|style|iframe|object|embed|template|noscript|svg)[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  // Also drop any unclosed/standalone occurrences of those openers.
  html = html.replace(
    /<\s*\/?\s*(script|style|iframe|object|embed|template|noscript|svg)\b[^>]*>/gi,
    "",
  );

  // 2. Walk every remaining tag and either rebuild it from the allowlist or drop it.
  html = html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (_match, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      const closing = _match.startsWith("</");
      if (!ALLOWED_TAGS.has(name)) return "";
      if (closing) return `</${name}>`;

      const allowed = ALLOWED_ATTRS[name];
      if (!allowed) return `<${name}>`;

      const attrs: string[] = [];
      const attrRe = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(rawAttrs)) !== null) {
        const attrName = m[1].toLowerCase();
        const value = m[3] ?? m[4] ?? "";
        // Never allow event handlers or unknown attributes.
        if (attrName.startsWith("on")) continue;
        if (!allowed.has(attrName)) continue;
        if (attrName === "href" && !isSafeHref(value)) continue;
        attrs.push(`${attrName}="${escapeAttr(value)}"`);
      }

      // Render external links safely.
      if (name === "a") {
        attrs.push('target="_blank"');
        attrs.push('rel="noopener nofollow ugc"');
        // If no safe href survived, render the link text without an anchor target.
        if (!attrs.some((a) => a.startsWith("href="))) return "";
      }

      return `<${name}${attrs.length ? " " + attrs.join(" ") : ""}>`;
    },
  );

  return html;
}
