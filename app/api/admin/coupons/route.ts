import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin-auth"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

function isMissingRelationError(message: string) {
  const normalized = message.trim().toLowerCase()
  return normalized.includes("relation") && normalized.includes("does not exist")
}

function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "")
}

const couponSchema = z.object({
  code: z.string().trim().min(1).max(40).transform(normalizeCouponCode),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).default(""),
  discountRate: z.number().min(0.0001).max(0.9999),
  minimumSubtotal: z.number().min(0).max(1_000_000),
  active: z.boolean().default(true),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
})

const updateSchema = couponSchema.partial().extend({
  code: z.string().trim().min(1).max(40).transform(normalizeCouponCode),
})

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await supabase
    .from("coupons")
    .select("code,title,description,discount_rate,minimum_subtotal,active,starts_at,ends_at,updated_at")
    .order("updated_at", { ascending: false })

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({ configured: false, coupons: [] })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const coupons = (data ?? []).map((row) => ({
    code: (row.code as string) ?? "",
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    discountRate: typeof row.discount_rate === "number" ? row.discount_rate : Number(row.discount_rate ?? 0),
    minimumSubtotal:
      typeof row.minimum_subtotal === "number" ? row.minimum_subtotal : Number(row.minimum_subtotal ?? 0),
    active: Boolean(row.active),
    startsAt: (row.starts_at as string | null) ?? null,
    endsAt: (row.ends_at as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  }))

  return NextResponse.json({ configured: true, coupons })
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = couponSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coupon payload." }, { status: 400 })
  }

  const coupon = parsed.data
  const { data, error } = await supabase
    .from("coupons")
    .upsert(
      [
        {
          code: coupon.code,
          title: coupon.title,
          description: coupon.description,
          discount_rate: coupon.discountRate,
          minimum_subtotal: coupon.minimumSubtotal,
          active: coupon.active,
          starts_at: coupon.startsAt ?? null,
          ends_at: coupon.endsAt ?? null,
        },
      ],
      { onConflict: "code" }
    )
    .select("code,title,description,discount_rate,minimum_subtotal,active,starts_at,ends_at,updated_at")
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json(
        { error: "Coupons table is not configured. Run the Supabase SQL migration first." },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ coupon: data })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coupon update payload." }, { status: 400 })
  }

  const coupon = parsed.data
  const updatePayload: Record<string, unknown> = {}

  if (coupon.title !== undefined) updatePayload.title = coupon.title
  if (coupon.description !== undefined) updatePayload.description = coupon.description
  if (coupon.discountRate !== undefined) updatePayload.discount_rate = coupon.discountRate
  if (coupon.minimumSubtotal !== undefined) updatePayload.minimum_subtotal = coupon.minimumSubtotal
  if (coupon.active !== undefined) updatePayload.active = coupon.active
  if (coupon.startsAt !== undefined) updatePayload.starts_at = coupon.startsAt
  if (coupon.endsAt !== undefined) updatePayload.ends_at = coupon.endsAt

  const { data, error } = await supabase
    .from("coupons")
    .update(updatePayload)
    .eq("code", coupon.code)
    .select("code,title,description,discount_rate,minimum_subtotal,active,starts_at,ends_at,updated_at")
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json(
        { error: "Coupons table is not configured. Run the Supabase SQL migration first." },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Coupon not found." }, { status: 404 })
  }

  return NextResponse.json({ coupon: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = z
    .object({ code: z.string().trim().min(1).max(40).transform(normalizeCouponCode) })
    .safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete payload." }, { status: 400 })
  }

  const { error } = await supabase.from("coupons").delete().eq("code", parsed.data.code)
  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json(
        { error: "Coupons table is not configured. Run the Supabase SQL migration first." },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

