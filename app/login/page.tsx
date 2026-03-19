import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { LoginForm } from "./login-form"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Войти" : "Login"
  const description =
    locale === "ru" ? "Войдите в аккаунт Candra's Hair." : "Login to your Candra's Hair account."

  return buildLocalizedPageMetadata({
    title,
    description,
    keywords: ["login", "account", "candra's hair"],
  })
}

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>
}

function readSearchParam(props: LoginPageProps, key: string): string | undefined {
  const value = props.searchParams?.[key]
  return typeof value === "string" ? value : undefined
}

export default async function LoginPage(props: LoginPageProps) {
  const nextPath = readSearchParam(props, "next")
  const returnTo = readSearchParam(props, "returnTo")
  const locale = await getLocaleFromRequestHeaders()

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto w-full max-w-md px-6 py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">
          {locale === "ru" ? "\u0410\u043a\u043a\u0430\u0443\u043d\u0442" : "Account"}
        </p>
        <h1 className="mb-2 font-serif text-4xl font-bold text-foreground lg:text-5xl">
          {locale === "ru" ? "\u0412\u043e\u0439\u0442\u0438" : "Login"}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {locale === "ru"
            ? "\u0412\u043e\u0439\u0434\u0438\u0442\u0435, \u0447\u0442\u043e\u0431\u044b \u0443\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u043e\u043c \u0438 \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u043f\u043e\u043a\u0443\u043f\u043a\u0438."
            : "Sign in to manage your account and continue shopping."}
        </p>

        <LoginForm nextPath={nextPath} returnTo={returnTo} />
      </section>

      <Footer />
    </main>
  )
}
