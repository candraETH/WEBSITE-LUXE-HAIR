import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Return Policy",
  description:
    "Read CANDRA'S HAIR return policy, including return window, eligibility, non-returnable custom orders, and support contact details.",
  path: "/return-policy",
  keywords: ["return policy", "hair extensions return", "wig return policy"],
})

export default function ReturnPolicyPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Policy</p>
        <h1 className="mb-4 font-serif text-4xl font-bold text-foreground lg:text-5xl">Return Policy</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          We keep our return process simple and clear.
        </p>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li>1. Returns are accepted within 7 days after your order is received.</li>
            <li>2. Hair must be unused, unwashed, and in original packaging.</li>
            <li>3. Custom-colored or custom-made orders are non-returnable.</li>
            <li>4. To request a return, contact us at support@candrashair.com.</li>
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  )
}
