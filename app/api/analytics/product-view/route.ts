import { NextResponse } from "next/server"
import { z } from "zod"
import { CATALOG_PRODUCT_BY_SLUG } from "@/lib/catalog-index"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const viewSchema = z.object({
  slug: z.string().trim().min(1).max(120),
})

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:product-view", {
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
    const parsed = viewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const slug = parsed.data.slug.trim().toLowerCase()
    if (!CATALOG_PRODUCT_BY_SLUG.has(slug)) {
      return NextResponse.json({ error: "Unknown product." }, { status: 404 })
    }

    const { error } = await supabase.rpc("increment_product_view", { view_slug: slug })
    if (error) {
      console.error("Product view RPC failed:", error.message)
      return NextResponse.json({ error: "Unable to record product view." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Product view tracking failed:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to record product view." }, { status: 500 })
  }
}
