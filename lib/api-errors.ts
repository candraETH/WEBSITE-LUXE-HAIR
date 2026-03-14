import "server-only"

import { logError } from "@/lib/observability"

export function publicErrorMessage(error: unknown, fallback: string) {
  if (process.env.NODE_ENV === "production") {
    return fallback
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === "string" && error.trim()) {
    return error.trim()
  }
  return fallback
}

export function logServerError(context: string, error: unknown) {
  logError("server_error", error, { context })
}
