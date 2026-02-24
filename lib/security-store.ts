import "server-only"

type MemoryEntry = {
  value: string
  expiresAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __CANDRAS_SECURITY_STORE__: Map<string, MemoryEntry> | undefined
}

function getMemoryStore() {
  if (!global.__CANDRAS_SECURITY_STORE__) {
    global.__CANDRAS_SECURITY_STORE__ = new Map<string, MemoryEntry>()
  }
  return global.__CANDRAS_SECURITY_STORE__
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) {
    return null
  }
  return {
    url: url.replace(/\/+$/, ""),
    token,
  }
}

function ensureMemoryFallbackAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Security store requires Upstash Redis in production.")
  }
}

async function upstashCommand(command: string[]) {
  const config = getUpstashConfig()
  if (!config) {
    throw new Error("Upstash Redis is not configured.")
  }

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([command]),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Upstash command failed with status ${response.status}`)
  }

  const parsed = (await response.json()) as Array<{ result?: unknown; error?: string }>
  const first = parsed?.[0]
  if (!first) {
    throw new Error("Upstash returned empty response.")
  }
  if (first.error) {
    throw new Error(first.error)
  }
  return first.result
}

function cleanupMemory(now: number) {
  const store = getMemoryStore()
  if (store.size < 1000) {
    return
  }

  for (const [key, value] of store.entries()) {
    if (value.expiresAt <= now) {
      store.delete(key)
    }
  }
}

export async function setSecurityStoreValue(key: string, value: unknown, ttlSeconds: number) {
  const payload = JSON.stringify(value)
  const safeTtl = Math.max(1, Math.floor(ttlSeconds))
  const upstash = getUpstashConfig()

  if (upstash) {
    await upstashCommand(["SETEX", key, String(safeTtl), payload])
    return
  }

  ensureMemoryFallbackAllowed()

  const now = Date.now()
  cleanupMemory(now)
  getMemoryStore().set(key, {
    value: payload,
    expiresAt: now + safeTtl * 1000,
  })
}

export async function getSecurityStoreValue<T>(key: string): Promise<T | null> {
  const upstash = getUpstashConfig()

  if (upstash) {
    const raw = await upstashCommand(["GET", key])
    if (typeof raw !== "string") {
      return null
    }
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  ensureMemoryFallbackAllowed()

  const now = Date.now()
  const entry = getMemoryStore().get(key)
  if (!entry) {
    return null
  }

  if (entry.expiresAt <= now) {
    getMemoryStore().delete(key)
    return null
  }

  try {
    return JSON.parse(entry.value) as T
  } catch {
    return null
  }
}

export async function deleteSecurityStoreValue(key: string) {
  const upstash = getUpstashConfig()

  if (upstash) {
    await upstashCommand(["DEL", key])
    return
  }

  ensureMemoryFallbackAllowed()

  getMemoryStore().delete(key)
}
