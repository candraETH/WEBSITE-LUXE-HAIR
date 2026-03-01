import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Toggle this flag to enable/disable global maintenance mode.
// Set to `false` to return the website to normal operation.
const MAINTENANCE_MODE = false

export function middleware(request: NextRequest) {
  if (!MAINTENANCE_MODE) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Keep maintenance page accessible and avoid rewrite loop.
  if (pathname === "/maintenance" || pathname.startsWith("/maintenance/")) {
    return NextResponse.next()
  }

  // Keep API routes available during maintenance.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = "/maintenance"
  return NextResponse.rewrite(rewriteUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}

