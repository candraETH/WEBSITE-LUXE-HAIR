import { NextResponse } from "next/server"
import { ALL_CATALOG_PRODUCTS } from "@/lib/catalog-index"
import { getDiscountedPriceLabel, PRODUCT_DISCOUNT_RATE } from "@/lib/pricing"
import { calculateCheckoutUnitPrice } from "@/lib/paypal/catalog"
import { validateApiKey, buildCorsHeaders } from "@/lib/api-keys"
import { enforceRateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"

function getBaseUrl(request: Request): string {
  const configured = process.env.APP_BASE_URL?.trim().replace(/\/+$/, "")
  if (configured) return configured
  try {
    return new URL(request.url).origin
  } catch {
    return "http://localhost:3000"
  }
}

function toAbsoluteUrl(baseUrl: string, path: string): string {
  if (!path) return path
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  // Ensure proper encoding for spaces
  const normalized = path.startsWith("/") ? path : `/${path}`
  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return `${baseUrl}${normalized}`
  }
}

function buildProductResponse(product: (typeof ALL_CATALOG_PRODUCTS)[number], baseUrl: string) {
  const imagesRaw = product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : []
  // Include main image as first if not in images
  let allImages = [...imagesRaw]
  if (product.image && !allImages.includes(product.image)) {
    allImages = [product.image, ...allImages]
  }
  const images = allImages.map((p) => toAbsoluteUrl(baseUrl, p))
  const image = product.image ? toAbsoluteUrl(baseUrl, product.image) : images[0] ?? null

  const { discountedLabel, originalLabel } = getDiscountedPriceLabel(product.price, PRODUCT_DISCOUNT_RATE)

  // pricing_by_length: 16-26 step 2
  const lengths = [16, 18, 20, 22, 24, 26] as const
  let pricingByLength: Array<{ length: number; originalPrice: number; discountedPrice: number; originalLabel: string; discountedLabel: string }> = []
  try {
    pricingByLength = lengths.map((len) => {
      const discounted = calculateCheckoutUnitPrice({ slug: product.slug, length: len })
      const original = Number((discounted / (1 - PRODUCT_DISCOUNT_RATE)).toFixed(2))
      return {
        length: len,
        originalPrice: original,
        discountedPrice: discounted,
        originalLabel: `$${original}`,
        discountedLabel: `$${discounted}`,
      }
    })
  } catch {
    // Fallback to price label parsing if catalog pricing missing
    pricingByLength = []
  }

  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    tag: product.tag ?? null,
    price: {
      label: product.price,
      originalLabel,
      discountedLabel,
      discountRate: PRODUCT_DISCOUNT_RATE,
      currency: "USD",
    },
    images,
    image,
    pricingByLength,
    url: `${baseUrl}/${product.category.toLowerCase().replace(/\s+/g, "-")}/${product.slug}`.replace(/\/\/+/g, "/").replace("https:/", "https://").replace("http:/", "http://"),
    productUrl: `${baseUrl}/api/v1/products/${product.slug}`,
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  })
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin")
  const corsHeaders = buildCorsHeaders(origin)

  // Validate API key
  const auth = await validateApiKey(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status, headers: corsHeaders })
  }

  // Rate limit per API key
  const rateLimit = await enforceRateLimit(request, `api:v1:products:${auth.record.id}`, {
    max: auth.record.rate_limit_per_min ?? 60,
    windowMs: 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(rateLimit.retryAfterSeconds) } }
    )
  }

  const url = new URL(request.url)
  const category = url.searchParams.get("category")?.trim()
  const search = url.searchParams.get("search")?.trim().toLowerCase()
  const tag = url.searchParams.get("tag")?.trim().toLowerCase()
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1)
  const limitRaw = parseInt(url.searchParams.get("limit") ?? "20", 10) || 20
  const limit = Math.min(100, Math.max(1, limitRaw))

  let filtered = [...ALL_CATALOG_PRODUCTS]

  if (category) {
    filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase())
  }
  if (tag) {
    filtered = filtered.filter((p) => (p.tag ?? "").toLowerCase() === tag)
  }
  if (search) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.slug.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    )
  }

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * limit
  const paginated = filtered.slice(start, start + limit)

  const baseUrl = getBaseUrl(request)
  const data = paginated.map((p) => buildProductResponse(p, baseUrl))

  return NextResponse.json(
    {
      success: true,
      meta: {
        total,
        page: safePage,
        limit,
        totalPages,
        categories: [...new Set(ALL_CATALOG_PRODUCTS.map((p) => p.category))],
      },
      data,
    },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  )
}
