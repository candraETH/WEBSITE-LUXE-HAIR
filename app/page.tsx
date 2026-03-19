import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { CategoryBanner } from "@/components/category-banner"
import { ProductSection } from "@/components/product-section"
import { AboutSection } from "@/components/about-section"
import { Testimonials } from "@/components/testimonials"
import { WhatsAppCTA } from "@/components/whatsapp-cta"
import { Footer } from "@/components/footer"
import { WhatsAppFloat } from "@/components/whatsapp-float"
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title =
    locale === "ru"
      ? "Премиальные наращивания, парики и многое другое"
      : "Premium Hair Extensions, Wigs & More"
  const description =
    locale === "ru"
      ? "Покупайте премиальные натуральные волосы: наращивания, bulk hair, трессы и парики — надежное качество, быстрая доставка и поддержка."
      : "Shop premium human hair extensions, bulk hair, weft hair, and wigs with trusted quality, fast delivery, and professional support."

  return buildLocalizedPageMetadata({
    title,
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
      <Hero />
      <CategoryBanner />

      <ProductSection
        id="bulk"
        title={messages.home.sections.bulk.title}
        subtitle={messages.home.sections.bulk.subtitle}
        description={messages.home.sections.bulk.description}
        products={BULK_PRODUCTS}
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
      />

      <AboutSection />
      <Testimonials />
      <WhatsAppCTA />
      <Footer />
      <WhatsAppFloat />
    </main>
  )
}
