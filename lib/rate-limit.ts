import "server-only"

type RateLimitRule = {
  max: number
  windowMs: number
}

type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

type MemoryRateLimitEntry = {
  count: number
  resetAt: number
}

declare global {
  // eslint-disable-next-line no-var
  var __CANDRAS_RATE_LIMIT_STORE__: Map<string, MemoryRateLimitEntry> | undefined
}

function getMemoryStore() {
  if (!global.__CANDRAS_RATE_LIMIT_STORE__) {
    global.__CANDRAS_RATE_LIMIT_STORE__ = new Map<string, MemoryRateLimitEntry>()
  }
  return global.__CANDRAS_RATE_LIMIT_STORE__
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

async function runUpstashPipeline(commands: string[][]) {
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
    body: JSON.stringify(commands),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Upstash pipeline failed with status ${response.status}`)
  }

  return (await response.json()) as Array<{ result?: unknown; error?: string }>
}

function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  return "unknown"
}

function cleanupExpiredMemory(now: number) {
  const store = getMemoryStore()
  if (store.size < 1000) {
    return
  }

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key)
    }
  }
}

function enforceMemoryRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now()
  cleanupExpiredMemory(now)

  const store = getMemoryStore()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + rule.windowMs,
    })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (existing.count >= rule.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  store.set(key, {
    ...existing,
    count: existing.count + 1,
  })

  return { allowed: true, retryAfterSeconds: 0 }
}

async function enforceUpstashRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(rule.windowMs / 1000))
  const windowBucket = Math.floor(Date.now() / rule.windowMs)
  const redisKey = `rl:${key}:${windowBucket}`

  const results = await runUpstashPipeline([
    ["INCR", redisKey],
    ["EXPIRE", redisKey, String(windowSeconds)],
    ["TTL", redisKey],
  ])

  const countResult = results[0]
  if (countResult?.error) {
    throw new Error(countResult.error)
  }

  const ttlResult = results[2]
  if (ttlResult?.error) {
    throw new Error(ttlResult.error)
  }

  const count = Number(countResult?.result ?? 0)
  const ttl = Number(ttlResult?.result ?? windowSeconds)

  if (!Number.isFinite(count) || count <= 0) {
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (count > rule.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Number.isFinite(ttl) ? ttl : windowSeconds),
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

export async function enforceRateLimit(
  request: Request,
  key: string,
  rule: RateLimitRule
): Promise<RateLimitResult> {
  const ip = extractClientIp(request)
  const scopedKey = `${key}:${ip}`
  const upstashConfig = getUpstashConfig()

  if (upstashConfig) {
    try {
      return await enforceUpstashRateLimit(scopedKey, rule)
    } catch (error) {
      console.error("Upstash rate-limit fallback to memory:", error instanceof Error ? error.message : "Unknown")
      if (process.env.NODE_ENV === "production") {
        // Fail closed on production if external limiter is expected but unavailable.
        return { allowed: false, retryAfterSeconds: 60 }
      }
    }
  }

  if (process.env.NODE_ENV === "production") {
    // Do not silently fall back to in-memory limiter in production deployments.
    console.error("Rate-limit misconfiguration: UPSTASH_REDIS_REST_URL/TOKEN are required in production.")
    return { allowed: false, retryAfterSeconds: 60 }
  }

  return enforceMemoryRateLimit(scopedKey, rule)
}
