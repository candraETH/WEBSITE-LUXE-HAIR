import type { Metadata } from "next"

import { SITE_NAME as BRAND_NAME, getSiteCopy } from "@/lib/site-copy"
import { stripLocaleFromPathname } from "@/lib/i18n"

export const SITE_NAME = BRAND_NAME
export const SITE_TITLE = getSiteCopy("en").title
export const SITE_DESCRIPTION = getSiteCopy("en").description
const DEFAULT_PRODUCTION_SITE_URL = "https://candrashair.com"
const PRIVATE_PATH_PREFIXES = [
  "/admin",
  "/account",
  "/login",
  "/register",
  "/cart",
  "/payment-success",
  "/track-order",
  "/maintenance",
]

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

export function getSiteUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim()
  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_SITE_URL
  }

  return "http://localhost:3000"
}

export function toCanonicalPath(path: string): string {
  if (!path) {
    return "/"
  }
  return path.startsWith("/") ? path : `/${path}`
}

export function shouldNoIndexPath(path: string): boolean {
  const canonical = toCanonicalPath(path).split("#")[0]?.split("?")[0] || "/"
  const normalized = stripLocaleFromPathname(canonical)
  return PRIVATE_PATH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))
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
  const resolvedNoIndex = noIndex ?? shouldNoIndexPath(canonical)

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

export function parsePriceValues(priceLabel: string): number[] {
  const matches = priceLabel.match(/\d+(?:\.\d+)?/g) ?? []
  return matches
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value))
}
