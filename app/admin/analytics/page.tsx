import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AdminAnalyticsClient } from "./analytics-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Analytics",
  description: "Analytics dashboard.",
  path: "/admin/analytics",
  keywords: ["admin", "analytics"],
})

export default function AdminAnalyticsPage() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Analytics</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Order status breakdown and quick insights.</p>
      </div>

      <AdminAnalyticsClient />
    </section>
  )
}

