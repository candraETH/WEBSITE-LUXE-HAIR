"use client"

import Image from "next/image"
import Link from "next/link"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import type { CatalogProduct } from "@/lib/bulk-products"
import { getDiscountedPriceLabel } from "@/lib/pricing"
import { withLocaleHref } from "@/lib/i18n"
import { getMessages } from "@/lib/messages"
import { getProductDisplayCopy } from "@/lib/product-copy"
import { useLocale } from "@/context/LocaleContext"

type RecommendedProductsCarouselProps = {
  products: CatalogProduct[]
  title?: string
}

function resolveProductImage(product: CatalogProduct): string {
  if (product.image) {
    return product.image
  }
  if (product.images && product.images.length > 0) {
    return product.images[0]
  }
  return "/images/hero.jpg"
}

export function RecommendedProductsCarousel({
  products,
  title,
}: RecommendedProductsCarouselProps) {
  const { locale } = useLocale()
  const messages = getMessages(locale)
  const resolvedTitle = title ?? messages.blog.recommendedTitle

  if (products.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-[#ddd2c8] bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6b22]">
        {messages.blog.recommendedEyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#141418] sm:text-4xl">
        {resolvedTitle}
      </h2>

      <Carousel
        className="relative mt-6 px-1 sm:pr-24"
        opts={{
          align: "start",
          dragFree: true,
        }}
      >
        <CarouselContent>
          {products.map((product) => {
            const copy = getProductDisplayCopy(product, locale)
            const price = getDiscountedPriceLabel(product.price)
            const productImage = resolveProductImage(product)

            return (
              <CarouselItem
                key={product.slug}
                className="basis-[82%] pl-3 sm:basis-[46%] lg:basis-[34%] xl:basis-[26%]"
              >
                <Link
                  href={withLocaleHref(`/order/${product.slug}`, locale)}
                  className="group block rounded-xl border border-[#e2d9d0] bg-[#fcfbf9] p-2.5 transition-colors hover:border-[#cdbca9] hover:bg-white"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#ece7df]">
                    <Image
                      src={productImage}
                      alt={copy.name}
                      fill
                      sizes="(max-width: 640px) 70vw, (max-width: 1200px) 40vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                    <div className="pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b7b82]">
                        {copy.category}
                      </p>
                      <h3 className="mt-1 text-base font-semibold leading-snug text-[#151519]">
                        {copy.name}
                      </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-base font-semibold leading-none text-[#111] tabular-nums">
                        {price.discountedLabel}
                      </p>
                      <p className="text-xs font-medium leading-none text-[#7a7a80] line-through tabular-nums">
                        {price.originalLabel}
                      </p>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            )
          })}
        </CarouselContent>

        <CarouselPrevious className="left-auto right-12 top-[-42px] h-9 w-9 -translate-y-0 border-[#d3c9bf] bg-white text-[#3f3f44] hover:bg-[#f7f2ec]" />
        <CarouselNext className="right-1 top-[-42px] h-9 w-9 -translate-y-0 border-[#d3c9bf] bg-white text-[#3f3f44] hover:bg-[#f7f2ec]" />
      </Carousel>
    </section>
  )
}
