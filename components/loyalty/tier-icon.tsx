import { useId } from "react"
import { cn } from "@/lib/utils"
import type { LoyaltyTierKey } from "@/lib/loyalty-tier"

type Props = {
  tier: LoyaltyTierKey
  className?: string
}

function TierIconSvg({ tier, className }: Props) {
  const gradientId = useId()
  const filterId = useId()

  const colors = (() => {
    switch (tier) {
      case "bronze":
        return { a: "#F3C7A6", b: "#CD7F32", c: "#8A4E1A" }
      case "silver":
        return { a: "#F8FAFC", b: "#CBD5E1", c: "#64748B" }
      case "gold":
        return { a: "#FFF3C4", b: "#D4AF37", c: "#7A5A00" }
      case "diamond":
        return { a: "#ECFEFF", b: "#38BDF8", c: "#0EA5E9" }
      case "vip":
        return { a: "#F7E7A3", b: "#D4AF37", c: "#0B0B0F" }
      default:
        return { a: "#E2E8F0", b: "#94A3B8", c: "#475569" }
    }
  })()

  const common = {
    fill: `url(#${gradientId})`,
    stroke: colors.c,
    strokeWidth: 1.35,
  }

  return (
    <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.a} />
          <stop offset="55%" stopColor={colors.b} />
          <stop offset="100%" stopColor={colors.c} />
        </linearGradient>

        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.6" floodColor={colors.c} floodOpacity="0.18" />
          <feDropShadow dx="0" dy="2" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.10" />
        </filter>
      </defs>

      <g filter={`url(#${filterId})`}>
        {tier === "bronze" ? (
          <>
          <path
            d="M8 3h8l-1.2 5.2a5 5 0 1 1-5.6 0L8 3Z"
            {...common}
            strokeLinejoin="round"
          />
          <path d="M9 3 7 6.5l3 2" fill="none" stroke={colors.c} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M15 3l2 3.5-3 2" fill="none" stroke={colors.c} strokeWidth="1.2" strokeLinecap="round" />
            <path
              d="M9 5.1h6.2"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.55"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {tier === "silver" ? (
          <>
          <path
            d="M12 2 20 5v6c0 6-4 9-8 11C8 20 4 17 4 11V5l8-3Z"
            {...common}
            strokeLinejoin="round"
          />
          <path
            d="M8 12l2.2 2.2L16 8.6"
            fill="none"
            stroke={colors.c}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
            <path
              d="M7.2 6.2 12 4.4 16.8 6.2"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.5"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}

        {tier === "gold" ? (
          <>
          <path
            d="M6.5 7.5 9 4l3 3 3-3 2.5 3.5V11a6.5 6.5 0 0 1-13 0V7.5Z"
            {...common}
            strokeLinejoin="round"
          />
          <path d="M8 13h8" fill="none" stroke={colors.c} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M9 16h6" fill="none" stroke={colors.c} strokeWidth="1.3" strokeLinecap="round" />
            <path
              d="M8 7.3h8"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.52"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {tier === "diamond" ? (
          <>
          <path d="M12 2 20 9l-8 13L4 9 12 2Z" {...common} strokeLinejoin="round" />
          <path d="M4 9h16" fill="none" stroke={colors.c} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M12 2 9 9l3 13 3-13-3-7Z" fill="none" stroke={colors.c} strokeWidth="1.1" strokeLinejoin="round" />
            <path
              d="M9.2 4.9 12 2.7 14.8 4.9"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.5"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}

        {tier === "vip" ? (
          <>
          <path
            d="M6.5 8.2 9 5l3 3 3-3 2.5 3.2V11c0 3.9-3.1 7.7-5.5 9.4-.7.5-1.3.5-2 0C9.6 18.7 6.5 14.9 6.5 11V8.2Z"
            {...common}
            strokeLinejoin="round"
          />
          <path
            d="M12 9.2l1.1 2.2 2.4.4-1.8 1.7.4 2.4-2.1-1.1-2.1 1.1.4-2.4-1.8-1.7 2.4-.4L12 9.2Z"
            fill={colors.a}
            stroke={colors.c}
            strokeWidth="1"
            strokeLinejoin="round"
          />
            <path
              d="M8.2 7.6 12 5.8 15.8 7.6"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}
      </g>
    </svg>
  )
}

export function TierIcon(props: Props) {
  return <TierIconSvg {...props} />
}
