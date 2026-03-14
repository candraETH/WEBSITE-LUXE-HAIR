import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin-auth"
import { logServerError, publicErrorMessage } from "@/lib/api-errors"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

function isMissingRelationError(message: string) {
  const normalized = message.trim().toLowerCase()
  return normalized.includes("relation") && normalized.includes("does not exist")
}

const updateSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  stock: z.number().int().min(0).max(1_000_000_000),
})

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await supabase.from("inventory").select("slug,stock,updated_at").order("slug")
  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({ configured: false, rows: [] })
    }
    logServerError("Admin inventory load failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to load inventory.") }, { status: 500 })
  }

  const rows = (data ?? []).map((row) => ({
    slug: row.slug as string,
    stock: typeof row.stock === "number" ? row.stock : Number(row.stock ?? 0),
    updatedAt: (row.updated_at as string | null) ?? null,
  }))

  return NextResponse.json({ configured: true, rows })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid inventory update payload." }, { status: 400 })
  }

  const payload = parsed.data

  const { data, error } = await supabase
    .from("inventory")
    .upsert([{ slug: payload.slug, stock: payload.stock }], { onConflict: "slug" })
    .select("slug,stock,updated_at")
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json(
        { error: "Inventory table is not configured. Run the Supabase SQL migration first." },
        { status: 500 }
      )
    }
    logServerError("Admin inventory update failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to update inventory.") }, { status: 500 })
  }

  return NextResponse.json({
    row: {
      slug: (data?.slug as string) ?? payload.slug,
      stock: typeof data?.stock === "number" ? data.stock : Number(data?.stock ?? payload.stock),
      updatedAt: (data?.updated_at as string | null) ?? null,
    },
  })
}
