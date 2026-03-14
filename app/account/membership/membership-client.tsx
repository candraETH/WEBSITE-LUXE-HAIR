"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { TierIcon } from "@/components/loyalty/tier-icon"
import { TierBadge } from "@/components/loyalty/tier-badge"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { getTierProgress, LOYALTY_TIERS, type LoyaltyTierKey } from "@/lib/loyalty-tier"

type LoyaltyState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; totalSpent: number; totalPoints: number; currency: string }

function formatPoints(value: number) {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0)
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(safeValue)
  } catch {
    return String(safeValue)
  }
}

function formatPointsLabel(value: number) {
  return `${formatPoints(value)} pts`
}

export function MembershipClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<LoyaltyState>({ status: "loading" })

  const tierPerks = useMemo(() => {
    const perks: Record<
      LoyaltyTierKey,
      {
        discountPct: number
        headline: string
        details: string
      }
    > = {
      bronze: {
        discountPct: 0,
        headline: "Start earning points",
        details: "Bronze members are not eligible for a member discount yet.",
      },
      silver: {
        discountPct: 3,
        headline: "Member discount unlocked",
        details: "Save 3% on eligible items as you continue leveling up.",
      },
      gold: {
        discountPct: 5,
        headline: "Better savings",
        details: "Gold members enjoy 5% off eligible purchases.",
      },
      diamond: {
        discountPct: 7,
        headline: "Premium perks",
        details: "Diamond members get 7% off plus a more exclusive experience.",
      },
      vip: {
        discountPct: 10,
        headline: "Top tier benefits",
        details: "Exclusive VIP members receive 10% off and priority support.",
      },
    }

    return perks
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }

    const client = supabase

    async function load() {
      const { data: sessionData } = await client.auth.getSession()
      if (cancelled) return

      const token = sessionData.session?.access_token ?? ""
      if (!token) {
        setState({ status: "signed_out" })
        return
      }

      setState({ status: "loading" })
      const response = await fetch("/api/account/loyalty", {
        headers: { authorization: `Bearer ${token}` },
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        totalSpent?: number
        totalPoints?: number
        currency?: string
      }

      if (cancelled) return

      if (!response.ok) {
        setState({ status: "error", message: payload.error || "Unable to load membership tier." })
        return
      }

      setState({
        status: "ready",
        totalSpent: typeof payload.totalSpent === "number" ? payload.totalSpent : Number(payload.totalSpent ?? 0),
        totalPoints:
          typeof payload.totalPoints === "number"
            ? payload.totalPoints
            : Math.max(0, Math.floor(typeof payload.totalSpent === "number" ? payload.totalSpent : Number(payload.totalSpent ?? 0))),
        currency: payload.currency || "USD",
      })
    }

    void load()
    const { data: subscription } = client.auth.onAuthStateChange(() => void load())
    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Membership tier</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your tier is based on loyalty points earned from paid orders.</p>
      </div>

      {state.status === "loading" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/30 bg-card/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-52" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="mt-4 h-2.5 w-full" />
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/60 p-5 shadow-sm">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-4 w-72" />
            <Skeleton className="mt-4 h-2.5 w-full" />
          </div>

          <div className="grid snap-x snap-mandatory grid-flow-col auto-cols-[minmax(170px,170px)] gap-3 overflow-x-auto pb-2 sm:snap-none sm:grid-flow-row sm:auto-cols-auto sm:overflow-visible sm:pb-0 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="relative w-[170px] shrink-0 snap-start rounded-2xl border border-border/25 bg-background/40 px-3 pb-3 pt-6 sm:w-auto sm:shrink sm:snap-none"
              >
                <Skeleton className="mx-auto h-10 w-10 rounded-full" />
                <Skeleton className="mx-auto mt-3 h-4 w-20" />
              </div>
            ))}
          </div>

          <Skeleton className="h-7 w-44" />
        </div>
      ) : state.status === "signed_out" ? (
        <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
          You are not signed in.{" "}
          <Link href="/login?next=%2Faccount%2Fmembership" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </div>
      ) : state.status === "error" ? (
        <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-destructive">{state.message}</div>
      ) : (
        (() => {
          const progress = getTierProgress(state.totalPoints)
          const current = progress.currentTier
          const next = progress.nextTier
          const percent = Math.round(progress.progress * 100)
          const remaining = progress.remainingToNext

          return (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-2xl border border-border/30 bg-background/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`grid h-12 w-12 place-items-center rounded-full ring-1 ${current.accent.ring} ${current.accent.iconWrap}`}>
                    <TierIcon tier={current.key} className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{current.name}</p>
                      <TierBadge tier={current.key} label={current.name} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Total points: <span className="font-semibold text-foreground">{formatPoints(state.totalPoints)}</span>
                    </p>
                  </div>
                </div>

                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Progress</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{next ? `${percent}% to ${next.name}` : "Max tier"}</p>
                </div>
              </div>

              {next ? (
                <div className="rounded-2xl border border-border/30 bg-background/40 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-foreground">Tier progress</p>
                    <p className="text-sm text-muted-foreground">
                      Earn <span className="font-semibold text-foreground">{formatPointsLabel(remaining)}</span> more to reach{" "}
                      <span className="font-semibold text-foreground">{next.name}</span>.
                    </p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Progress value={progress.progress * 100} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatPointsLabel(progress.rangeStart)}</span>
                      <span>{progress.rangeEndExclusive ? formatPointsLabel(progress.rangeEndExclusive) : ""}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/30 bg-background/40 p-5 text-sm text-muted-foreground">
                  You are at the highest tier. Thank you for being an Exclusive VIP customer.
                </div>
              )}

              <div className="grid snap-x snap-mandatory grid-flow-col auto-cols-[minmax(170px,170px)] gap-3 overflow-x-auto pb-2 sm:snap-none sm:grid-flow-row sm:auto-cols-auto sm:overflow-visible sm:pb-0 sm:grid-cols-3 lg:grid-cols-5">
                {LOYALTY_TIERS.map((tier) => {
                  const isActive = tier.key === current.key
                  const cardBase = "relative rounded-2xl border bg-background/40 text-center transition-colors"
                  const cardTone = isActive
                    ? "border-accent/35 bg-accent/5 shadow-sm ring-1 ring-accent/15"
                    : "border-border/25 hover:border-border/35"

                  return (
                    <div
                      key={tier.key}
                      className={`${cardBase} ${cardTone} w-[170px] shrink-0 snap-start px-3 pb-3 pt-6 sm:w-auto sm:shrink sm:snap-none`}
                    >
                      {isActive ? (
                        <Badge
                          className={`absolute left-1/2 top-3 -translate-x-1/2 px-2 py-0.5 text-[10px] ${tier.accent.badge}`}
                        >
                          Current
                        </Badge>
                      ) : null}

                      <div className={`mx-auto grid h-10 w-10 place-items-center rounded-full ring-1 ${tier.accent.ring} ${tier.accent.iconWrap}`}>
                        <TierIcon tier={tier.key} className="h-5 w-5" />
                      </div>

                      <p className="mt-3 text-[13px] font-semibold leading-snug text-foreground">{tier.name}</p>
                    </div>
                  )
                })}
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                    aria-label="Open terms and conditions"
                  >
                    Terms &amp; conditions
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Tier guide</DialogTitle>
                    <DialogDescription>Discount perks you unlock as you level up.</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {LOYALTY_TIERS.map((tier) => {
                      const perk = tierPerks[tier.key]
                      const discountLabel = perk.discountPct > 0 ? `${perk.discountPct}% OFF` : "No discount"

                      return (
                        <div key={tier.key} className="rounded-2xl border border-border/25 bg-background/60 p-4">
                          <div className="flex items-start gap-3">
                            <div className={`grid h-10 w-10 place-items-center rounded-full ring-1 ${tier.accent.ring} ${tier.accent.iconWrap}`}>
                              <TierIcon tier={tier.key} className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">{tier.name}</p>
                                  <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{perk.headline}</p>
                                </div>
                                <TierBadge tier={tier.key} label={discountLabel} className="shrink-0 px-2 py-0.5 text-[10px]" />
                              </div>
                              <p className="mt-3 text-sm text-muted-foreground">{perk.details}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Discounts apply to eligible items only and may exclude shipping, taxes, and promotional bundles.
                  </p>
                </DialogContent>
              </Dialog>

            </div>
          )
        })()
      )}
    </div>
  )
}
