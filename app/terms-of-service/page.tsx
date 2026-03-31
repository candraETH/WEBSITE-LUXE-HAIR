import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Условия использования" : "Terms of Service"
  const description =
    locale === "ru"
      ? "Ознакомьтесь с условиями использования сайта CANDRA'S HAIR, включая заказы, оплату, доставку, возвраты и ответственность."
      : "Read the CANDRA'S HAIR Terms of Service covering orders, payment, shipping, returns, account use, and customer responsibilities."

  return buildLocalizedPageMetadata({
    title,
    description,
    keywords: ["terms of service", "terms and conditions", "hair store terms"],
  })
}

export default async function TermsOfServicePage() {
  const locale = await getLocaleFromRequestHeaders()
  const copy =
    locale === "ru"
      ? {
          eyebrow: "Условия",
          title: "Условия использования",
          lead:
            "Эти условия объясняют, как работает наш магазин, что ожидать от заказов и какие правила применяются к покупке товаров CANDRA'S HAIR.",
          sections: [
            {
              title: "1. Принятие условий",
              body: "Используя сайт или оформляя заказ, вы соглашаетесь с настоящими условиями, нашей политикой возврата и любыми дополнительными правилами, опубликованными на сайте.",
            },
            {
              title: "2. Товары и описание",
              body: "Мы стараемся точно описывать цвета, текстуры и характеристики волос, но небольшие различия могут возникать из-за освещения, партии товара или настроек экрана.",
            },
            {
              title: "3. Заказы и оплата",
              body: "Заказ считается подтвержденным после успешной оплаты или подтверждения со стороны нашей команды. Мы можем отменить подозрительные или ошибочные заказы.",
            },
            {
              title: "4. Доставка",
              body: "Мы отправляем заказы по доступным направлениям и срокам. Указанные сроки доставки являются ориентировочными и могут меняться из-за перевозчика, таможни или пикового спроса.",
            },
            {
              title: "5. Возвраты и обмены",
              body: "Возвраты регулируются нашей политикой возврата. Гигиенические товары, индивидуальные заказы и использованные товары обычно не подлежат возврату.",
            },
            {
              title: "6. Учетная запись",
              body: "Вы отвечаете за точность данных своей учетной записи, сохранность пароля и все действия, выполненные с вашей учетной записи.",
            },
            {
              title: "7. Запрещенное использование",
              body: "Запрещено использовать сайт для мошенничества, автоматического сбора данных, обхода правил безопасности или действий, нарушающих работу сервиса.",
            },
            {
              title: "8. Ограничение ответственности",
              body: "Мы не несем ответственности за косвенные убытки, задержки перевозчика или обстоятельства, которые находятся вне нашего разумного контроля.",
            },
            {
              title: "9. Контакты",
              body: "Если у вас есть вопросы по этим условиям, напишите нам на support@candrashair.com.",
            },
          ],
        }
      : {
          eyebrow: "Terms",
          title: "Terms of Service",
          lead:
            "These terms explain how our store works, what to expect when you place an order, and the rules that apply to purchases from CANDRA'S HAIR.",
          sections: [
            {
              title: "1. Acceptance of Terms",
              body: "By using the site or placing an order, you agree to these terms, our return policy, and any additional rules posted on the website.",
            },
            {
              title: "2. Products and Descriptions",
              body: "We work to describe hair colors, textures, and product details accurately, but small variations can happen due to lighting, batch differences, or screen settings.",
            },
            {
              title: "3. Orders and Payment",
              body: "An order becomes confirmed after successful payment or confirmation from our team. We may cancel suspicious, duplicated, or mistaken orders.",
            },
            {
              title: "4. Shipping",
              body: "We ship to available destinations and service levels. Delivery estimates are only estimates and may change because of the carrier, customs, or peak demand.",
            },
            {
              title: "5. Returns and Exchanges",
              body: "Returns are governed by our return policy. Hygiene-sensitive items, custom orders, and used products are generally not returnable.",
            },
            {
              title: "6. Account Use",
              body: "You are responsible for the accuracy of your account details, keeping your password secure, and all activity that occurs under your account.",
            },
            {
              title: "7. Prohibited Use",
              body: "You may not use the site for fraud, automated scraping, bypassing security controls, or any activity that interferes with the service.",
            },
            {
              title: "8. Limitation of Liability",
              body: "We are not liable for indirect damages, carrier delays, or events outside our reasonable control.",
            },
            {
              title: "9. Contact",
              body: "If you have questions about these terms, email us at support@candrashair.com.",
            },
          ],
        }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50 pt-[102px] lg:pt-[108px]">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">{copy.eyebrow}</p>
        <h1 className="mb-4 font-serif text-4xl font-bold text-foreground lg:text-5xl">{copy.title}</h1>
        <p className="mb-10 text-sm leading-relaxed text-muted-foreground">{copy.lead}</p>

        <div className="space-y-5 rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
          {copy.sections.map((section) => (
            <article key={section.title} className="space-y-2">
              <h2 className="font-serif text-xl font-semibold text-foreground">{section.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  )
}
