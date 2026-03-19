export function formatVariantDisplay(variant?: string): string {
  const trimmed = (variant ?? "").trim()
  if (!trimmed) {
    return ""
  }

  const normalized = trimmed.toLowerCase()
  if (normalized === "default") {
    return ""
  }

  if (normalized === "#ash" || normalized === "ash" || normalized === "#grey" || normalized === "grey") {
    return "grey #grey"
  }

  return trimmed
}

