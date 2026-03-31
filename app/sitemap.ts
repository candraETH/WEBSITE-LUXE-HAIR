import type { MetadataRoute } from "next"
import { ALL_CATALOG_PRODUCTS } from "@/lib/catalog-index"
import { BLOG_POSTS } from "@/lib/blog-posts"
import { absoluteUrl } from "@/lib/seo"
import { SUPPORTED_LOCALES, withLocaleHref } from "@/lib/i18n"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const baseStaticRoutes: Array<Omit<MetadataRoute.Sitemap[number], "url"> & { path: string }> = [
    { path: "/", lastModified: now, changeFrequency: "weekly", priority: 1 },
    { path: "/bulk-hair", lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { path: "/weft-hair", lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { path: "/extensions", lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { path: "/wigs", lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { path: "/blog", lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { path: "/return-policy", lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { path: "/terms-of-service", lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ]

  const staticRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
    baseStaticRoutes.map((route) => ({
      url: absoluteUrl(withLocaleHref(route.path, locale)),
      lastModified: route.lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }))
  )

  const productRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
    ALL_CATALOG_PRODUCTS.map((product) => ({
      url: absoluteUrl(withLocaleHref(`/order/${product.slug}`, locale)),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }))
  )

  const blogRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
    BLOG_POSTS.map((post) => ({
      url: absoluteUrl(withLocaleHref(`/blog/${post.slug}`, locale)),
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    }))
  )

  return [...staticRoutes, ...productRoutes, ...blogRoutes]
}
