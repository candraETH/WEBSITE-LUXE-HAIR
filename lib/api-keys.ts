import "server-only"

import { createHash, randomBytes } from "crypto"
import { supabase } from "@/lib/supabase-server"

export const API_KEY_PREFIX = "candra_live_"
export const API_KEY_HEADER = "x-api-key"
export const API_KEY_RATE_LIMIT_DEFAULT = 120

export type ApiKeyRecord = {
  id: string
  name: string
  key_hash: string
  key_prefix: string
  created_by: string | null
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
  permissions: string[]
  rate_limit_per_min: number
  created_at: string
  updated_at: string
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey.trim()).digest("hex")
}

export function generateRawApiKey(): string {
  // 32 bytes = 64 hex chars
  const random = randomBytes(32).toString("hex")
  return `${API_KEY_PREFIX}${random}`
}

export function getKeyPrefix(rawKey: string): string {
  // Show first 16 chars for identification: candra_live_ab12...
  const trimmed = rawKey.trim()
  return trimmed.slice(0, 20)
}

export function extractApiKey(request: Request): string | null {
  // Priority: x-api-key header -> Authorization Bearer -> query ?api_key / ?apikey
  const xApiKey = request.headers.get(API_KEY_HEADER)?.trim() || request.headers.get("X-API-Key")?.trim()
  if (xApiKey) return xApiKey

  const auth = request.headers.get("authorization")?.trim() ?? ""
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim()
    if (token.startsWith(API_KEY_PREFIX)) return token
    // Do not return non-api-key bearer tokens (supabase JWT) to avoid confusion
  }

  try {
    const url = new URL(request.url)
    const qp = url.searchParams.get("api_key")?.trim() || url.searchParams.get("apikey")?.trim() || url.searchParams.get("key")?.trim()
    if (qp) return qp
  } catch {
    // ignore
  }

  return null
}

export type ValidateApiKeyResult =
  | { ok: true; record: ApiKeyRecord }
  | { ok: false; status: 401 | 403 | 429; message: string }

export async function validateApiKey(request: Request): Promise<ValidateApiKeyResult> {
  const rawKey = extractApiKey(request)
  if (!rawKey) {
    return { ok: false, status: 401, message: "Missing API key. Provide X-API-Key header or ?api_key query." }
  }

  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    return { ok: false, status: 401, message: "Invalid API key format." }
  }

  const hash = hashApiKey(rawKey)

  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .maybeSingle()

  if (error) {
    return { ok: false, status: 401, message: "Unable to validate API key." }
  }

  if (!data) {
    return { ok: false, status: 401, message: "Invalid API key." }
  }

  const record = data as ApiKeyRecord

  if (!record.is_active) {
    return { ok: false, status: 403, message: "API key is revoked/disabled." }
  }

  if (record.expires_at) {
    const exp = new Date(record.expires_at).getTime()
    if (Number.isFinite(exp) && exp < Date.now()) {
      return { ok: false, status: 403, message: "API key has expired." }
    }
  }

  // Fire-and-forget last_used_at update (don't block response)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", record.id)
    .then(() => {})

  return { ok: true, record }
}

export function buildCorsHeaders(origin: string | null) {
  // Allow any origin for API v1 if key is valid; else reflect request origin if present
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    "Access-Control-Max-Age": "86400",
  }
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  } else {
    headers["Access-Control-Allow-Origin"] = "*"
  }
  // Allow credentials false when * origin; if origin reflected, can allow headers
  return headers
}
