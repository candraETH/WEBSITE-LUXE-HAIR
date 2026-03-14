import "server-only"

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

function redactString(value: string): string {
  let next = value
  // Emails
  next = next.replaceAll(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    "[REDACTED_EMAIL]"
  )
  // Phone-like sequences (+62..., +1..., etc.)
  next = next.replaceAll(
    /(?:\+?\d[\d\s().-]{7,}\d)/g,
    "[REDACTED_PHONE]"
  )
  // Very long tokens (JWTs, API keys, etc.)
  next = next.replaceAll(
    /\beyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9._-]{10,}\.[a-zA-Z0-9._-]{10,}\b/g,
    "[REDACTED_JWT]"
  )
  next = next.replaceAll(
    /\b[A-Za-z0-9_\/+=-]{48,}\b/g,
    "[REDACTED_TOKEN]"
  )
  return next
}

function sanitizeJson(value: unknown): JsonValue {
  if (value == null) return null
  if (typeof value === "string") return redactString(value)
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "boolean") return value
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item))
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const out: Record<string, JsonValue> = {}
    for (const [key, entry] of Object.entries(record)) {
      out[key] = sanitizeJson(entry)
    }
    return out
  }
  return String(value)
}

function nowIso() {
  return new Date().toISOString()
}

type LogLevel = "info" | "warn" | "error"

export function logEvent(
  level: LogLevel,
  event: string,
  meta?: Record<string, unknown>
) {
  const payload = {
    ts: nowIso(),
    level,
    event,
    env: process.env.NODE_ENV ?? "unknown",
    ...(meta ? (sanitizeJson(meta) as Record<string, JsonValue>) : {}),
  }

  const line = JSON.stringify(payload)
  if (level === "error") {
    console.error(line)
    return
  }
  if (level === "warn") {
    console.warn(line)
    return
  }
  console.log(line)
}

export function logError(
  event: string,
  error: unknown,
  meta?: Record<string, unknown>
) {
  const err =
    error instanceof Error
      ? {
          name: error.name,
          message: process.env.NODE_ENV === "production" ? "error" : error.message,
        }
      : { name: "Error", message: process.env.NODE_ENV === "production" ? "error" : String(error) }

  logEvent("error", event, { ...meta, error: err })
}

export function redactOrderId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const compact = trimmed.replace(/[^A-Z0-9]/gi, "").toUpperCase()
  const suffix = compact.slice(-6)
  return suffix ? `...${suffix}` : ""
}

