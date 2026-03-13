import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AccountShell } from "@/components/account-shell"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Account</p>
        <h1 className="mb-2 font-serif text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">My account</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground sm:mb-8">
          Manage your profile, orders, address book, wishlist, and settings.
        </p>

        <AccountShell>{children}</AccountShell>
      </section>

      <Footer />
    </main>
  )
}
