// JSON-LD helper. Renders one <script type="application/ld+json"> with stringified payload.
// Escapes "<" as "\u003c" to neutralise stored XSS via </script> in admin content.
export function JsonLd({ data }: { data: unknown }) {
  const safe = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safe }} />;
}
