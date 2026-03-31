import type { Metadata } from "next"
import { headers } from "next/headers"
import { SITE_NAME, getSiteUrl, shouldNoIndexPath } from "@/lib/seo"
import { localeFromPathname, swapLocaleInPathname, type SupportedLocale } from "@/lib/i18n"

function parseLocale(value: string | null | undefined): SupportedLocale {
  if (value === "ru") return "ru"
  return "en"
}

async function getRequestContext(): Promise<{ locale: SupportedLocale; canonicalPath: string }> {
  const headerStore = await headers()
  const locale = parseLocale(headerStore.get("x-locale") ?? "en")
  const originalPathname = headerStore.get("x-pathname-original") ?? `/${locale}`
  const canonicalPath = originalPathname.startsWith("/") ? originalPathname : `/${originalPathname}`
  return { locale, canonicalPath }
}

type BuildLocalizedPageMetadataInput = {
  title: string
  description: string
  keywords?: string[]
  images?: string[]
  noIndex?: boolean
}

export async function buildLocalizedPageMetadata({
  title,
  description,
  keywords,
  images = ["/images/hero.jpg"],
  noIndex = false,
}: BuildLocalizedPageMetadataInput): Promise<Metadata> {
  const { locale, canonicalPath } = await getRequestContext()
  const resolvedNoIndex = noIndex ?? shouldNoIndexPath(canonicalPath)

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: swapLocaleInPathname(canonicalPath, "en"),
        ru: swapLocaleInPathname(canonicalPath, "ru"),
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      type: "website",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.length > 0 ? [images[0]] : undefined,
    },
    robots: resolvedNoIndex
      ? {
          index: false,
          follow: false,
          noarchive: true,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
        },
  }
}

export async function getLocaleFromRequestHeaders(): Promise<SupportedLocale> {
  const headerStore = await headers()
  return localeFromPathname(`/${headerStore.get("x-locale") ?? "en"}`).locale
}
