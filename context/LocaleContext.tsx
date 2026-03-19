"use client"

import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n"

type LocaleContextValue = {
  locale: SupportedLocale
  setLocale: (nextLocale: SupportedLocale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function normalizeHtmlLocale(value: string): SupportedLocale | null {
  const raw = (value || "").toLowerCase()
  if (!raw) return null
  const match = SUPPORTED_LOCALES.find((candidate) => raw === candidate || raw.startsWith(`${candidate}-`))
  return match ?? null
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: SupportedLocale
  children: ReactNode
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(initialLocale)

  useEffect(() => {
    setLocaleState(initialLocale)
  }, [initialLocale])

  useEffect(() => {
    const htmlLocale = normalizeHtmlLocale(document.documentElement.lang)
    if (htmlLocale && htmlLocale !== locale) {
      setLocaleState(htmlLocale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = (nextLocale: SupportedLocale) => {
    setLocaleState(nextLocale)
    try {
      document.cookie = `site_locale=${encodeURIComponent(nextLocale)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    } catch {
      // ignore
    }
  }

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (ctx) return ctx

  if (process.env.NODE_ENV !== "production") {
    throw new Error("useLocale must be used within <LocaleProvider />")
  }

  return { locale: DEFAULT_LOCALE, setLocale: () => {} }
}

