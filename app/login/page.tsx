import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { AuthPageRedirect } from "@/components/auth-page-redirect"
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

async function readSearchParam(props: LoginPageProps, key: string): Promise<string | undefined> {
  const searchParams = (await props.searchParams) ?? {}
  const value = searchParams[key]
  return typeof value === "string" ? value : undefined
}

export default async function LoginPage(props: LoginPageProps) {
  const nextPath = await readSearchParam(props, "next")
  const returnTo = await readSearchParam(props, "returnTo")
  const locale = await getLocaleFromRequestHeaders()

  return (
    <main className="min-h-screen overflow-x-hidden bg-background pt-[102px] lg:pt-[108px]">
      <Navbar />
      <AuthPageRedirect nextPath={nextPath} returnTo={returnTo} />

      <section className="mx-auto flex w-full max-w-[560px] flex-col items-stretch px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-6 text-center sm:mb-8">
          <p className="font-serif text-3xl font-semibold uppercase tracking-[0.38em] text-foreground sm:text-[2.15rem]">
            CANDRA&apos;S HAIR
          </p>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-[2.1rem]">
            {locale === "ru" ? "Войти" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {locale === "ru"
              ? "Войдите в аккаунт или создайте новый."
              : "Sign in or create an account"}
          </p>
        </div>
        <LoginForm nextPath={nextPath} returnTo={returnTo} />
      </section>

      <Footer />
    </main>
  )
}
