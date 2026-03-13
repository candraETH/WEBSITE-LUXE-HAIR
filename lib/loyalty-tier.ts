export type LoyaltyTierKey = "bronze" | "silver" | "gold" | "diamond" | "vip"

export type LoyaltyTier = {
  key: LoyaltyTierKey
  name: string
  minSpend: number
  maxSpendExclusive: number | null
  accent: {
    ring: string
    badge: string
    iconWrap: string
  }
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    key: "bronze",
    name: "Bronze",
    minSpend: 0,
    maxSpendExclusive: 100,
    accent: {
      ring: "ring-orange-200/70 dark:ring-orange-500/15",
      badge: "border-0 bg-orange-50 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
      iconWrap: "bg-orange-50 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200",
    },
  },
  {
    key: "silver",
    name: "Silver",
    minSpend: 100,
    maxSpendExclusive: 1500,
    accent: {
      ring: "ring-slate-300/40 dark:ring-slate-200/10",
      badge: "border-0 bg-slate-100 text-slate-700 dark:bg-slate-200/10 dark:text-slate-200",
      iconWrap: "bg-slate-100 text-slate-700 dark:bg-slate-200/10 dark:text-slate-200",
    },
  },
  {
    key: "gold",
    name: "Gold",
    minSpend: 1500,
    maxSpendExclusive: 5000,
    accent: {
      ring: "ring-amber-200/70 dark:ring-amber-500/15",
      badge: "border-0 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
      iconWrap: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
    },
  },
  {
    key: "diamond",
    name: "Diamond",
    minSpend: 5000,
    maxSpendExclusive: 25000,
    accent: {
      ring: "ring-sky-200/70 dark:ring-sky-500/15",
      badge: "border-0 bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
      iconWrap: "bg-sky-50 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
    },
  },
  {
    key: "vip",
    name: "Exclusive VIP",
    minSpend: 25000,
    maxSpendExclusive: null,
    accent: {
      ring: "ring-zinc-950/15 dark:ring-amber-500/20",
      badge: "border-0 bg-zinc-950 text-amber-300 dark:bg-zinc-950 dark:text-amber-300",
      iconWrap: "bg-zinc-950 text-amber-300",
    },
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function getTierForSpend(totalSpend: number): LoyaltyTier {
  const spend = Number.isFinite(totalSpend) ? totalSpend : 0
  const sorted = LOYALTY_TIERS
  for (let idx = sorted.length - 1; idx >= 0; idx -= 1) {
    const tier = sorted[idx]
    if (spend >= tier.minSpend) {
      return tier
    }
  }
  return LOYALTY_TIERS[0]
}

export function getNextTier(currentTier: LoyaltyTier): LoyaltyTier | null {
  const idx = LOYALTY_TIERS.findIndex((tier) => tier.key === currentTier.key)
  if (idx < 0) return null
  return LOYALTY_TIERS[idx + 1] ?? null
}

export function getTierProgress(totalSpend: number) {
  const spend = Math.max(0, Number.isFinite(totalSpend) ? totalSpend : 0)
  const current = getTierForSpend(spend)
  const next = getNextTier(current)

  if (!next || current.maxSpendExclusive === null) {
    return {
      totalSpend: spend,
      currentTier: current,
      nextTier: null as LoyaltyTier | null,
      progress: 1,
      remainingToNext: 0,
      rangeStart: current.minSpend,
      rangeEndExclusive: null as number | null,
    }
  }

  const rangeStart = current.minSpend
  const rangeEndExclusive = current.maxSpendExclusive
  const denom = Math.max(1, rangeEndExclusive - rangeStart)
  const progress = clamp((spend - rangeStart) / denom, 0, 1)
  const remainingToNext = Math.max(0, next.minSpend - spend)

  return {
    totalSpend: spend,
    currentTier: current,
    nextTier: next,
    progress,
    remainingToNext,
    rangeStart,
    rangeEndExclusive,
  }
}
