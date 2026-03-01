import { ProductCatalogPage } from "@/components/product-catalog-page"
import { WIGS_PRODUCTS } from "@/lib/wigs-products"
import { WIGS_FAQS } from "@/lib/catalog-faqs"

export default function WigsPage() {
  return (
    <ProductCatalogPage
      products={WIGS_PRODUCTS}
      filterTitle="Wig Styles"
      sortId="sort-wigs"
      activeCatalogGroup="wigs"
      faqHeading="Frequently Asked Questions About Human Hair Wigs"
      faqItems={WIGS_FAQS}
    />
  )
}
