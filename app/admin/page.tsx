import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AdminDashboardClient } from "./dashboard-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin",
  description: "Admin area.",
  path: "/admin",
  keywords: ["admin", "dashboard", "candra's hair"],
})

export default function AdminPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Overview</p>
      </div>
      <AdminDashboardClient />
    </section>
  )
}
