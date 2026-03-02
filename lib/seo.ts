import type { Metadata } from "next"

export const SITE_NAME = "CANDRA'S HAIR"
export const SITE_TITLE = "CANDRA'S HAIR | Premium Hair Extensions, Wigs & More"
export const SITE_DESCRIPTION =
  "Discover premium quality hair extensions, wigs, weft hair, and bulk hair. Luxury hair solutions for every style."

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

export function getSiteUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim()
  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (process.env.NODE_ENV === "production") {
    return "https://example.com"
  }

  return "http://localhost:3000"
}

export function toCanonicalPath(path: string): string {
  if (!path) {
    return "/"
  }
  return path.startsWith("/") ? path : `/${path}`
}

export function absoluteUrl(path: string): string {
  return `${getSiteUrl()}${toCanonicalPath(path)}`
}

type BuildPageMetadataInput = {
  title: string
  description: string
  path: string
  keywords?: string[]
  images?: string[]
  noIndex?: boolean
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  images = ["/images/hero.jpg"],
  noIndex = false,
}: BuildPageMetadataInput): Metadata {
  const canonical = toCanonicalPath(path)

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.length > 0 ? [images[0]] : undefined,
    },
    robots: noIndex
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

export function parsePriceValues(priceLabel: string): number[] {
  const matches = priceLabel.match(/\d+(?:\.\d+)?/g) ?? []
  return matches
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value))
}
