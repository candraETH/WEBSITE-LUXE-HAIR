import { headers } from "next/headers"

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined
  // Prevent `</script>`-style breakouts inside JSON-LD (XSS hardening).
  const payload = JSON.stringify(data).replace(/</g, "\\u003c")
  return (
    <div
      // Browsers can hide/empty the `nonce` attribute after parsing, which may cause React hydration warnings.
      // Wrapping the script lets React ignore that one-level child mismatch without affecting the page content.
      suppressHydrationWarning
    >
      <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: payload }} />
    </div>
  )
}
