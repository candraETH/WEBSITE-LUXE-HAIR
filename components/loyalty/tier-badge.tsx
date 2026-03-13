import { cn } from "@/lib/utils"
import type { LoyaltyTierKey } from "@/lib/loyalty-tier"

type Props = {
  tier: LoyaltyTierKey
  label: string
  className?: string
}

const STYLES: Record<
  LoyaltyTierKey,
  {
    wrap: string
    text: string
    nameText: string
  }
> = {
  bronze: {
    wrap:
      "bg-[linear-gradient(135deg,rgba(255,255,255,0.85)_0%,rgba(243,199,166,0.7)_25%,rgba(205,127,50,0.65)_55%,rgba(138,78,26,0.6)_100%)] ring-orange-200/70 shadow-[0_10px_30px_rgba(205,127,50,0.15)]",
    text: "bg-[linear-gradient(135deg,#8A4E1A_0%,#CD7F32_45%,#F3C7A6_100%)]",
    nameText: "bg-[linear-gradient(135deg,#8A4E1A_0%,#CD7F32_45%,#F3C7A6_100%)]",
  },
  silver: {
    wrap:
      "bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(226,232,240,0.8)_45%,rgba(148,163,184,0.55)_100%)] ring-slate-300/40 shadow-[0_10px_30px_rgba(148,163,184,0.12)]",
    text: "bg-[linear-gradient(135deg,#0F172A_0%,#64748B_45%,#CBD5E1_100%)]",
    nameText: "bg-[linear-gradient(135deg,#0F172A_0%,#64748B_45%,#CBD5E1_100%)]",
  },
  gold: {
    wrap:
      "bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(255,243,196,0.75)_28%,rgba(212,175,55,0.65)_62%,rgba(122,90,0,0.6)_100%)] ring-amber-200/70 shadow-[0_10px_30px_rgba(212,175,55,0.16)]",
    text: "bg-[linear-gradient(135deg,#7A5A00_0%,#D4AF37_50%,#FFF3C4_100%)]",
    nameText: "bg-[linear-gradient(135deg,#7A5A00_0%,#D4AF37_50%,#FFF3C4_100%)]",
  },
  diamond: {
    wrap:
      "bg-[linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(236,254,255,0.75)_35%,rgba(56,189,248,0.55)_70%,rgba(14,165,233,0.45)_100%)] ring-sky-200/70 shadow-[0_10px_30px_rgba(56,189,248,0.14)]",
    text: "bg-[linear-gradient(135deg,#0B4C7D_0%,#0EA5E9_50%,#ECFEFF_100%)]",
    nameText: "bg-[linear-gradient(135deg,#0B4C7D_0%,#0EA5E9_50%,#ECFEFF_100%)]",
  },
  vip: {
    wrap:
      "bg-[linear-gradient(135deg,rgba(10,10,14,0.95)_0%,rgba(21,21,29,0.92)_40%,rgba(212,175,55,0.28)_100%)] ring-zinc-950/15 shadow-[0_10px_30px_rgba(212,175,55,0.18)]",
    text: "bg-[linear-gradient(135deg,#F7E7A3_0%,#D4AF37_55%,#FFF3C4_100%)]",
    nameText: "bg-[linear-gradient(135deg,#F7E7A3_0%,#D4AF37_55%,#FFF3C4_100%)]",
  },
}

export function getTierNameGradientClass(tier: LoyaltyTierKey) {
  const style = STYLES[tier]
  return cn("bg-clip-text text-transparent", style.nameText)
}

export function TierBadge({ tier, label, className }: Props) {
  const style = STYLES[tier]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset backdrop-blur-sm",
        style.wrap,
        className,
      )}
    >
      <span className={cn("bg-clip-text text-transparent", style.text)}>{label}</span>
    </span>
  )
}

