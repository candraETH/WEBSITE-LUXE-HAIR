import { ProductCatalogPage } from "@/components/product-catalog-page"
import { BULK_PRODUCTS } from "@/lib/bulk-products"
import { BULK_HAIR_FAQS } from "@/lib/catalog-faqs"

export default function BulkHairPage() {
  return (
    <ProductCatalogPage
      products={BULK_PRODUCTS}
      filterTitle="Bulk Collection"
      sortId="sort-bulk"
      activeCatalogGroup="bulk"
      faqHeading="Frequently Asked Questions About Bulk Hair"
      faqItems={BULK_HAIR_FAQS}
    />
  )
}
