import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/admin-auth"
import { supabase } from "@/lib/supabase-server"

export const runtime = "nodejs"

const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "user"]),
})

function safeString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function isMissingColumnError(message: string) {
  const normalized = message.trim().toLowerCase()
  return (
    (normalized.includes("column") && normalized.includes("does not exist")) ||
    (normalized.includes("could not find") && normalized.includes("column") && normalized.includes("schema cache")) ||
    (normalized.includes("schema cache") && normalized.includes("column"))
  )
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const url = new URL(request.url)
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 })
  }

  const q = safeString(parsed.data.q).trim()
  const limit = parsed.data.limit ?? 50

  const selectWithEmail = "id,full_name,email,phone,role,created_at,updated_at"
  const selectWithoutEmail = "id,full_name,phone,role,created_at,updated_at"

  const uuidParsed = q ? z.string().uuid().safeParse(q) : null

  let queryWithEmail = supabase.from("profiles").select(selectWithEmail).limit(limit)
  if (q) {
    queryWithEmail = uuidParsed?.success
      ? queryWithEmail.eq("id", uuidParsed.data)
      : queryWithEmail.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`)
  }

  const attemptWithEmail = await queryWithEmail
  const emailColumnAvailable = !attemptWithEmail.error

  const attemptWithoutEmail = emailColumnAvailable
    ? null
    : attemptWithEmail.error && isMissingColumnError(attemptWithEmail.error.message)
      ? await (async () => {
          let queryWithoutEmail = supabase.from("profiles").select(selectWithoutEmail).limit(limit)
          if (q) {
            queryWithoutEmail = uuidParsed?.success
              ? queryWithoutEmail.eq("id", uuidParsed.data)
              : queryWithoutEmail.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
          }
          return await queryWithoutEmail
        })()
      : null

  const result = emailColumnAvailable ? attemptWithEmail : attemptWithoutEmail ?? attemptWithEmail
  const { data, error } = result
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const customers = rows.map((record) => {
    return {
      id: safeString(record["id"]),
      fullName: safeString(record["full_name"]),
      email: safeString(record["email"]),
      phone: safeString(record["phone"]),
      role: safeString(record["role"]) || "user",
      createdAt: safeString(record["created_at"]) || null,
      updatedAt: safeString(record["updated_at"]) || null,
    }
  })

  // Fallback: if profiles.email isn't available or not filled, fetch from auth users (admin API).
  const missingEmailIds = customers.filter((customer) => !customer.email).map((customer) => customer.id)
  if (missingEmailIds.length > 0) {
    const results = await Promise.all(
      missingEmailIds.map(async (id) => {
        const { data, error: userError } = await supabase.auth.admin.getUserById(id)
        return { id, email: userError ? "" : safeString(data.user?.email).trim() }
      })
    )
    const emailById = new Map(results.filter((item) => item.email).map((item) => [item.id, item.email] as const))
    for (const customer of customers) {
      if (!customer.email) {
        customer.email = emailById.get(customer.id) ?? ""
      }
    }
  }

  return NextResponse.json({ customers })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  const { userId, role } = parsed.data
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
