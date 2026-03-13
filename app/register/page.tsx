import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { buildPageMetadata } from "@/lib/seo"
import { RegisterForm } from "./register-form"

export const metadata: Metadata = buildPageMetadata({
  title: "Register",
  description: "Create a Candra's Hair account.",
  path: "/register",
  keywords: ["register", "signup", "account", "candra's hair"],
})

type RegisterPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function readSearchParam(props: RegisterPageProps, key: string): string | undefined {
  const value = props.searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

export default function RegisterPage(props: RegisterPageProps) {
  const nextPath = readSearchParam(props, "next")
  const returnTo = readSearchParam(props, "returnTo")

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto w-full max-w-md px-6 py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Account</p>
        <h1 className="mb-2 font-serif text-4xl font-bold text-foreground lg:text-5xl">Register</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Create an account to save your details and check out faster.
        </p>

        <RegisterForm nextPath={nextPath} returnTo={returnTo} />
      </section>

      <Footer />
    </main>
  )
}
