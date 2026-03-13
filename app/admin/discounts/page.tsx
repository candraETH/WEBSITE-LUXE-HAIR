import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"
import { AdminDiscountsClient } from "./discounts-client"

export const metadata: Metadata = buildPageMetadata({
  title: "Admin Discounts",
  description: "Discounts and promotions.",
  path: "/admin/discounts",
  keywords: ["admin", "discounts"],
})

export default function AdminDiscountsPage() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Discounts</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-foreground">Discounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage coupons and promotions.</p>
      </div>

      <AdminDiscountsClient />
    </section>
  )
}

