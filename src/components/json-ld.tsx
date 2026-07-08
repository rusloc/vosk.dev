/**
 * Renders JSON-LD structured data as a server-rendered <script>. Escaping `<`
 * prevents a `</script>` breakout if any string field ever contains markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
