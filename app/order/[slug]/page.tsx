"use client"

import Image from "next/image"
import Link from "next/link"
import { use, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { MAX_ITEM_QUANTITY, useCart } from "@/context/CartContext"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { addToWishlist } from "@/lib/wishlist"
import { testimonialsCount } from "@/lib/testimonials-data"
import { LAST_VISITED_ROUTE_KEY } from "@/lib/navigation-state"
import { applyProductDiscount, formatUsdPrice, getDiscountedPriceLabel } from "@/lib/pricing"
import { parsePriceValues } from "@/lib/seo"

type ProductColor = {
  code: string
  label: string
  hex: string
}

type ProductItem = {
  slug: string
  name: string
  price: string
  image: string
  category: string
  description: string
  longDescription: string
  basePrice: number
  pricePerInch: number
  tag?: string
  gallery?: string[]
  colorImageFolder?: string
  colorImageMap?: Record<string, string>
  colors?: ProductColor[]
}

// Product data
const allProducts: ProductItem[] = [
  // Hair Extensions
  {
    slug: "silky-straight-clip-ins",
    name: "Silky Straight Clip-Ins",
    price: "$120 - $280",
    image: "/images/extensions-1.jpg",
    category: "Hair Extensions",
    description: "100% human hair clip-in extensions. Available in 16-26 inch lengths.",
    longDescription: "Premium quality silky straight clip-in hair extensions made from 100% human hair. Perfect for adding length, volume, and dimension to your natural hair. Our clip-ins are durable, reusable, and can be styled, colored, and heat treated just like natural hair.",
    tag: "Best Seller",
    basePrice: 120,
    pricePerInch: 6.67,
  },
  {
    slug: "honey-blonde-tape-ins",
    name: "Honey Blonde Tape-Ins",
    price: "$150 - $320",
    image: "/images/extensions-2.jpg",
    category: "Hair Extensions",
    description: "Premium tape-in extensions with seamless blend. Reusable up to 3 times.",
    longDescription: "Luxurious honey blonde tape-in extensions with a seamless blend. These premium extensions are reusable up to 3 times and provide a natural, undetectable look. Perfect for all hair types.",
    basePrice: 150,
    pricePerInch: 8.5,
  },
  {
    slug: "body-wave-bundles",
    name: "Body Wave Bundles",
    price: "$95 - $250",
    image: "/images/extensions-3.jpg",
    category: "Hair Extensions",
    description: "Luxurious body wave texture. Can be colored and heat styled.",
    longDescription: "Beautiful body wave texture bundles that can be customized to your preferences. Heat-resistant, durable, and perfect for creating voluminous, wavy styles.",
    basePrice: 95,
    pricePerInch: 5.8,
  },
  // Wigs
  {
    slug: "straight-lace-front-wig",
    name: "Straight Lace Front Wig",
    price: "$250 - $450",
    image: "/images/wig-1.jpg",
    category: "Wigs",
    description: "HD lace front with pre-plucked hairline. Natural jet black, 18-30 inches.",
    longDescription: "Premium HD lace front wig with a pre-plucked, natural-looking hairline. Made from 100% human hair in natural jet black. Breathable cap construction for all-day comfort.",
    tag: "Best Seller",
    basePrice: 250,
    pricePerInch: 6.67,
  },
  {
    slug: "deep-wave-closure-wig",
    name: "Deep Wave Closure Wig",
    price: "$280 - $480",
    image: "/images/wig-2.jpg",
    category: "Wigs",
    description: "4x4 closure wig with deep wave curls. Breathable cap construction.",
    longDescription: "Stunning deep wave closure wig with gorgeous curls and a breathable cap construction. Perfect for a glamorous, bouncy look that turns heads.",
    basePrice: 280,
    pricePerInch: 8.0,
  },
  {
    slug: "burgundy-bob-wig",
    name: "Burgundy Bob Wig",
    price: "$180 - $320",
    image: "/images/wig-3.jpg",
    category: "Wigs",
    description: "Chic bob cut in burgundy wine. Perfect for a bold, sophisticated look.",
    longDescription: "Sophisticated burgundy bob wig with a chic, modern cut. Perfect for making a bold statement while maintaining an elegant appearance.",
    tag: "Trending",
    basePrice: 180,
    pricePerInch: 5.6,
  },
  // Weft Hair
  {
    slug: "machine-weft-straight",
    name: "Machine Weft Straight",
    price: "$80 - $180",
    image: "/images/weft-1.jpg",
    category: "Weft Hair",
    description: "Durable machine weft sewing. Ideal for sew-in installations. 12-28 inches.",
    longDescription: "Durable machine-made weft hair perfect for professional sew-in installations. High quality with minimal shedding for long-lasting wear.",
    basePrice: 80,
    pricePerInch: 4.0,
  },
  {
    slug: "hand-tied-loose-wave",
    name: "Hand-Tied Loose Wave",
    price: "$130 - $280",
    image: "/images/weft-2.jpg",
    category: "Weft Hair",
    description: "Ultra-thin hand-tied wefts that lay flat. Perfect for volume and length.",
    longDescription: "Luxurious hand-tied weft with loose wave texture. Ultra-thin wefts lay completely flat for an undetectable, seamless look. Creates beautiful volume and dimension.",
    tag: "Premium",
    basePrice: 130,
    pricePerInch: 6.5,
  },
  {
    slug: "flat-weft-platinum",
    name: "Flat Weft Platinum",
    price: "$110 - $240",
    image: "/images/weft-3.jpg",
    category: "Weft Hair",
    description: "Platinum blonde flat weft. Minimal shedding, tangle-free guarantee.",
    longDescription: "Beautiful platinum blonde flat weft hair with guaranteed minimal shedding and no tangles. Perfect for creating stunning blonde styles.",
    basePrice: 110,
    pricePerInch: 5.2,
  },
  {
    slug: "natural-wave-weft",
    name: "Natural Wave",
    price: "$95 - $151",
    image: "/images/texture/natural%20wave%201.png",
    gallery: [
      "/images/texture/natural%20wave%202.png",
      "/images/model%20finis/model%20natural%20wave%202.png",
    ],
    category: "Weft Hair",
    description: "Soft flowing natural wave texture with lightweight movement and a seamless finish.",
    longDescription: "Natural Wave Weft is designed for soft movement and a natural look. This style blends easily, holds shape well, and works beautifully for everyday wear or glam styling.",
    basePrice: 95,
    pricePerInch: 5.6,
  },
  {
    slug: "body-wave-weft",
    name: "Body Wave",
    price: "$98 - $157",
    image: "/images/texture/body%20wave.png",
    gallery: ["/images/model%20finis/model%20body%20wave.png"],
    category: "Weft Hair",
    description: "Classic body wave for everyday elegance, volume, and easy styling flexibility.",
    longDescription: "Body Wave Weft gives a classic flowing texture with balanced volume. It can be styled straight or curled while keeping a soft, premium finish.",
    basePrice: 98,
    pricePerInch: 5.9,
  },
  {
    slug: "curly-weft",
    name: "Curly",
    price: "$105 - $168",
    image: "/images/texture/curly%201.png",
    gallery: [
      "/images/texture/curly%202.png",
      "/images/model%20finis/model%20curly%201.png",
      "/images/model%20finis/model%20curly%202.png",
    ],
    category: "Weft Hair",
    description: "Defined curly pattern with natural bounce and fullness for statement looks.",
    longDescription: "Curly Weft delivers defined curls with a lively, voluminous look. Perfect for customers who want full-body texture and long-lasting shape.",
    basePrice: 105,
    pricePerInch: 6.3,
  },
  {
    slug: "deep-curly-weft",
    name: "Deep Curly",
    price: "$110 - $175",
    image: "/images/texture/deep%20curly.png",
    gallery: ["/images/model%20finis/model%20deep%20curly.png"],
    category: "Weft Hair",
    description: "Dense deep curly texture with rich volume and long-lasting curl definition.",
    longDescription: "Deep Curly Weft provides a tighter curl pattern with rich volume and a luxurious finish. Great for bold styles and statement installs.",
    basePrice: 110,
    pricePerInch: 6.5,
  },
  {
    slug: "deep-wave-weft",
    name: "Deep Wave",
    price: "$108 - $170",
    image: "/images/texture/deep%20wave.png",
    gallery: ["/images/model%20finis/model%20deep%20wave.png"],
    category: "Weft Hair",
    description: "Deep wave pattern crafted for dramatic texture, softness, and body.",
    longDescription: "Deep Wave Weft combines softness and texture for a dramatic but wearable look. Ideal for defined waves with premium movement.",
    basePrice: 108,
    pricePerInch: 6.2,
  },
  {
    slug: "fumi-weft",
    name: "Fumi",
    price: "$125 - $195",
    image: "/images/texture/fumi%201.png",
    gallery: [
      "/images/texture/fumi%202.png",
      "/images/texture/fumi%203.png",
      "/images/model%20finis/model%20fumi%201.png",
      "/images/model%20finis/model%20fumi%202.png",
      "/images/model%20finis/model%20fumi%203.png",
    ],
    category: "Weft Hair",
    description: "Signature fumi texture with premium body and luxury finish.",
    longDescription: "Fumi Weft is a premium signature texture with elegant fullness and smooth blending. This style is ideal for luxury installs and polished looks.",
    tag: "Best Seller",
    basePrice: 125,
    pricePerInch: 7.0,
  },
  {
    slug: "natural-curly-weft",
    name: "Natural Curly",
    price: "$112 - $176",
    image: "/images/texture/natural%20curly.png",
    gallery: ["/images/model%20finis/model%20natural%20curly.png"],
    category: "Weft Hair",
    description: "Natural curly pattern designed for soft volume and realistic movement.",
    longDescription: "Natural Curly Weft offers soft, realistic curl definition that blends naturally and keeps volume without feeling heavy.",
    basePrice: 112,
    pricePerInch: 6.4,
  },
  {
    slug: "water-wave-weft",
    name: "Water Wave",
    price: "$107 - $168",
    image: "/images/texture/water%20wave%201.png",
    gallery: ["/images/model%20finis/model%20water%20wave%201.png"],
    category: "Weft Hair",
    description: "Water wave texture with smooth S-waves and lightweight wear.",
    longDescription: "Water Wave Weft delivers smooth S-pattern waves with excellent softness and movement. Easy to maintain and style.",
    basePrice: 107,
    pricePerInch: 6.1,
  },
  {
    slug: "kinky-curl-weft",
    name: "Kinky Curl",
    price: "$118 - $186",
    image: "/images/texture/kinky%20curl.png",
    gallery: [
      "/images/texture/kinky%20curl%203.png",
      "/images/model%20finis/model%20kinky%20curl.png",
      "/images/model%20finis/model%20kinky%20curl%203.png",
    ],
    category: "Weft Hair",
    description: "Kinky curl texture with maximum fullness and strong curl character.",
    longDescription: "Kinky Curl Weft creates a fuller, textured look with standout curl personality. Ideal for high-volume styles and natural-texture blending.",
    basePrice: 118,
    pricePerInch: 6.8,
  },
  {
    slug: "loose-wave-weft",
    name: "Loose Wave",
    price: "$102 - $162",
    image: "/images/texture/loose%20wave%201.png",
    gallery: [
      "/images/texture/loose%20wave%202.png",
      "/images/model%20finis/model%20lose%20wave%201.png",
      "/images/model%20finis/model%20lose%20wave%202.png",
    ],
    category: "Weft Hair",
    description: "Relaxed loose wave texture that blends naturally with versatile styling.",
    longDescription: "Loose Wave Weft gives a relaxed, effortless look with soft body and smooth blending. Great for natural everyday styling.",
    basePrice: 102,
    pricePerInch: 6.0,
  },
  {
    slug: "jerry-curly-weft",
    name: "Jerry Curly",
    price: "$114 - $180",
    image: "/images/texture/jerry%20curly.png",
    gallery: ["/images/model%20finis/model%20jerry%20curly.png"],
    category: "Weft Hair",
    description: "Springy jerry curly pattern with vibrant volume and defined curls.",
    longDescription: "Jerry Curly Weft features springy, defined curls that create strong volume and lively movement for standout styling.",
    basePrice: 114,
    pricePerInch: 6.6,
  },
  {
    slug: "brazilian-curly-weft",
    name: "Brazilian Curly",
    price: "$120 - $189",
    image: "/images/texture/brazilian%20curly.png",
    gallery: ["/images/model%20finis/model%20brazilian.png"],
    category: "Weft Hair",
    description: "Brazilian curly texture with premium softness and rich curl shape.",
    longDescription: "Brazilian Curly Weft combines rich curl shape and softness with a premium finish, ideal for elegant volume and texture.",
    basePrice: 120,
    pricePerInch: 6.9,
  },
  // Bulk Hair
  {
    slug: "virgin-straight-bulk",
    name: "Virgin Straight Bulk",
    price: "$100 - $200",
    image: "/images/images1.png",
    category: "Bulk Hair",
    description: "100% virgin hair without weft. Perfect for braiding and custom wig making.",
    longDescription: "Premium 100% virgin bulk hair without weft. Unprocessed and perfect for braiding, custom wig construction, and creative styling projects.",
    basePrice: 100,
    pricePerInch: 10,
    colorImageMap: {
      "#ash": "/images/images2.png",
    },
    colors: [
      { code: "#ash", label: "Ash", hex: "#b8b8b8" },
      { code: "#60", label: "Light Blonde", hex: "#f5e6d3" },
      { code: "#613", label: "Gold Blonde", hex: "#f4d49e" },
      { code: "#24", label: "Medium Ash", hex: "#c9b5a0" },
      { code: "#18", label: "Honey Brown", hex: "#d4a574" },
      { code: "#16", label: "Light Brown", hex: "#c9a570" },
      { code: "#14", label: "Medium Brown", hex: "#a0795f" },
      { code: "#12", label: "Dark Brown", hex: "#8b6f47" },
      { code: "#10", label: "Chestnut Brown", hex: "#6b5847" },
      { code: "#8", label: "Dark Chestnut", hex: "#5a4a3a" },
      { code: "#4", label: "Deep Brown", hex: "#3d3129" },
      { code: "#2", label: "Natural Hair", hex: "#1a1a1a" },
    ],
  },
  {
    slug: "natural-braiding-hair",
    name: "Natural Braiding Hair",
    price: "$100 - $200",
    image: "/images/Natural%20Braiding%20Hair/Natural%20Braiding%20Hair%201.png",
    gallery: [
      "/images/Natural%20Braiding%20Hair/Natural%20Braiding%20Hair%204.png",
      "/images/Natural%20Braiding%20Hair/Natural%20Braiding%20Hair%203.png",
    ],
    colorImageFolder: "/images/Natural%20Braiding%20Hair",
    colorImageMap: {
      "#ash": "/images/Natural%20Braiding%20Hair/ash.png",
    },
    category: "Bulk Hair",
    description: "Soft, tangle-free bulk hair ideal for box braids and twists.",
    longDescription: "Soft, premium quality bulk braiding hair that's tangle-free and perfect for creating beautiful box braids, twists, and other protective styles.",
    tag: "Popular",
    basePrice: 100,
    pricePerInch: 10,
  },
  {
    slug: "wavy-bulk-premium",
    name: "Wavy Bulk Premium",
    price: "$100 - $200",
    image: "/images/Wavy%20Bulk%20Premium/Wavy%20Bulk%20Premium.png",
    colorImageFolder: "/images/Wavy%20Bulk%20Premium",
    category: "Bulk Hair",
    description: "Premium grade wavy bulk hair. Unprocessed, can be colored to any shade.",
    longDescription: "Premium grade wavy bulk hair that's unprocessed and can be colored to any shade. Perfect for custom wig making and creative styling.",
    tag: "New",
    basePrice: 100,
    pricePerInch: 10,
  },
]

const DEFAULT_HAIR_COLORS = [
  { code: "#ash", label: "Ash", hex: "#b8b8b8" },
  { code: "#60", label: "Light Blonde", hex: "#f5e6d3" },
  { code: "#613", label: "Gold Blonde", hex: "#f4d49e" },
  { code: "#24", label: "Medium Ash", hex: "#c9b5a0" },
  { code: "#18", label: "Honey Brown", hex: "#d4a574" },
  { code: "#16", label: "Light Brown", hex: "#c9a570" },
  { code: "#14", label: "Medium Brown", hex: "#a0795f" },
  { code: "#12", label: "Dark Brown", hex: "#8b6f47" },
  { code: "#10", label: "Chestnut Brown", hex: "#6b5847" },
  { code: "#8", label: "Dark Chestnut", hex: "#5a4a3a" },
  { code: "#4", label: "Deep Brown", hex: "#3d3129" },
  { code: "#2", label: "Natural Hair", hex: "#1a1a1a" },
]

const BULK_COLOR_PLUS_30_CODES = new Set(["#4", "#8", "#10"])
const BULK_COLOR_PLUS_40_CODES = new Set(["#12", "#14", "#16", "#18", "#24", "#60", "#613", "#ash"])

function getBulkColorSurchargeDollars(colorCode: string): number {
  const normalized = colorCode.trim().toLowerCase()
  if (!normalized || normalized === "#2") {
    return 0
  }
  if (BULK_COLOR_PLUS_30_CODES.has(normalized)) {
    return 30
  }
  if (BULK_COLOR_PLUS_40_CODES.has(normalized)) {
    return 40
  }
  return 0
}

function getColorSurchargeDollars(category: string, colorCode: string, supportsColorSelection: boolean): number {
  if (!supportsColorSelection) {
    return 0
  }

  const normalized = colorCode.trim().toLowerCase()
  if (!normalized || normalized === "#2") {
    return 0
  }

  if (category === "Bulk Hair") {
    return getBulkColorSurchargeDollars(normalized)
  }

  return 15
}

function formatTextureLabel(imageSrc: string, fallbackName: string): string {
  const fileNameWithExt = imageSrc.split("/").pop() ?? ""
  let decoded = fileNameWithExt

  try {
    decoded = decodeURIComponent(fileNameWithExt)
  } catch {
    decoded = fileNameWithExt
  }

  const withoutExt = decoded.replace(/\.[^.]+$/, "")
  const normalized = withoutExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  const baseLabel = normalized || fallbackName

  return baseLabel
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^\d+$/.test(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default function OrderPage({ params }: PageProps) {
  const router = useRouter()
  const { slug } = use(params)
  const product = allProducts.find((p) => p.slug === slug)
  const suggestedScrollRef = useRef<HTMLDivElement | null>(null)
  const thumbnailRailRef = useRef<HTMLDivElement | null>(null)
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([])
  const mainImageFrameRef = useRef<HTMLDivElement | null>(null)
  const [selectedColorCode, setSelectedColorCode] = useState<string>("")
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [backToShopHref, setBackToShopHref] = useState("/")
  const [isHoverZoomActive, setIsHoverZoomActive] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 })
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false)

  useEffect(() => {
    const storedRoute = window.localStorage.getItem(LAST_VISITED_ROUTE_KEY)
    if (storedRoute && !storedRoute.startsWith("/order/") && !storedRoute.startsWith("/cart")) {
      setBackToShopHref(storedRoute)
      return
    }

    const referrer = document.referrer
    if (!referrer) {
      return
    }

    try {
      const refUrl = new URL(referrer)
      if (
        refUrl.origin === window.location.origin &&
        !refUrl.pathname.startsWith("/order/") &&
        !refUrl.pathname.startsWith("/cart")
      ) {
        setBackToShopHref(`${refUrl.pathname}${refUrl.search}${refUrl.hash}`)
      }
    } catch {
      // ignore invalid referrer
    }
  }, [])

  const handleBackToShopClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push(backToShopHref)
  }

  const isVirginStraightBulk = product?.slug === "virgin-straight-bulk"
  const colorImageFolder = product?.colorImageFolder
  const colorImageMap = product?.colorImageMap
  const resolvedColorImageMap = useMemo(() => {
    if (!product) {
      return {}
    }

    const map: Record<string, string> = {}

    for (const [code, src] of Object.entries(colorImageMap ?? {})) {
      map[code.toLowerCase()] = src
    }

    if (isVirginStraightBulk || colorImageFolder) {
      const colorList = product.colors ?? DEFAULT_HAIR_COLORS
      for (const color of colorList) {
        const normalizedCode = (color.code ?? "").toLowerCase()
        if (!normalizedCode || map[normalizedCode]) {
          continue
        }

        let fileKey = normalizedCode.replace(/[^a-z0-9]/gi, "")
        if (colorImageFolder && normalizedCode === "#ash") {
          fileKey = "%23ash"
        }
        if (!fileKey) {
          continue
        }

        if (colorImageFolder) {
          map[normalizedCode] = `${colorImageFolder}/${fileKey}.png`
          continue
        }

        map[normalizedCode] = `/images/${fileKey}.png`
      }
    }

    return map
  }, [colorImageFolder, colorImageMap, isVirginStraightBulk, product])
  const [availableColorImageMap, setAvailableColorImageMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!product) {
      setAvailableColorImageMap({})
      return
    }

    let mounted = true
    const entries = Object.entries(resolvedColorImageMap)

    if (entries.length === 0) {
      setAvailableColorImageMap({})
      return
    }

    const checkAvailability = async () => {
      const results = await Promise.all(
        entries.map(async ([code, src]) => {
          try {
            const response = await fetch(src, { method: "GET" })
            if (response.ok) {
              return [code, src] as const
            }
          } catch {
            // ignore missing files
          }
          return null
        })
      )

      if (!mounted) {
        return
      }

      const nextMap: Record<string, string> = {}
      for (const result of results) {
        if (result) {
          nextMap[result[0]] = result[1]
        }
      }
      setAvailableColorImageMap(nextMap)
    }

    void checkAvailability()

    return () => {
      mounted = false
    }
  }, [product, resolvedColorImageMap])

  const galleryImages = useMemo(() => {
    if (!product) {
      return []
    }

    const productGallery = product.gallery ?? []
    const mergedImages = [product.image, ...productGallery, ...Object.values(availableColorImageMap)]
    return Array.from(new Set(mergedImages.filter(Boolean)))
  }, [product, availableColorImageMap])
  const activeImageSrc = galleryImages[activeImageIndex] ?? product?.image ?? ""

  const textureOptions = useMemo(() => {
    if (!product || product.category !== "Weft Hair") {
      return [] as Array<{ key: string; image: string; label: string }>
    }

    const hairOnlyImages = galleryImages.filter((src) => !src.toLowerCase().includes("/model"))
    const textureImages = hairOnlyImages.length > 0 ? hairOnlyImages : galleryImages

    return textureImages.map((imageSrc) => ({
      key: imageSrc,
      image: imageSrc,
      label: formatTextureLabel(imageSrc, product.name),
    }))
  }, [galleryImages, product])

  const activeTextureOption = useMemo(() => {
    if (textureOptions.length === 0) {
      return null
    }
    const exactMatch = textureOptions.find((option) => option.image === activeImageSrc)
    if (exactMatch) {
      return exactMatch
    }

    const activeLabel = formatTextureLabel(activeImageSrc, "")
    const relatedMatch = textureOptions.find((option) => {
      const optionLabel = option.label.toLowerCase()
      const targetLabel = activeLabel.toLowerCase()
      return targetLabel.includes(optionLabel) || optionLabel.includes(targetLabel)
    })

    return relatedMatch ?? textureOptions[0]
  }, [activeImageSrc, textureOptions])

  useEffect(() => {
    setSelectedColorCode("")
    setActiveImageIndex(0)
    setIsHoverZoomActive(false)
  }, [slug])

  useEffect(() => {
    if (!product) {
      return
    }

    if (!selectedColorCode) {
      setActiveImageIndex(0)
      return
    }
    const normalized = selectedColorCode.toLowerCase()
    const colorImage = availableColorImageMap[normalized]

    if (colorImage) {
      const matchedImageIndex = galleryImages.findIndex((imageSrc) => imageSrc === colorImage)
      if (matchedImageIndex >= 0) {
        setActiveImageIndex(matchedImageIndex)
        return
      }
    }
  }, [product, selectedColorCode, availableColorImageMap, galleryImages])

  useEffect(() => {
    thumbnailRefs.current = thumbnailRefs.current.slice(0, galleryImages.length)
  }, [galleryImages.length])

  useEffect(() => {
    const rail = thumbnailRailRef.current
    const targetThumb = thumbnailRefs.current[activeImageIndex]

    if (!rail || !targetThumb) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const railRect = rail.getBoundingClientRect()
      const thumbRect = targetThumb.getBoundingClientRect()

      const isAbove = thumbRect.top < railRect.top
      const isBelow = thumbRect.bottom > railRect.bottom
      const isLeft = thumbRect.left < railRect.left
      const isRight = thumbRect.right > railRect.right

      if (isAbove || isBelow || isLeft || isRight) {
        targetThumb.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        })
      }
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [activeImageIndex, galleryImages.length])

  const suggestedProducts = useMemo(() => {
    if (!product) {
      return []
    }

    const sameCategory = allProducts.filter((item) => item.slug !== product.slug && item.category === product.category)
    const otherProducts = allProducts.filter((item) => item.slug !== product.slug && item.category !== product.category)
    return [...sameCategory, ...otherProducts]
  }, [product])

  const scrollSuggestedProducts = (direction: "prev" | "next") => {
    const container = suggestedScrollRef.current
    if (!container) {
      return
    }

    const firstCard = container.querySelector<HTMLElement>('[data-suggest-card="true"]')
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 220
    const gap = 12
    const step = cardWidth + gap
    const left = direction === "next" ? step : -step
    container.scrollBy({ left, behavior: "smooth" })
  }

  const goToPrevImage = () => {
    if (galleryImages.length <= 1) {
      return
    }
    setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))
  }

  const goToNextImage = () => {
    if (galleryImages.length <= 1) {
      return
    }
    setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))
  }

  const handleMainImageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const frame = mainImageFrameRef.current
    if (!frame) {
      return
    }

    const rect = frame.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }

    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    setZoomOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }

  useEffect(() => {
    if (!isImageLightboxOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isImageLightboxOpen])

  useEffect(() => {
    if (!isImageLightboxOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImageLightboxOpen(false)
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))
        return
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isImageLightboxOpen, galleryImages.length])

  const productSchema = useMemo(() => {
    if (!product) {
      return null
    }

    const priceValues = parsePriceValues(product.price)
    const rawStartingPrice = priceValues.length > 0 ? Math.min(...priceValues) : product.basePrice
    const startingPrice = applyProductDiscount(rawStartingPrice)
    const images = Array.from(new Set([product.image, ...(product.gallery ?? [])])).filter(Boolean)

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.longDescription || product.description,
      category: product.category,
      sku: product.slug,
      image: images,
      brand: {
        "@type": "Brand",
        name: "CANDRA'S HAIR",
      },
      offers: {
        "@type": "Offer",
        url: `/order/${product.slug}`,
        priceCurrency: "USD",
        price: startingPrice.toFixed(2),
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    }
  }, [product])

  const categoryHref = useMemo(() => {
    if (!product) {
      return "/"
    }

    if (product.category === "Bulk Hair") {
      return "/bulk-hair"
    }
    if (product.category === "Weft Hair") {
      return "/weft-hair"
    }
    if (product.category === "Hair Extensions") {
      return "/extensions"
    }
    if (product.category === "Wigs") {
      return "/wigs"
    }

    return "/"
  }, [product])

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex flex-col items-center justify-center px-6 py-24">
          <h1 className="mb-4 text-3xl font-serif font-bold">Product Not Found</h1>
          <p className="mb-8 text-muted-foreground">The product you&apos;re looking for doesn&apos;t exist.</p>
          <Link href={backToShopHref} onClick={handleBackToShopClick}>
            <Button className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Shop
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eeeeef] pt-[102px] lg:pt-[108px]">
      {productSchema && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      <Navbar />

      <div className="mx-auto w-full max-w-[1520px] px-4 pb-12 sm:px-6 lg:px-8 xl:px-10">
        <nav aria-label="Breadcrumb" className="pt-3">
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
              <Link href={categoryHref} className="transition-colors hover:text-[#1f1f1f]">
                {product.category}
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#9a9aa0]">
              /
            </li>
            <li className="text-[#1f1f1f]">{product.name}</li>
          </ol>
        </nav>

        <div className="py-3 lg:py-4">
          <Link href={backToShopHref} onClick={handleBackToShopClick}>
            <Button
              variant="ghost"
              className="inline-flex items-center gap-2 px-0 text-sm text-muted-foreground/80 transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Shop
            </Button>
          </Link>
        </div>

        <article className="lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-4">
          <div className="p-0">
            <div
              className={`lg:grid lg:h-[min(74vh,680px)] lg:items-start lg:gap-3 ${
                galleryImages.length > 1 ? "lg:grid-cols-[74px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)]"
              }`}
            >
              {galleryImages.length > 1 && (
                <div
                  ref={thumbnailRailRef}
                  className={`mb-3 flex gap-2 overflow-x-auto pb-1 lg:mb-0 lg:h-full lg:self-start lg:flex-col lg:items-center lg:overflow-x-hidden lg:pb-0 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden ${
                    galleryImages.length < 5
                      ? "lg:justify-center lg:overflow-y-hidden lg:-translate-y-20"
                      : "lg:justify-start lg:overflow-y-auto"
                  }`}
                >
                  {galleryImages.map((imageSrc, index) => {
                    const isActive = index === activeImageIndex
                    return (
                      <button
                        key={`${imageSrc}-${index}`}
                        ref={(node) => {
                          thumbnailRefs.current[index] = node
                        }}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`relative h-[68px] w-[56px] shrink-0 overflow-hidden rounded-md transition-all ${
                          isActive ? "ring-2 ring-[#262626]/45" : "hover:scale-[1.02]"
                        }`}
                        aria-label={`View image ${index + 1}`}
                      >
                        <Image
                          src={imageSrc}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          fill
                          unoptimized
                          sizes="74px"
                          className="object-contain object-center p-0.5"
                        />
                      </button>
                    )
                  })}
                </div>
              )}

              <div
                ref={mainImageFrameRef}
                className="relative aspect-[4/5] cursor-zoom-in overflow-hidden rounded-2xl bg-transparent lg:h-full lg:aspect-auto"
                onMouseEnter={() => setIsHoverZoomActive(true)}
                onMouseLeave={() => setIsHoverZoomActive(false)}
                onMouseMove={handleMainImageMouseMove}
                onClick={() => setIsImageLightboxOpen(true)}
              >
                <Image
                  src={activeImageSrc}
                  alt={product.name}
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }}
                  className={`object-contain object-center p-1 transition-transform duration-200 ease-out sm:p-2 ${
                    isHoverZoomActive ? "scale-[1.6]" : "scale-100"
                  }`}
                  priority
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/18 to-transparent" />

                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        goToPrevImage()
                      }}
                      className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4d4d7] bg-white/90 text-[#111] transition-colors hover:bg-white"
                      aria-label="Previous image"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        goToNextImage()
                      }}
                      className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#d4d4d7] bg-white/90 text-[#111] transition-colors hover:bg-white"
                      aria-label="Next image"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                        <path d="m9 6 6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </>
                )}

                <div className="absolute right-3 top-3 rounded-full bg-black/58 px-2.5 py-1 text-xs font-semibold text-white">
                  {activeImageIndex + 1}/{galleryImages.length}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6 lg:max-h-[calc(100vh-126px)] lg:overflow-y-auto lg:px-7 lg:py-7 lg:pr-2 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden xl:px-8">
            <h1 className="font-serif text-2xl font-semibold leading-tight text-[#101010] sm:text-3xl">
              {product.name}
            </h1>
            <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-[#555] sm:text-xs">
              {product.longDescription}
            </p>

            <SelectLengthComponent
              basePrice={product.basePrice}
              pricePerInch={product.pricePerInch}
              slug={product.slug}
              name={product.name}
              category={product.category}
              image={product.image}
              colorImageMap={availableColorImageMap}
              onColorChange={setSelectedColorCode}
              colors={product.colors}
              activePreviewImage={activeImageSrc}
              textureOptions={textureOptions}
              activeTextureKey={activeTextureOption?.key}
              activeTextureLabel={activeTextureOption?.label}
              onTextureSelect={(nextTextureKey) => {
                const nextIndex = galleryImages.findIndex((imageSrc) => imageSrc === nextTextureKey)
                if (nextIndex >= 0) {
                  setActiveImageIndex(nextIndex)
                }
              }}
            />
          </div>
        </article>

        {isImageLightboxOpen && (
          <div className="fixed inset-0 z-[130] bg-black/95">
            <button
              type="button"
              onClick={() => setIsImageLightboxOpen(false)}
              className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/30"
              aria-label="Close image preview"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-white/35 px-3 py-1 text-sm font-semibold text-white">
              {activeImageIndex + 1}/{galleryImages.length}
            </div>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPrevImage}
                  className="absolute left-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white text-[#111] transition-colors hover:bg-[#f3f3f4]"
                  aria-label="Previous image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goToNextImage}
                  className="absolute right-4 top-1/2 z-20 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white text-[#111] transition-colors hover:bg-[#f3f3f4]"
                  aria-label="Next image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </>
            )}

            <div className="flex h-full w-full items-center justify-center px-8 py-8 sm:px-16 sm:py-12">
              <div className="relative h-full w-full">
                <Image
                  src={activeImageSrc}
                  alt={`${product.name} full preview`}
                  fill
                  unoptimized
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        {suggestedProducts.length > 0 && (
          <section className="mt-5 border-t border-[#d8d8db] px-0 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b7b80]">Our Product</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollSuggestedProducts("prev")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d0d0d3] bg-white text-[#444] transition-colors hover:bg-[#f4f4f5]"
                  aria-label="Previous recommended products"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => scrollSuggestedProducts("next")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d0d0d3] bg-white text-[#444] transition-colors hover:bg-[#f4f4f5]"
                  aria-label="Next recommended products"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              ref={suggestedScrollRef}
              className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {suggestedProducts.map((item) => {
                const suggestedPrice = getDiscountedPriceLabel(item.price)

                return (
                  <Link
                    key={item.slug}
                    href={`/order/${item.slug}`}
                    data-suggest-card="true"
                    className="group w-[190px] min-w-[190px] shrink-0 snap-start rounded-xl border border-[#e0e0e3] bg-[#fcfcfd] p-2 transition-colors hover:border-[#c8c8cc] hover:bg-white sm:w-[210px] sm:min-w-[210px]"
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-[#ececef]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="px-0.5 pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7b7b80]">
                        {item.category}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold leading-snug text-[#111]">{item.name}</h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <p className="text-sm font-semibold leading-none text-[#111] tabular-nums">{suggestedPrice.discountedLabel}</p>
                        <p className="text-xs font-medium leading-none text-[#6f6f73] line-through tabular-nums">{suggestedPrice.originalLabel}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  )
}

function SelectLengthComponent({ 
  basePrice, 
  pricePerInch,
  slug,
  name,
  category,
  image,
  colorImageMap,
  onColorChange,
  colors,
  activePreviewImage,
  textureOptions = [],
  activeTextureKey,
  activeTextureLabel,
  onTextureSelect,
}: { 
  basePrice: number
  pricePerInch: number
  slug: string
  name: string
  category: string
  image: string
  colorImageMap?: Record<string, string>
  onColorChange?: (colorCode: string) => void
  colors?: Array<{ code: string; label: string; hex: string }>
  activePreviewImage?: string
  textureOptions?: Array<{ key: string; image: string; label: string }>
  activeTextureKey?: string
  activeTextureLabel?: string
  onTextureSelect?: (textureKey: string) => void
}) {
  const router = useRouter()
  const [selectedLength, setSelectedLength] = useState<string>("18")
  const [quantity, setQuantity] = useState<number>(1)
  const [selectedColorCode, setSelectedColorCode] = useState<string>("")
  const [selectedHairType, setSelectedHairType] = useState<"Bulk Hair" | "Weft Hair">("Bulk Hair")
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(true)
  const [isSpecsOpen, setIsSpecsOpen] = useState(true)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { addToCart } = useCart()
  const hasTextureOptions = textureOptions.length > 0
  const supportsHairTypeSelection = category === "Bulk Hair"
  const supportsColorSelection = ["Hair Extensions", "Bulk Hair"].includes(category) && !hasTextureOptions
  const availableColors =
    colors && colors.length > 0 ? colors : supportsColorSelection ? DEFAULT_HAIR_COLORS : []
  
  const lengths = [16, 18, 20, 22, 24, 26]
  const currentLength = parseInt(selectedLength)
  const normalizedColorCode = selectedColorCode.toLowerCase()
  const selectedColor = availableColors.find((color) => color.code.toLowerCase() === normalizedColorCode)
  const selectedColorLabel = selectedColor?.label ?? ""
  const selectedColorDisplay =
    selectedColorLabel && selectedColorCode
      ? `${selectedColorLabel} ${selectedColorCode}`
      : selectedColorLabel || selectedColorCode
  const selectedTextureOption =
    textureOptions.find((option) => option.key === activeTextureKey) ?? textureOptions[0]
  const activeTextureValue = activeTextureKey ?? selectedTextureOption?.key ?? ""
  const selectedTextureLabel = activeTextureLabel ?? selectedTextureOption?.label ?? ""
  const selectedOptionSuffix = hasTextureOptions ? selectedTextureLabel : selectedColorDisplay
  const textureLabel = name
    .replace(/\s*weft\s*/gi, " ")
    .replace(/\s*bulk\s*/gi, " ")
    .replace(/\s*wig\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
  const colorSurcharge = getColorSurchargeDollars(category, normalizedColorCode, supportsColorSelection)
  const baseSinglePrice = parseFloat((basePrice + (currentLength - 16) * pricePerInch).toFixed(2))
  const originalSinglePrice = parseFloat((baseSinglePrice + colorSurcharge).toFixed(2))
  const discountedSinglePrice = applyProductDiscount(originalSinglePrice)
  const originalGrandTotal = originalSinglePrice * quantity
  const discountedGrandTotal = discountedSinglePrice * quantity
  const discountedPriceClass = "text-xl font-semibold leading-none text-[#111] tabular-nums sm:text-2xl"
  const originalPriceClass = "text-sm font-medium leading-none text-[#7a7a7d] line-through tabular-nums sm:text-base"
  const reviewLabel = `${testimonialsCount} ${testimonialsCount === 1 ? "Review" : "Reviews"}`
  const selectedImage = hasTextureOptions
    ? activePreviewImage || selectedTextureOption?.image || image
    : normalizedColorCode && colorImageMap?.[normalizedColorCode]
      ? colorImageMap[normalizedColorCode]
      : image

  const handleQuantityChange = (value: number) => {
    const nextValue = Number.isFinite(value) ? Math.floor(value) : 1
    setQuantity(Math.min(MAX_ITEM_QUANTITY, Math.max(1, nextValue)))
  }

  const animateFlyToCart = (sourceButton: HTMLButtonElement) => {
    const cartCandidates = Array.from(
      document.querySelectorAll('[data-cart-target="true"]')
    ) as HTMLElement[]

    const cartTarget =
      cartCandidates.find((target) => {
        const rect = target.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }) ?? (document.querySelector('a[href="/cart"]') as HTMLElement | null)

    if (!cartTarget) {
      return Promise.resolve()
    }

    const sourceIcon = sourceButton.querySelector('[data-fly-source="true"]') as HTMLElement | null
    const sourceRect = (sourceIcon ?? sourceButton).getBoundingClientRect()
    const targetRect = cartTarget.getBoundingClientRect()

    const startX = sourceRect.left + sourceRect.width / 2
    const startY = sourceRect.top + sourceRect.height / 2
    const endX = targetRect.left + targetRect.width / 2
    const endY = targetRect.top + targetRect.height / 2

    const flyNode = document.createElement("div")
    flyNode.setAttribute("aria-hidden", "true")
    flyNode.style.position = "fixed"
    flyNode.style.left = `${startX - 18}px`
    flyNode.style.top = `${startY - 18}px`
    flyNode.style.width = "36px"
    flyNode.style.height = "36px"
    flyNode.style.borderRadius = "9999px"
    flyNode.style.background = "linear-gradient(135deg, #D4AF37, #C4951F)"
    flyNode.style.display = "flex"
    flyNode.style.alignItems = "center"
    flyNode.style.justifyContent = "center"
    flyNode.style.color = "#ffffff"
    flyNode.style.boxShadow = "0 12px 30px rgba(0,0,0,0.25)"
    flyNode.style.pointerEvents = "none"
    flyNode.style.zIndex = "9999"
    flyNode.style.transform = "translate(0, 0) scale(1)"
    flyNode.style.opacity = "1"
    flyNode.style.willChange = "transform, opacity"
    flyNode.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>'

    document.body.appendChild(flyNode)

    return new Promise<void>((resolve) => {
      const deltaX = endX - startX
      const deltaY = endY - startY
      const distance = Math.hypot(deltaX, deltaY)
      const curveLift = Math.min(140, Math.max(70, distance * 0.18))
      const samples = [0, 0.2, 0.4, 0.6, 0.8, 1]
      const flyKeyframes = samples.map((t) => {
        const x = deltaX * t
        const y = deltaY * t - 4 * curveLift * t * (1 - t)
        const scale = 1 - 0.8 * t
        const rotate = 8 * (1 - t)
        return {
          transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
          opacity: `${1 - 0.72 * t}`,
          offset: t,
        }
      })

      const flightAnimation = flyNode.animate(flyKeyframes, {
        duration: 420,
        easing: "linear",
        fill: "forwards",
      })

      let cleanedUp = false

      const cleanup = () => {
        if (cleanedUp) {
          return
        }

        cleanedUp = true
        flyNode.remove()
        cartTarget.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(1.16)" },
            { transform: "scale(0.97)" },
            { transform: "scale(1.05)" },
            { transform: "scale(1)" },
          ],
          { duration: 260, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
        )
        resolve()
      }

      flightAnimation.onfinish = cleanup
      flightAnimation.oncancel = cleanup
      window.setTimeout(cleanup, 700)
    })
  }

  const handleAddToCart = async (sourceButton: HTMLButtonElement) => {
    if (isAddingToCart) {
      return
    }

    setIsAddingToCart(true)
    await animateFlyToCart(sourceButton)
    addToCart({
      slug,
      name: selectedOptionSuffix ? `${name} - ${selectedOptionSuffix}` : name,
      category,
      length: currentLength,
      quantity,
      price: discountedSinglePrice,
      basePrice,
      pricePerInch,
      image: selectedImage,
      variant: hasTextureOptions ? selectedTextureLabel || "default" : selectedColorCode || "default",
    })
    setIsAddingToCart(false)
  }

  const [wishlistMessage, setWishlistMessage] = useState<string | null>(null)

  const handleAddToWishlist = async () => {
    setWishlistMessage(null)
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setWishlistMessage("Wishlist is not configured.")
      return
    }

    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      router.push("/login")
      return
    }

    addToWishlist(data.user.id, {
      slug,
      name: selectedOptionSuffix ? `${name} - ${selectedOptionSuffix}` : name,
      category,
      image: selectedImage,
      length: currentLength,
      variant: hasTextureOptions ? selectedTextureLabel || "default" : selectedColorCode || "default",
      basePrice,
      pricePerInch,
      addedAt: new Date().toISOString(),
    })

    setWishlistMessage("Saved to wishlist.")
  }

  return (
    <div className="mt-5 w-full min-w-0 space-y-5 overflow-x-hidden">
      <div>
        <div className="flex items-baseline gap-3">
          <p className={discountedPriceClass}>{formatUsdPrice(discountedSinglePrice)}</p>
          <p className={originalPriceClass}>{formatUsdPrice(originalSinglePrice)}</p>
        </div>
      </div>

      {supportsHairTypeSelection && (
        <div>
          <p className="text-[15px] font-medium text-[#5f5f61] sm:text-base">Type: {selectedHairType}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedHairType("Bulk Hair")}
              className={`inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-all sm:h-11 sm:text-base ${
                selectedHairType === "Bulk Hair"
                  ? "border-black bg-black text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]"
                  : "border-[#d1d1d4] bg-white text-[#1f1f20] hover:bg-[#f5f5f6]"
              }`}
            >
              Bulk Hair
            </button>
            <button
              type="button"
              onClick={() => setSelectedHairType("Weft Hair")}
              className={`inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-all sm:h-11 sm:text-base ${
                selectedHairType === "Weft Hair"
                  ? "border-black bg-black text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]"
                  : "border-[#d1d1d4] bg-white text-[#1f1f20] hover:bg-[#f5f5f6]"
              }`}
            >
              Weft Hair
            </button>
          </div>
        </div>
      )}

      {hasTextureOptions && (
        <div>
          <p className="text-[15px] font-medium text-[#5f5f61] sm:text-base">Type: {selectedTextureLabel || "Default"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {textureOptions.map((option) => {
              const isSelectedTexture = option.key === activeTextureValue
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => onTextureSelect?.(option.key)}
                  className={`inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-all sm:h-11 sm:text-base ${
                    isSelectedTexture
                      ? "border-black bg-black text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]"
                      : "border-[#d1d1d4] bg-white text-[#1f1f20] hover:bg-[#f5f5f6]"
                  }`}
                  aria-label={`Select texture ${option.label}`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!hasTextureOptions && availableColors.length > 0 && (
        <div>
          <p className="text-[15px] font-medium text-[#5f5f61] sm:text-base">Color: {selectedColorDisplay || "Default"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableColors.map((color) => {
              const isSelectedColor = selectedColorCode.toLowerCase() === color.code.toLowerCase()
              return (
                <button
                  key={color.code}
                  type="button"
                  onClick={() => {
                    setSelectedColorCode(color.code)
                    onColorChange?.(color.code)
                  }}
                  className={`relative h-10 w-10 rounded-full border transition-all sm:h-11 sm:w-11 ${
                    isSelectedColor ? "border-black p-1 shadow-[0_0_0_2px_rgba(0,0,0,0.2)]" : "border-[#7c7c7f]"
                  }`}
                  title={`${color.label} (${color.code})`}
                  aria-label={`Select color ${color.label}`}
                >
                  <span
                    className="block h-full w-full rounded-full border border-black/10"
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-[15px] font-medium text-[#5f5f61] sm:text-base">Size: {currentLength}&quot;</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lengths.map((length) => {
            const isSelected = selectedLength === length.toString()
            return (
              <button
                key={length}
                type="button"
                onClick={() => setSelectedLength(length.toString())}
                className={`inline-flex h-10 min-w-[48px] items-center justify-center rounded-full px-3 text-sm font-semibold transition-all sm:h-11 sm:min-w-[54px] sm:text-[15px] ${
                  isSelected
                    ? "bg-black text-white shadow-[0_10px_24px_-14px_rgba(0,0,0,0.6)]"
                    : "bg-[#ececee] text-[#121212] hover:bg-[#e2e2e4]"
                }`}
              >
                {length}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3 border-y border-[#d6d6d8] py-4">
        <ul className="space-y-1.5 rounded-lg border border-[#cfcfd2] bg-[#f8f8f8] px-3 py-2.5 text-[14px] text-[#232323]">
          {[
            "100% Human Hair",
            "Minimal Shedding",
            "Free Shipping Available",
            "In Stock & Ready to Ship",
            "Heat Resistant & Curlable",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d9ead7] text-[#2f7a38]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3 w-3" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/#testimonials"
          className="block rounded-lg border border-[#cfcfd2] bg-white px-3 py-2.5 transition-colors hover:bg-[#f7f7f7]"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#77777a]">Customer Reviews</p>
          <div className="mt-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <svg key={index} viewBox="0 0 24 24" className="h-4 w-4 fill-[#111]" aria-hidden="true">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            ))}
            <span className="ml-2 text-sm font-semibold text-[#121212]">{reviewLabel}</span>
          </div>
          <p className="mt-1 text-xs text-[#6a6a6d] sm:text-sm">Tap to read testimonials</p>
        </Link>

        <div className="rounded-lg border border-[#cfcfd2] bg-white px-4 py-3">
          <p className="text-sm text-[#6a6a6d]">Subtotal</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className={discountedPriceClass}>{formatUsdPrice(discountedGrandTotal)}</p>
            <p className={originalPriceClass}>{formatUsdPrice(originalGrandTotal)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.2fr] items-end gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a7a7d]">Quantity</p>
          <div className="flex h-12 items-center rounded-2xl border border-[#d4d4d8] bg-white px-2 py-1 shadow-[0_8px_22px_-18px_rgba(0,0,0,0.45)] sm:h-14 sm:px-2.5">
            <button
              type="button"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-xl font-light leading-none text-[#6f6f73] transition-colors hover:border-[#dedee2] hover:bg-[#f2f2f4] hover:text-[#3f3f42] disabled:cursor-not-allowed disabled:opacity-35 sm:h-9 sm:w-9"
            >
              -
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={quantity}
              onChange={(event) => handleQuantityChange(parseInt(event.target.value.replace(/\D/g, ""), 10) || 1)}
              className="h-full w-full bg-transparent text-center text-xl font-semibold text-[#111] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= MAX_ITEM_QUANTITY}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-xl font-light leading-none text-[#6f6f73] transition-colors hover:border-[#dedee2] hover:bg-[#f2f2f4] hover:text-[#3f3f42] disabled:cursor-not-allowed disabled:opacity-35 sm:h-9 sm:w-9"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={(event) => void handleAddToCart(event.currentTarget)}
          disabled={isAddingToCart}
          className="h-12 rounded-full bg-black px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#202022] disabled:cursor-not-allowed disabled:opacity-70 sm:h-14 sm:text-sm"
        >
          {isAddingToCart ? "ADDING..." : "ADD TO CART"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleAddToWishlist()}
          className="h-12 rounded-full border border-black bg-white px-5 text-xs font-semibold uppercase tracking-wide text-black transition-colors hover:bg-[#f5f5f6] sm:h-14 sm:text-sm"
        >
          ADD TO WISHLIST
        </button>
        {wishlistMessage && <p className="text-xs font-medium text-[#111]">{wishlistMessage}</p>}
      </div>

      <div className="border-t border-[#d8d8db] pt-4">
        <section className="px-0 py-3">
          <button
            type="button"
            onClick={() => setIsBenefitsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h3 className="text-lg font-semibold leading-none text-[#111]">Why Clients Pick This</h3>
            <span className="text-xl font-medium text-[#1f1f1f]">{isBenefitsOpen ? "-" : "+"}</span>
          </button>
          {isBenefitsOpen && (
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-[#222]">
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="pt-0.5 text-[#1b1b1b]">✓</span>
                <span><strong>Double Drawn Quality</strong> - Our hair is double drawn, so it stays fuller from top to bottom with balanced thickness and even length.</span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="pt-0.5 text-[#1b1b1b]">✓</span>
                <span><strong>Styling Freedom</strong> - Wear it sleek, wavy, or curled while keeping a natural finish.</span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="pt-0.5 text-[#1b1b1b]">✓</span>
                <span><strong>Natural Blend</strong> - Soft texture and clean movement that sits smoothly with your own hair.</span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="pt-0.5 text-[#1b1b1b]">✓</span>
                <span><strong>Built for Repeat Use</strong> - Low tangling, low shedding, and reusable with proper care.</span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="pt-0.5 text-[#1b1b1b]">✓</span>
                <span><strong>Daily-Ready Comfort</strong> - Suitable for regular wear, events, and camera-ready looks.</span>
              </li>
            </ul>
          )}
        </section>

        <section className="border-t border-[#d8d8db] px-0 py-3">
          <button
            type="button"
            onClick={() => setIsSpecsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <h3 className="text-lg font-semibold leading-none text-[#111]">Product Details</h3>
            <span className="text-xl font-medium text-[#1f1f1f]">{isSpecsOpen ? "-" : "+"}</span>
          </button>
          {isSpecsOpen && (
            <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px] leading-relaxed text-[#212121] sm:grid-cols-[160px_1fr]">
              <dt className="font-medium text-[#111]">Texture</dt>
              <dd>{textureLabel || name}</dd>

              <dt className="font-medium text-[#111]">Color Option</dt>
              <dd>{selectedColorDisplay || "Default / Natural"}</dd>

              <dt className="font-medium text-[#111]">Hair Type</dt>
              <dd>100% Human Hair</dd>

              <dt className="font-medium text-[#111]">Quality</dt>
              <dd>Double Drawn</dd>

              <dt className="font-medium text-[#111]">Category</dt>
              <dd>{category}</dd>

              <dt className="font-medium text-[#111]">Selected Size</dt>
              <dd>{currentLength}&quot;</dd>

              <dt className="font-medium text-[#111]">Pack</dt>
              <dd>1 bundles</dd>

              <dt className="font-medium text-[#111]">Weight</dt>
              <dd>100 grams</dd>

              <dt className="font-medium text-[#111]">Single Price</dt>
              <dd>
                <span className={discountedPriceClass}>{formatUsdPrice(discountedSinglePrice)}</span>
                <span className={`ml-2 ${originalPriceClass}`}>{formatUsdPrice(originalSinglePrice)}</span>
              </dd>

              <dt className="font-medium text-[#111]">Coloring</dt>
              <dd>Suitable for professional toning or dyeing</dd>

              <dt className="font-medium text-[#111]">Wear Life</dt>
              <dd>Long-lasting with consistent maintenance</dd>
            </dl>
          )}
        </section>
      </div>
    </div>
  )
}
