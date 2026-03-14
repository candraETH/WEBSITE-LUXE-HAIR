import { headers } from "next/headers"

export async function JsonLd({ data }: { data: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined
  // Prevent `</script>`-style breakouts inside JSON-LD (XSS hardening).
  const payload = JSON.stringify(data).replace(/</g, "\\u003c")
  return (
    <script
      // Browsers can hide/empty the `nonce` attribute after parsing, which may cause React hydration warnings.
      // This script never needs to hydrate, so we can safely suppress the mismatch warning.
      suppressHydrationWarning
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  )
}
