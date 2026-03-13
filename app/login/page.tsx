import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { buildPageMetadata } from "@/lib/seo"
import { LoginForm } from "./login-form"

export const metadata: Metadata = buildPageMetadata({
  title: "Login",
  description: "Login to your Candra's Hair account.",
  path: "/login",
  keywords: ["login", "account", "candra's hair"],
})

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function readSearchParam(props: LoginPageProps, key: string): string | undefined {
  const value = props.searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

export default function LoginPage(props: LoginPageProps) {
  const nextPath = readSearchParam(props, "next")
  const returnTo = readSearchParam(props, "returnTo")

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto w-full max-w-md px-6 py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Account</p>
        <h1 className="mb-2 font-serif text-4xl font-bold text-foreground lg:text-5xl">Login</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Sign in to manage your account and continue shopping.
        </p>

        <LoginForm nextPath={nextPath} returnTo={returnTo} />
      </section>

      <Footer />
    </main>
  )
}
