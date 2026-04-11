import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { headers } from "next/headers"

import './globals.css'
import { AppProviders } from './providers'
import { getSiteUrl, SITE_NAME } from '@/lib/seo'
import { localeFromPathname, swapLocaleInPathname } from "@/lib/i18n"
import { getSiteCopy } from "@/lib/site-copy"
import { AnalyticsSessionTracker } from "@/components/analytics-session-tracker"

export const dynamic = "force-dynamic"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: "swap",
  adjustFontFallback: true,
  fallback: ["system-ui", "Segoe UI", "Arial", "sans-serif"],
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: "swap",
  adjustFontFallback: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
})

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers()
  const localeHeader = headerStore.get("x-locale") ?? "en"
  const locale: "en" | "ru" = localeHeader === "ru" ? "ru" : "en"
  const originalPath = headerStore.get("x-pathname-original") ?? `/${locale}`
  const canonicalPath = originalPath.startsWith("/") ? originalPath : `/${originalPath}`
  const copy = getSiteCopy(locale)

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: copy.title,
      template: `%s | ${SITE_NAME}`,
    },
    description: copy.description,
    keywords: copy.keywords,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: swapLocaleInPathname(canonicalPath, "en"),
        ru: swapLocaleInPathname(canonicalPath, "ru"),
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      type: "website",
      siteName: SITE_NAME,
      url: canonicalPath,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      images: ["/images/hero.jpg"],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: ["/images/hero.jpg"],
    },
    icons: {
      icon: "/images/logo-favicon.png",
      shortcut: "/images/logo-favicon.png",
      apple: "/images/logo-favicon.png",
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#1a1714',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerStore = await headers()
  const localeHeader = headerStore.get("x-locale") ?? "en"
  const locale = localeFromPathname(`/${localeHeader}`).locale

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} ${playfair.variable} font-sans antialiased`}
      >
        <AppProviders locale={locale}>{children}</AppProviders>
        <AnalyticsSessionTracker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
