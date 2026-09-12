import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin-auth"
import { supabase } from "@/lib/supabase-server"
import { logServerError, publicErrorMessage } from "@/lib/api-errors"
import { generateRawApiKey, hashApiKey, getKeyPrefix } from "@/lib/api-keys"

export const runtime = "nodejs"

function isMissingRelationError(message: string) {
  const normalized = message.trim().toLowerCase()
  return normalized.includes("relation") && normalized.includes("does not exist")
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expiresAt: z.string().datetime().optional().nullable(),
  rateLimitPerMin: z.number().int().min(10).max(10000).optional().nullable(),
})

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id,name,key_prefix,is_active,permissions,rate_limit_per_min,last_used_at,expires_at,created_at,updated_at")
    .order("created_at", { ascending: false })

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({
        configured: false,
        apiKeys: [],
        message: "Tabel api_keys belum ada. Jalankan migration supabase/sql/20260316_add_api_keys.sql di Supabase SQL Editor.",
      })
    }
    logServerError("Admin api-keys load failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to load API keys.") }, { status: 500 })
  }

  return NextResponse.json({ configured: true, apiKeys: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload. Name is required (1-80 chars)." }, { status: 400 })
  }

  const rawKey = generateRawApiKey()
  const hash = hashApiKey(rawKey)
  const prefix = getKeyPrefix(rawKey)

  const { name, expiresAt, rateLimitPerMin } = parsed.data

  const { data, error } = await supabase
    .from("api_keys")
    .insert([
      {
        name: name.trim(),
        key_hash: hash,
        key_prefix: prefix,
        created_by: auth.userId,
        expires_at: expiresAt ?? null,
        is_active: true,
        permissions: ["products:read"],
        rate_limit_per_min: rateLimitPerMin ?? 120,
      },
    ])
    .select("id,name,key_prefix,is_active,permissions,rate_limit_per_min,expires_at,created_at")
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json(
        { error: "Tabel api_keys belum ada. Jalankan migration supabase/sql/20260316_add_api_keys.sql." },
        { status: 500 }
      )
    }
    // unique violation
    if (error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: "Duplicate key, please retry." }, { status: 500 })
    }
    logServerError("Admin api-keys create failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to create API key.") }, { status: 500 })
  }

  // Return raw key ONLY once
  return NextResponse.json({
    apiKey: data,
    rawKey,
    warning: "Simpan API key ini sekarang! Key tidak akan ditampilkan lagi setelah ini. Gunakan header X-API-Key: <key> untuk mengakses /api/v1/products",
  })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = z.object({ id: z.string().uuid() }).safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload. id (uuid) required." }, { status: 400 })
  }

  // Soft delete: set is_active = false
  const { error } = await supabase.from("api_keys").update({ is_active: false }).eq("id", parsed.data.id)

  if (error) {
    if (isMissingRelationError(error.message)) {
      return NextResponse.json({ error: "Tabel api_keys belum ada." }, { status: 500 })
    }
    logServerError("Admin api-keys revoke failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to revoke API key.") }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = z
    .object({
      id: z.string().uuid(),
      is_active: z.boolean().optional(),
      name: z.string().trim().min(1).max(80).optional(),
      rate_limit_per_min: z.number().int().min(10).max(10000).optional(),
      expires_at: z.string().datetime().nullable().optional(),
    })
    .safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid patch payload." }, { status: 400 })
  }

  const { id, ...updates } = parsed.data
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) payload.name = updates.name
  if (updates.is_active !== undefined) payload.is_active = updates.is_active
  if (updates.rate_limit_per_min !== undefined) payload.rate_limit_per_min = updates.rate_limit_per_min
  if (updates.expires_at !== undefined) payload.expires_at = updates.expires_at

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 })
  }

  const { data, error } = await supabase.from("api_keys").update(payload).eq("id", id).select("id,name,key_prefix,is_active,permissions,rate_limit_per_min,expires_at,updated_at").maybeSingle()

  if (error) {
    logServerError("Admin api-keys patch failed:", error)
    return NextResponse.json({ error: publicErrorMessage(error, "Unable to update API key.") }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "API key not found." }, { status: 404 })
  }

  return NextResponse.json({ apiKey: data })
}
