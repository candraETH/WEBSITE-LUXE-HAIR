export type AppRole = "admin" | "user"

export function getAppRoleFromMetadata(metadata: unknown): AppRole {
  if (!metadata || typeof metadata !== "object") {
    return "user"
  }

  const record = metadata as Record<string, unknown>
  return record.role === "admin" ? "admin" : "user"
}

