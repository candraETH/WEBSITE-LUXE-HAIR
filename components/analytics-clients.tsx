"use client"

import dynamic from "next/dynamic"

const AnalyticsSessionTracker = dynamic(
  () => import("@/components/analytics-session-tracker").then((mod) => mod.AnalyticsSessionTracker),
  { ssr: false, loading: () => null }
)
const AnalyticsClient = dynamic(() => import("@vercel/analytics/react").then((mod) => mod.Analytics), {
  ssr: false,
  loading: () => null,
})
const SpeedInsightsClient = dynamic(
  () => import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights),
  { ssr: false, loading: () => null }
)

export function AnalyticsClients() {
  return (
    <>
      <AnalyticsSessionTracker />
      <AnalyticsClient />
      <SpeedInsightsClient />
    </>
  )
}
