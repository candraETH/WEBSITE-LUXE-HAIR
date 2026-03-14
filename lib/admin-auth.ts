import "server-only"

import { supabase } from "@/lib/supabase-server"
import { logServerError, publicErrorMessage } from "@/lib/api-errors"

export type AdminAuthOk = {
  ok: true
  userId: string
  email: string
}

export type AdminAuthError = {
  ok: false
  status: 401 | 403 | 500
  message: string
}

export type AdminAuthResult = AdminAuthOk | AdminAuthError

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? ""
  if (!header.toLowerCase().startsWith("bearer ")) {
    return null
  }
  const token = header.slice(7).trim()
  return token || null
}

function isAdminRole(value: unknown) {
  return typeof value === "string" && value.trim().toLowerCase() === "admin"
}

export async function requireAdmin(request: Request): Promise<AdminAuthResult> {
  const token = getBearerToken(request)
  if (!token) {
    return { ok: false, status: 401, message: "Unauthorized" }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const user = userData?.user ?? null
  if (userError || !user) {
    return { ok: false, status: 401, message: "Unauthorized" }
  }

  const email = (user.email ?? "").trim()
  const userId = user.id

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      logServerError("requireAdmin: failed to load profile role", profileError)
      return { ok: false, status: 500, message: publicErrorMessage(profileError, "Unable to authorize") }
    }

    const hasProfilesAdmin = isAdminRole((profile as { role?: unknown } | null)?.role)
    if (!hasProfilesAdmin) {
      return { ok: false, status: 403, message: "Forbidden" }
    }

    return { ok: true, userId, email }
  } catch (error) {
    logServerError("requireAdmin: unexpected error", error)
    return { ok: false, status: 500, message: publicErrorMessage(error, "Unable to authorize") }
  }
}
