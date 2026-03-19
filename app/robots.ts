import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/seo"
import { SUPPORTED_LOCALES, withLocaleHref } from "@/lib/i18n"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
  const baseDisallow = [
    "/api/",
    "/admin",
    "/account",
    "/login",
    "/register",
    "/cart",
    "/payment-success",
    "/track-order",
    "/maintenance",
  ]
  const disallow = new Set<string>(baseDisallow)

  for (const locale of SUPPORTED_LOCALES) {
    for (const path of baseDisallow) {
      disallow.add(withLocaleHref(path, locale))
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: Array.from(disallow),
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
