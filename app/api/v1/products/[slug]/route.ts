import { NextResponse } from "next/server"
import { CATALOG_PRODUCT_BY_SLUG } from "@/lib/catalog-index"
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
  const normalized = path.startsWith("/") ? path : `/${path}`
  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return `${baseUrl}${normalized}`
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  })
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const origin = request.headers.get("origin")
  const corsHeaders = buildCorsHeaders(origin)

  const auth = await validateApiKey(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.message }, { status: auth.status, headers: corsHeaders })
  }

  const rateLimit = await enforceRateLimit(request, `api:v1:products:slug:${auth.record.id}`, {
    max: auth.record.rate_limit_per_min ?? 60,
    windowMs: 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(rateLimit.retryAfterSeconds) } }
    )
  }

  const { slug } = await params
  const product = CATALOG_PRODUCT_BY_SLUG.get(slug)

  if (!product) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404, headers: corsHeaders })
  }

  const baseUrl = getBaseUrl(request)
  const imagesRaw = product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : []
  let allImages = [...imagesRaw]
  if (product.image && !allImages.includes(product.image)) {
    allImages = [product.image, ...allImages]
  }
  const images = allImages.map((p) => toAbsoluteUrl(baseUrl, p))
  const image = product.image ? toAbsoluteUrl(baseUrl, product.image) : images[0] ?? null

  const { discountedLabel, originalLabel } = getDiscountedPriceLabel(product.price, PRODUCT_DISCOUNT_RATE)

  const lengths = [16, 18, 20, 22, 24, 26] as const
  let pricingByLength: Array<{ length: number; originalPrice: number; discountedPrice: number }> = []
  try {
    pricingByLength = lengths.map((len) => {
      const discounted = calculateCheckoutUnitPrice({ slug: product.slug, length: len })
      const original = Number((discounted / (1 - PRODUCT_DISCOUNT_RATE)).toFixed(2))
      return { length: len, originalPrice: original, discountedPrice: discounted }
    })
  } catch {
    pricingByLength = []
  }

  // Variant colors pricing for bulk hair etc - expose color surcharge info
  const colorOptions = [
    { code: "#2", label: "Natural Hair", surcharge: 0 },
    { code: "#4", label: "Deep Brown", surcharge: 30 },
    { code: "#8", label: "Dark Chestnut", surcharge: 30 },
    { code: "#10", label: "Chestnut Brown", surcharge: 30 },
    { code: "#12", label: "Dark Brown", surcharge: 40 },
    { code: "#14", label: "Medium Brown", surcharge: 40 },
    { code: "#16", label: "Light Brown", surcharge: 40 },
    { code: "#18", label: "Honey Brown", surcharge: 40 },
    { code: "#24", label: "Medium Ash", surcharge: 40 },
    { code: "#60", label: "Light Blonde", surcharge: 40 },
    { code: "#613", label: "Gold Blonde", surcharge: 40 },
    { code: "#grey", label: "Grey", surcharge: 40 },
  ]

  return NextResponse.json(
    {
      success: true,
      data: {
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
        image,
        images,
        gallery: images.map((url, idx) => ({ url, alt: `${product.name} ${idx + 1}` })),
        pricingByLength,
        variants: {
          lengths: [...lengths],
          colors: colorOptions,
          note: "Harga bervariasi berdasarkan panjang (16-26 inch) dan warna. Warna #2 tanpa surcharge, warna tertentu +$15 (non-bulk) atau +$30-40 (bulk hair). Harga di atas sudah termasuk diskon 50%.",
        },
        availability: {
          inStock: true,
          sku: product.slug,
        },
      },
    },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  )
}
