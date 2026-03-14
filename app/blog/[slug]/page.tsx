import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { RecommendedProductsCarousel } from "@/components/recommended-products-carousel"
import { JsonLd } from "@/components/json-ld"
import { BLOG_POSTS, getBlogPostBySlug } from "@/lib/blog-posts"
import { ALL_CATALOG_PRODUCTS } from "@/lib/catalog-index"
import { absoluteUrl, buildPageMetadata } from "@/lib/seo"

type BlogPostPageProps = {
  params: Promise<{
    slug: string
  }>
}

function formatPublishedDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value))
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    return buildPageMetadata({
      title: "Blog Article Not Found",
      description: "The requested blog article could not be found.",
      path: `/blog/${slug}`,
      noIndex: true,
    })
  }

  return buildPageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: [post.category.toLowerCase(), "hair care", "human hair", "extensions tips"],
    images: [post.coverImage],
  })
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }
  const previewPosts = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 4)
  const recommendedProducts = ALL_CATALOG_PRODUCTS.slice(0, 12)

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: [absoluteUrl(post.coverImage)],
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "CANDRA'S HAIR",
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/images/logo-mark.png"),
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
  }
  const faqSchema =
    post.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faqs.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f3ef] pt-[102px] lg:pt-[108px]">
      <JsonLd data={articleSchema} />
      {faqSchema ? <JsonLd data={faqSchema} /> : null}
      <Navbar />

      <section className="mx-auto w-full max-w-[1480px] px-4 py-10 sm:px-6 lg:px-10 xl:px-12 2xl:px-16">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <article className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-5">
              <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-[#6b6b70]">
                <li>
                  <Link href="/" className="transition-colors hover:text-[#1f1f1f]">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true" className="text-[#9a9aa0]">
                  /
                </li>
                <li>
                  <Link href="/blog" className="transition-colors hover:text-[#1f1f1f]">
                    Blog
                  </Link>
                </li>
                <li aria-hidden="true" className="text-[#9a9aa0]">
                  /
                </li>
                <li className="text-[#1f1f1f]">{post.title}</li>
              </ol>
            </nav>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6b22]">{post.category}</p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-[#151515] sm:text-5xl">{post.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#616167]">
              <span>{formatPublishedDate(post.publishedAt)}</span>
              <span aria-hidden="true" className="text-[#b7aea4]">|</span>
              <span>{post.readingTime}</span>
              <span aria-hidden="true" className="text-[#b7aea4]">|</span>
              <span>{post.author}</span>
            </div>

            <div className="relative mt-7 aspect-[16/9] overflow-hidden rounded-2xl border border-[#ddd2c8] bg-[#efe7dd]">
              <Image
                src={post.coverImage}
                alt={post.coverAlt}
                fill
                priority
                sizes="(min-width: 1280px) 1000px, 100vw"
                className="object-cover"
              />
            </div>

            <p className="mt-7 text-lg leading-relaxed text-[#252529]">{post.excerpt}</p>

            <div className="mt-8 space-y-8">
              {post.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-2xl font-semibold leading-tight text-[#171717]">{section.heading}</h2>
                  <div className="mt-3 space-y-3 text-base leading-relaxed text-[#33333a]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {post.faqs.length > 0 && (
              <section className="mt-12 rounded-2xl border border-[#ddd2c8] bg-white p-5 sm:p-6">
                <h2 className="text-2xl font-semibold leading-tight text-[#171717]">
                  Frequently Asked Questions
                </h2>
                <div className="mt-4 divide-y divide-[#e7dfd7]">
                  {post.faqs.map((item) => (
                    <div key={item.question} className="py-4 first:pt-0 last:pb-0">
                      <h3 className="text-base font-semibold leading-snug text-[#141417]">{item.question}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#3a3a40] sm:text-base">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-[#ddd2c8] pt-6">
              <Link
                href="/blog"
                className="inline-flex items-center rounded-md border border-[#c9beb3] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#222] transition-colors hover:bg-[#f7efe6]"
              >
                Back to Blog
              </Link>
              <Link
                href="/bulk-hair"
                className="inline-flex items-center rounded-md bg-[#1f1f1f] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-[#332f2a]"
              >
                Shop Collection
              </Link>
            </div>
          </article>

          <aside className="h-fit rounded-2xl border border-[#ddd2c8] bg-white p-4 lg:sticky lg:top-[132px]">
            <h2 className="text-lg font-semibold uppercase tracking-[0.14em] text-[#171717]">Blog Preview</h2>
            <p className="mt-1 text-sm text-[#66666d]">More articles you might enjoy.</p>

            <div className="mt-4 space-y-4">
              {previewPosts.map((preview) => (
                <article
                  key={preview.slug}
                  className="overflow-hidden rounded-xl border border-[#e6ddd4] bg-[#fbfaf8]"
                >
                  <Link href={`/blog/${preview.slug}`} className="block">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#efe7dd]">
                      <Image
                        src={preview.coverImage}
                        alt={preview.coverAlt}
                        fill
                        sizes="380px"
                        className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                      />
                    </div>
                  </Link>

                  <div className="p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a6b22]">
                      {preview.category}
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-tight text-[#111]">
                      <Link href={`/blog/${preview.slug}`} className="transition-colors hover:text-[#8a6b22]">
                        {preview.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-[#6e6e75]">Publish Date: {formatPublishedDate(preview.publishedAt)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#35353b]">{preview.excerpt}</p>
                    <div className="mt-3">
                      <Link
                        href={`/blog/${preview.slug}`}
                        className="text-xs font-semibold uppercase tracking-[0.14em] text-[#222] hover:text-[#8a6b22]"
                      >
                        View More -&gt;
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-10 border-t border-[#ddd2c8] pt-8">
          <RecommendedProductsCarousel products={recommendedProducts} title="Recommended for You" />
        </div>
      </section>

      <Footer />
    </main>
  )
}
