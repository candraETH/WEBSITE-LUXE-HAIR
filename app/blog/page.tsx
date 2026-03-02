import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { BLOG_POSTS } from "@/lib/blog-posts"
import type { CatalogProduct } from "@/lib/bulk-products"
import { ALL_CATALOG_PRODUCTS } from "@/lib/catalog-index"
import { getDiscountedPriceLabel } from "@/lib/pricing"
import { absoluteUrl, buildPageMetadata } from "@/lib/seo"

export const metadata: Metadata = buildPageMetadata({
  title: "Hair Blog & Care Tips",
  description:
    "Read practical tips about hair extensions, wigs, weft care, and buying guides from CANDRA'S HAIR.",
  path: "/blog",
  keywords: ["hair blog", "hair extensions guide", "weft hair care", "wig tips", "hair maintenance"],
  images: ["/images/hero.jpg"],
})

function formatPublishedDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value))
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

export default function BlogPage() {
  const featuredProducts: CatalogProduct[] = ALL_CATALOG_PRODUCTS

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "CANDRA'S HAIR Blog",
    url: absoluteUrl("/blog"),
    blogPost: BLOG_POSTS.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      datePublished: post.publishedAt,
      author: {
        "@type": "Organization",
        name: post.author,
      },
      url: absoluteUrl(`/blog/${post.slug}`),
      image: absoluteUrl(post.coverImage),
      description: post.excerpt,
    })),
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f3ef] pt-[102px] lg:pt-[108px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />
      <Navbar />

      <section className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8a6b22]">Candra&apos;s Hair Journal</p>
        <h1 className="mt-3 max-w-4xl font-serif text-[1.6rem] font-bold leading-tight text-[#141414] sm:text-[2.1rem]">
          Blog, Guides, and Hair Care Insights
        </h1>
        <p className="mt-4 max-w-4xl text-[10px] leading-relaxed text-[#45454b] sm:text-[11px]">
          Learn how to choose better products, maintain premium hair quality, and get more value from every order.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="order-2 h-full p-0 lg:order-1 lg:sticky lg:top-[112px] lg:max-h-[calc(100vh-116px)] lg:overflow-hidden">
            <h2 className="text-[34px] font-semibold leading-none tracking-tight text-[#111]">Our Product</h2>

            <div className="mt-4 divide-y divide-[#d8d0c7] lg:max-h-[calc(100vh-188px)] lg:overflow-y-auto lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden">
              {featuredProducts.map((product) => {
                const price = getDiscountedPriceLabel(product.price)
                const productImage = resolveProductImage(product)

                return (
                  <Link
                    key={product.slug}
                    href={`/order/${product.slug}`}
                    className="flex items-start gap-3 py-3 transition-colors hover:bg-white/60"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#d8d0c7] bg-white">
                      <Image
                        src={productImage}
                        alt={product.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium leading-snug text-[#1e1e22]">{product.name}</p>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <p className="text-[13px] font-semibold tabular-nums text-[#111]">{price.discountedLabel}</p>
                        <p className="text-[12px] font-medium tabular-nums text-[#88888d] line-through">{price.originalLabel}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </aside>

          <div className="order-1 px-4 py-3 lg:order-2 sm:px-5 sm:py-4">
            {BLOG_POSTS.map((post, index) => (
              <article
                key={post.slug}
                className={`grid gap-4 py-4 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)] md:items-start ${
                  index < BLOG_POSTS.length - 1 ? "border-b border-[#e6ddd4]" : ""
                }`}
              >
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-[#efe7dd]">
                    <Image
                      src={post.coverImage}
                      alt={post.coverAlt}
                      fill
                      sizes="(min-width: 1024px) 420px, 100vw"
                      className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                    />
                  </div>
                </Link>

                <div className="min-w-0">
                  <p className="inline-flex rounded-md border border-[#d8c0a3] bg-[#fff6ec] px-2 py-1 text-[9px] font-semibold tracking-wide text-[#6d4f22]">
                    {post.category}
                  </p>
                  <h2 className="mt-2 text-[15px] font-semibold leading-tight text-[#111]">
                    <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-[#8a6b22]">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-[11px] text-[#66666d]">Publish Date: {formatPublishedDate(post.publishedAt)}</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-[#2f2f34]">{post.excerpt}</p>
                  <div className="mt-4">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-[17px] font-medium leading-none tracking-tight text-[#141418] underline-offset-4 hover:underline"
                    >
                      View More -&gt;
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
