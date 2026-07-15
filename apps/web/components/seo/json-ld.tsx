import type { ReactElement } from 'react'

type JsonLdProps = {
  data: Record<string, unknown>
}

/**
 * Render a JSON-LD `<script>` tag from a structured-data object.
 *
 * `<` is escaped to its unicode form so a stray `</script>` inside any string
 * value can never break out of the script element. The data is app-controlled
 * (no user input), but the escape keeps this safe by construction.
 *
 * @param {JsonLdProps} root0 - The component props.
 * @param {Record<string, unknown>} root0.data - The schema.org object to serialize.
 * @returns {ReactElement} A script element carrying the serialized JSON-LD.
 */
export function JsonLd({ data }: JsonLdProps): ReactElement {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      // JSON-LD requires raw script content; the data is app-controlled and
      // `<` is escaped above, so this cannot break out of the script element.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
