import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { RegisterForm } from "./register-form"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Регистрация" : "Register"
  const description = locale === "ru" ? "Создайте аккаунт Candra's Hair." : "Create a Candra's Hair account."

  return buildLocalizedPageMetadata({
    title,
    description,
    keywords: ["register", "signup", "account", "candra's hair"],
  })
}

type RegisterPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

async function readSearchParam(props: RegisterPageProps, key: string): Promise<string | undefined> {
  const searchParams = (await props.searchParams) ?? {}
  const value = searchParams[key]
  return typeof value === "string" ? value : undefined
}

export default async function RegisterPage(props: RegisterPageProps) {
  const nextPath = await readSearchParam(props, "next")
  const returnTo = await readSearchParam(props, "returnTo")
  const locale = await getLocaleFromRequestHeaders()

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto w-full max-w-md px-6 py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">
          {locale === "ru" ? "\u0410\u043a\u043a\u0430\u0443\u043d\u0442" : "Account"}
        </p>
        <h1 className="mb-2 font-serif text-4xl font-bold text-foreground lg:text-5xl">
          {locale === "ru" ? "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f" : "Register"}
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {locale === "ru"
            ? "\u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435 \u0438 \u043e\u0444\u043e\u0440\u043c\u043b\u044f\u0442\u044c \u0437\u0430\u043a\u0430\u0437\u044b \u0431\u044b\u0441\u0442\u0440\u0435\u0435."
            : "Create an account to save your details and check out faster."}
        </p>

        <RegisterForm nextPath={nextPath} returnTo={returnTo} />
      </section>

      <Footer />
    </main>
  )
}
