"use client"

import { useEffect, useMemo, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const SESSION_ID_KEY = "analytics_session_id"
const SESSION_LAST_SEEN_KEY = "analytics_session_last_seen"
const SESSION_TTL_MS = 30 * 60 * 1000

function ensureSessionId(): string {
  if (typeof window === "undefined") return ""
  const now = Date.now()
  const lastSeen = Number(window.localStorage.getItem(SESSION_LAST_SEEN_KEY) || 0)
  let sessionId = window.localStorage.getItem(SESSION_ID_KEY) || ""

  if (!sessionId || (lastSeen && now - lastSeen > SESSION_TTL_MS)) {
    sessionId = crypto.randomUUID()
    window.localStorage.setItem(SESSION_ID_KEY, sessionId)
  }

  window.localStorage.setItem(SESSION_LAST_SEEN_KEY, String(now))
  document.cookie = `analytics_session_id=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax`
  document.cookie = `analytics_returning=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
  return sessionId
}

function buildUtm(searchParams: URLSearchParams | null) {
  if (!searchParams) return {}
  const source = searchParams.get("utm_source") ?? ""
  const medium = searchParams.get("utm_medium") ?? ""
  const campaign = searchParams.get("utm_campaign") ?? ""
  return { source, medium, campaign }
}

function shouldSkipTracking(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/maintenance")
  )
}

export function AnalyticsSessionTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathRef = useRef<string>("")
  const engageTimeoutRef = useRef<number | null>(null)

  const pathWithSearch = useMemo(() => {
    const query = searchParams?.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  useEffect(() => {
    if (!pathname || shouldSkipTracking(pathname)) return
    if (lastPathRef.current === pathWithSearch) return

    lastPathRef.current = pathWithSearch
    const sessionId = ensureSessionId()
    if (!sessionId) return

    const payload = {
      sessionId,
      path: pathWithSearch,
      referrer: document.referrer || "",
      utm: buildUtm(searchParams),
      action: "pageview",
    }

    fetch("/api/analytics/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {})

    if (engageTimeoutRef.current) {
      window.clearTimeout(engageTimeoutRef.current)
    }

    engageTimeoutRef.current = window.setTimeout(() => {
      const engagedKey = `analytics_engaged:${sessionId}:${pathname}`
      if (window.sessionStorage.getItem(engagedKey)) return
      window.sessionStorage.setItem(engagedKey, "1")
      fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, path: pathWithSearch, action: "engaged" }),
      }).catch(() => {})
    }, 12000)
  }, [pathname, pathWithSearch, searchParams])

  return null
}
