export const SUPPORTED_LOCALES = ["en", "ru"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = "en"

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export function localeFromPathname(pathname: string): { locale: SupportedLocale; hasPrefix: boolean } {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
  const firstSegment = normalized.split("/")[1] ?? ""
  if (isSupportedLocale(firstSegment)) {
    return { locale: firstSegment, hasPrefix: true }
  }
  return { locale: DEFAULT_LOCALE, hasPrefix: false }
}

function readLocaleFromCookie(): SupportedLocale | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\\s*)site_locale=([^;]+)/)
  const raw = match?.[1] ? decodeURIComponent(match[1]) : ""
  if (!raw) return null
  return isSupportedLocale(raw) ? raw : null
}

function readLocaleFromHtmlLang(): SupportedLocale | null {
  if (typeof document === "undefined") return null
  const raw = (document.documentElement.lang || "").toLowerCase()
  if (!raw) return null
  const match = SUPPORTED_LOCALES.find((candidate) => raw === candidate || raw.startsWith(`${candidate}-`))
  return match ?? null
}

// Client-safe locale resolver that still works even if the runtime pathname has been rewritten (e.g. /ru -> /).
export function resolveClientLocale(pathname: string | null | undefined): SupportedLocale {
  const runtimePathname = pathname ?? ""
  const fromRuntime = localeFromPathname(runtimePathname)
  if (fromRuntime.hasPrefix) return fromRuntime.locale

  // When locale routing is implemented via middleware rewrite (/ru/* -> /*),
  // Next's `usePathname()` can return the rewritten pathname without the locale prefix.
  // In that case, prefer `window.location.pathname` (original URL) if available.
  if (typeof window !== "undefined") {
    const fromWindow = localeFromPathname(window.location.pathname)
    if (fromWindow.hasPrefix) return fromWindow.locale
  }

  return readLocaleFromCookie() ?? readLocaleFromHtmlLang() ?? fromRuntime.locale
}

export function stripLocaleFromPathname(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
  const { hasPrefix } = localeFromPathname(normalized)
  if (!hasPrefix) return normalized

  const parts = normalized.split("/")
  const rest = parts.slice(2).join("/")
  return `/${rest}`.replace(/\/+$/, "") || "/"
}

function splitHash(href: string): { base: string; hash: string } {
  const idx = href.indexOf("#")
  if (idx === -1) return { base: href, hash: "" }
  return { base: href.slice(0, idx), hash: href.slice(idx) }
}

export function withLocaleHref(href: string, locale: SupportedLocale): string {
  if (!href) return `/${locale}`
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href)) return href
  if (/^(mailto|tel):/i.test(href)) return href

  const { base, hash } = splitHash(href)
  if (base.startsWith("#") || base === "") return href

  const baseWithSlash = base.startsWith("/") ? base : `/${base}`
  const stripped = stripLocaleFromPathname(baseWithSlash)
  const localized = stripped === "/" ? `/${locale}` : `/${locale}${stripped}`
  return `${localized}${hash}`
}

export function swapLocaleInPathname(pathname: string, nextLocale: SupportedLocale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
  const stripped = stripLocaleFromPathname(normalized)
  return stripped === "/" ? `/${nextLocale}` : `/${nextLocale}${stripped}`
}
