import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const isDevelopment = process.env.NODE_ENV !== "production"

function getSupabaseHost(): string | null {
  const value = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").trim()
  if (!value) return null
  try {
    const url = new URL(value)
    return url.host || null
  } catch {
    return null
  }
}

function buildContentSecurityPolicy(nonce: string) {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://va.vercel-scripts.com",
    "https://www.paypal.com",
    "https://www.sandbox.paypal.com",
  ]

  const supabaseHost = getSupabaseHost()
  const supabaseConnect = supabaseHost
    ? [`https://${supabaseHost}`, `wss://${supabaseHost}`]
    : isDevelopment
      ? ["https://*.supabase.co", "wss://*.supabase.co"]
      : []

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    `script-src ${scriptSrc.join(" ")}`,
    "script-src-attr 'none'",
    // Keep unsafe-inline styles for now (Tailwind + third-party components can inject inline styles).
    "style-src 'self' 'unsafe-inline' https:",
    `connect-src 'self' https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.paypal.com https://www.sandbox.paypal.com https://vitals.vercel-insights.com https://vitals.vercel-analytics.com ${supabaseConnect.join(" ")}`.trim(),
    "font-src 'self' data: https:",
    "frame-src 'self' https://www.paypal.com https://www.sandbox.paypal.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' data: blob: https:",
    "upgrade-insecure-requests",
  ].join("; ")
}

function withSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce))
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
  response.headers.set("Cross-Origin-Resource-Policy", "same-site")
  response.headers.set("Origin-Agent-Cluster", "?1")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), browsing-topics=()")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-DNS-Prefetch-Control", "off")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none")
  return response
}

// Toggle this flag to enable/disable global maintenance mode.
// Set to `false` to return the website to normal operation.
const MAINTENANCE_MODE = false

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, "")
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  if (!MAINTENANCE_MODE) {
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce)
  }

  const { pathname } = request.nextUrl

  // Keep maintenance page accessible and avoid rewrite loop.
  if (pathname === "/maintenance" || pathname.startsWith("/maintenance/")) {
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce)
  }

  // Keep API routes available during maintenance.
  if (pathname.startsWith("/api/")) {
    return withSecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), nonce)
  }

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = "/maintenance"
  return withSecurityHeaders(NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } }), nonce)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
