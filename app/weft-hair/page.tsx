import { ProductCatalogPage } from "@/components/product-catalog-page"
import { JsonLd } from "@/components/json-ld"
import { WEFT_PRODUCTS } from "@/lib/weft-products"
import { WEFT_HAIR_FAQS } from "@/lib/catalog-faqs"
import type { Metadata } from "next"
import { absoluteUrl } from "@/lib/seo"
import { buildLocalizedPageMetadata, getLocaleFromRequestHeaders } from "@/lib/seo-i18n"
import { withLocaleHref } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequestHeaders()
  const title = locale === "ru" ? "Трессы — коллекция" : "Weft Hair Extensions"
  const titleAbsolute =
    locale === "ru" ? `${title} | CANDRA'S HAIR` : "Weft Hair Extensions | CANDRA'S HAIR"
  const description =
    locale === "ru"
      ? "Премиальные трессы (weft hair): body wave, curly, deep wave и другие текстуры. Для естественной установки и движения."
      : "Discover premium weft hair textures including body wave, curly, deep wave, and more. Designed for seamless installs and natural movement."

  return buildLocalizedPageMetadata({
    title,
    titleAbsolute,
    description,
    keywords: ["weft hair", "human hair weft", "body wave weft", "curly weft"],
    images: ["/images/texture/all%20texture.png"],
  })
}

export default async function WeftHairPage() {
  const locale = await getLocaleFromRequestHeaders()
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: WEFT_HAIR_FAQS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "ru" ? "Главная" : "Home",
        item: absoluteUrl(withLocaleHref("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "ru" ? "Трессы" : "Bundles",
        item: absoluteUrl(withLocaleHref("/weft-hair", locale)),
      },
    ],
  }

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
      <ProductCatalogPage
        products={WEFT_PRODUCTS}
        filterTitle={locale === "ru" ? "Текстура" : "Hair Texture"}
        sortId="sort-weft"
        activeCatalogGroup="weft"
        faqHeading={locale === "ru" ? "Часто задаваемые вопросы о трессах" : "Frequently Asked Questions About Bundles"}
        faqItems={WEFT_HAIR_FAQS}
      />
    </>
  )
}


