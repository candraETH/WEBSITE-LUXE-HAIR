import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Политика возврата" : "Return Policy"
  const description =
    locale === "ru"
      ? "Ознакомьтесь с политикой возврата CANDRA'S HAIR: сроки, условия, исключения для индивидуальных заказов и контакты поддержки."
      : "Read CANDRA'S HAIR return policy, including return window, eligibility, non-returnable custom orders, and support contact details."

  return buildLocalizedPageMetadata({
    title,
    description,
    keywords: ["return policy", "hair extensions return", "wig return policy"],
  })
}

export default async function ReturnPolicyPage() {
  const locale = await getLocaleFromRequestHeaders()
  const copy = locale === "ru"
    ? {
        eyebrow: "Политика",
        title: "Политика возврата",
        lead: "Мы делаем процесс возврата простым и понятным.",
        items: [
          "1. Возвраты принимаются в течение 7 дней после получения заказа.",
          "2. Волосы должны быть неиспользованными, не мытыми и в оригинальной упаковке.",
          "3. Заказы с индивидуальным окрашиванием или изготовлением не подлежат возврату.",
          "4. Чтобы оформить возврат, свяжитесь с нами: support@candrashair.com.",
        ],
      }
    : {
        eyebrow: "Policy",
        title: "Return Policy",
        lead: "We keep our return process simple and clear.",
        items: [
          "1. Returns are accepted within 7 days after your order is received.",
          "2. Hair must be unused, unwashed, and in original packaging.",
          "3. Custom-colored or custom-made orders are non-returnable.",
          "4. To request a return, contact us at support@candrashair.com.",
        ],
      }
  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">{copy.eyebrow}</p>
        <h1 className="mb-4 font-serif text-4xl font-bold text-foreground lg:text-5xl">{copy.title}</h1>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          {copy.lead}
        </p>

        <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            {copy.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  )
}
