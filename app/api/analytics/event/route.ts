import { NextResponse } from "next/server"
import { z } from "zod"
import { enforceRateLimit } from "@/lib/rate-limit"
import { isAllowedRequestOrigin } from "@/lib/security"
import { hasSupabaseEnv, supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const eventSchema = z.object({
  sessionId: z.string().trim().min(10).max(120).optional(),
  name: z.enum(["checkout_started", "purchase_completed"]),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(request: Request) {
  try {
    const rateLimit = await enforceRateLimit(request, "api:analytics-event", {
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
    const parsed = eventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
    }

    const { sessionId, name, metadata } = parsed.data
    const { error } = await supabase.from("analytics_events").insert([
      {
        session_id: sessionId ?? null,
        event_name: name,
        metadata: metadata ?? {},
      },
    ])

    if (error) {
      console.error("Analytics event insert failed:", error.message)
      return NextResponse.json({ error: "Unable to record event." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Analytics event error:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Unable to record event." }, { status: 500 })
  }
}
