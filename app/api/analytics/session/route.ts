import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const sessionSchema = z.object({
  sessionId: z.string().trim().min(10).max(120),
  path: z.string().trim().min(1).max(500),
  referrer: z.string().trim().max(500).optional().nullable(),
  utm: z
    .object({
      source: z.string().trim().max(120).optional(),
      medium: z.string().trim().max(120).optional(),
      campaign: z.string().trim().max(120).optional(),
    })
    .optional(),
  action: z.enum(["pageview", "engaged"]).optional(),
})

function normalizeDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (/(iphone|ipod|android|mobile|iemobile|blackberry)/.test(ua)) return "Mobile"
  if (/(ipad|tablet)/.test(ua)) return "Tablet"
  return "Desktop"
}

function normalizeBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes("edg/")) return "Edge"
  if (ua.includes("chrome/")) return "Chrome"
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari"
  if (ua.includes("firefox/")) return "Firefox"
  return "Other"
}

function normalizeOs(userAgent: string): string {
  const ua = userAgent.toLowerCase()
  if (ua.includes("windows")) return "Windows"
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS"
  if (ua.includes("android")) return "Android"
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS"
  if (ua.includes("linux")) return "Linux"
  return "Other"
}

function extractTrafficSource(referrer: string, utmSource: string, utmMedium: string): string {
  const medium = utmMedium.toLowerCase()
  const source = utmSource.toLowerCase()
  if (medium || source) {
    if (/(cpc|ppc|paid|ads|ad)/.test(medium) || /(ads|adwords)/.test(source)) return "Ads"
    if (/(social|instagram|facebook|tiktok|youtube|twitter|x)/.test(medium + source)) return "Social"
    if (/(email|newsletter)/.test(medium)) return "Email"
    return "Referral"
  }

  if (!referrer) return "Direct"

  const ref = referrer.toLowerCase()
  if (/(google|bing|yahoo|duckduckgo|baidu)/.test(ref)) return "Organic"
  if (/(facebook|instagram|tiktok|youtube|twitter|x\.com|pinterest)/.test(ref)) return "Social"
  return "Referral"
}

function parsePath(value: string): string {
  if (!value) return "/"
  if (value.startsWith("http")) {
    try {
      const url = new URL(value)
      return url.pathname || "/"
    } catch {
      return value
    }
  }
  const cleaned = value.split("?")[0]?.split("#")[0] ?? value
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`
}

function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? ""
  if (!cookieHeader) return null
  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) {
      return decodeURIComponent(rest.join("="))
    }
  }
  return null
}

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:analytics-session", {
      max: 120,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
      )
    }

    if (!isAllowedRequestOrigin(request)) {
      return NextResponse.json({ error: "Forbidden origin." }, { status: 403 })
    }

    if (!hasSupabaseEnv) {
      return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = sessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const { sessionId, path, referrer, utm, action } = parsed.data
    const safePath = parsePath(path)
    const userAgent = request.headers.get("user-agent") ?? ""
    const deviceType = normalizeDeviceType(userAgent)
    const browser = normalizeBrowser(userAgent)
    const os = normalizeOs(userAgent)
    const utmSource = utm?.source?.trim() ?? ""
    const utmMedium = utm?.medium?.trim() ?? ""
    const utmCampaign = utm?.campaign?.trim() ?? ""
    const trafficSource = extractTrafficSource(referrer ?? "", utmSource, utmMedium)
    const country = request.headers.get("x-vercel-ip-country") ?? ""
    const city = request.headers.get("x-vercel-ip-city") ?? ""
    const returningCookie = getCookieValue(request, "analytics_returning")
    const isReturning = Boolean(returningCookie)

    const existing = await supabase
      .from("analytics_sessions")
      .select("session_id,page_views,engaged")
      .eq("session_id", sessionId)
      .maybeSingle()

    if (existing.error) {
      console.error("Analytics session lookup failed:", existing.error.message)
      return NextResponse.json({ error: "Unable to record session." }, { status: 500 })
    }

    if (!existing.data) {
      const pageViews = action === "pageview" || !action ? 1 : 0
      const engaged = action === "engaged"
      const { error } = await supabase.from("analytics_sessions").insert([
        {
          session_id: sessionId,
          landing_path: safePath,
          referrer: referrer ?? null,
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          utm_campaign: utmCampaign || null,
          traffic_source: trafficSource,
          device_type: deviceType,
          browser,
          os,
          country: country || null,
          city: city || null,
          is_returning: isReturning,
          page_views: pageViews,
          engaged,
        },
      ])

      if (error) {
        console.error("Analytics session insert failed:", error.message)
        return NextResponse.json({ error: "Unable to record session." }, { status: 500 })
      }
    } else {
      const currentViews = Number(existing.data.page_views ?? 0)
      const addView = action === "pageview" || !action ? 1 : 0
      const nextViews = currentViews + addView
      const engaged = Boolean(existing.data.engaged) || action === "engaged" || nextViews >= 2

      const { error } = await supabase
        .from("analytics_sessions")
        .update({ last_seen_at: new Date().toISOString(), page_views: nextViews, engaged })
        .eq("session_id", sessionId)

      if (error) {
        console.error("Analytics session update failed:", error.message)
        return NextResponse.json({ error: "Unable to record session." }, { status: 500 })
      }
    }

    const response = NextResponse.json({ ok: true })
    response.headers.append(
      "Set-Cookie",
      `analytics_returning=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
    )
    response.headers.append(
      "Set-Cookie",
      `analytics_session_id=${encodeURIComponent(sessionId)}; Path=/; Max-Age=${60 * 60 * 24}; SameSite=Lax`
    )
    return response
  } catch (error) {
    console.error("Analytics session error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to record session." }, { status: 500 })
  }
}
