import type { Metadata } from "next"
import { buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Maintenance",
  description: "CANDRA'S HAIR is temporarily under maintenance. Please check back soon.",
  path: "/maintenance",
  noIndex: true,
})

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-[#f6f3ef] px-6 py-10">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-2xl border border-[#d9c9a7] bg-white p-8 text-center shadow-sm sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b1872e]">Candras Hair</p>
          <h1 className="mt-5 font-serif text-3xl font-semibold text-[#151515] sm:text-4xl">
            Website is under maintenance
          </h1>
          <p className="mt-4 text-base text-[#555]">We&apos;ll be back soon.</p>
        </section>
      </div>
    </main>
  )
}
