import { ProductCatalogPage } from "@/components/product-catalog-page"
import { WEFT_PRODUCTS } from "@/lib/weft-products"
import { WEFT_HAIR_FAQS } from "@/lib/catalog-faqs"

export default function WeftHairPage() {
  return (
    <ProductCatalogPage
      products={WEFT_PRODUCTS}
      filterTitle="Hair Texture"
      sortId="sort-weft"
      activeCatalogGroup="weft"
      faqHeading="Frequently Asked Questions About Weft Hair"
      faqItems={WEFT_HAIR_FAQS}
    />
  )
}
