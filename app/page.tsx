import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { CategoryBanner } from "@/components/category-banner"
import { ProductSection } from "@/components/product-section"
import { AboutSection } from "@/components/about-section"
import { WhatsAppCTA } from "@/components/whatsapp-cta"
import { Footer } from "@/components/footer"
import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { EXTENSIONS_PRODUCTS } from "@/lib/extensions-products"
import { WEFT_PRODUCTS } from "@/lib/weft-products"
import { WIGS_PRODUCTS } from "@/lib/wigs-products"
import type { Metadata } from "next"
import { absoluteUrl, getSiteUrl } from "@/lib/seo"
import { JsonLd } from "@/components/json-ld"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { getMessages } from "@/lib/messages"
import { withLocaleHref } from "@/lib/i18n"
import { HomepageExtras } from "@/components/homepage-extras"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title =
    locale === "ru"
      ? "Премиальные наращивания, парики и многое другое"
      : "Premium Hair Weft, Wigs & More"
  const titleAbsolute =
    locale === "ru"
      ? `${title} | CANDRA'S HAIR`
      : "Premium Hair Weft, Wigs & More | CANDRA'S HAIR"
  const description =
    locale === "ru"
      ? "Покупайте премиальные натуральные волосы: наращивания, bulk hair, трессы и парики — надежное качество, быстрая доставка и поддержка."
      : "Shop premium human hair extensions, bulk hair, weft hair, and wigs. Perfect for wholesale with competitive pricing, trusted quality, and worldwide shipping."

  const metadata = await buildLocalizedPageMetadata({
    title,
    titleAbsolute,
    description,
    keywords: [
      "hair",
      "weft hair",
      "hair color",
      "human hairs",
      "cheap hair",
      "human hair extensions",
      "bulk hair",
      "premium wigs",
      "luxury hair store",
    ],
    images: ["/images/hero.jpg"],
  })

  return metadata
  /*
    ...metadata,
    title:
      locale === "ru"
        ? { absolute: "CANDRA'S HAIR | ÐŸÑ€ÐµÐ¼Ð¸Ð°Ð»ÑŒÐ½Ñ‹Ðµ Ð½Ð°Ñ€Ð°Ñ‰Ð¸Ð²ÐÐ°Ð½Ð¸Ñ, Ð¿Ð°Ñ€Ð¸ÐºÐ¸ Ð¸ Ð¼Ð½Ð¾Ð³ÐÐ¾Ðµ Ð´Ñ€ÑƒÐ³Ð¾Ðµ" }
        : { absolute: "CANDRA'S HAIR | Premium Hair Weft, Wigs & More" },
  */
}

export default async function Page() {
  const locale = await getLocaleFromRequestHeaders()
  const messages = getMessages(locale)
  const pageUrl = absoluteUrl(withLocaleHref("/", locale))
  const siteUrl = getSiteUrl()
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CANDRA'S HAIR",
    url: pageUrl,
  }
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CANDRA'S HAIR",
    url: siteUrl,
    logo: `${siteUrl}/images/logo-mark.png`,
  }

  return (
    <main>
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
      <Navbar />
      <Hero locale={locale} />
      <CategoryBanner />

      <ProductSection
        id="bulk"
        title={messages.home.sections.bulk.title}
        subtitle={messages.home.sections.bulk.subtitle}
        description={messages.home.sections.bulk.description}
        products={BULK_PRODUCTS}
        locale={locale}
      />

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="weft"
        title={messages.home.sections.weft.title}
        subtitle={messages.home.sections.weft.subtitle}
        description={messages.home.sections.weft.description}
        products={WEFT_PRODUCTS}
        reverse
        locale={locale}
      />

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="extensions"
        title={messages.home.sections.extensions.title}
        subtitle={messages.home.sections.extensions.subtitle}
        description={messages.home.sections.extensions.description}
        products={EXTENSIONS_PRODUCTS}
        locale={locale}
      />

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <hr className="border-border" />
      </div>

      <ProductSection
        id="wigs"
        title={messages.home.sections.wigs.title}
        subtitle={messages.home.sections.wigs.subtitle}
        description={messages.home.sections.wigs.description}
        products={WIGS_PRODUCTS}
        reverse
        locale={locale}
      />

      <AboutSection />
      <HomepageExtras />
      <WhatsAppCTA />
      <Footer />
    </main>
  )
}
