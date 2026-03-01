export type CatalogProduct = {
  name: string
  slug: string
  price: string
  image?: string
  images?: string[]
  category: string
  description: string
  tag?: string
}

export const BULK_PRODUCTS: CatalogProduct[] = [
  {
    name: "Virgin Straight Bulk",
    slug: "virgin-straight-bulk",
    price: "$70 - $160",
    image: "/images/images1.png",
    category: "Bulk Hair",
    description: "100% virgin hair without weft. Perfect for braiding and custom wig making.",
  },
  {
    name: "Natural Braiding Hair",
    slug: "natural-braiding-hair",
    price: "$60 - $140",
    image: "/images/Natural%20Braiding%20Hair/Natural%20Braiding%20Hair%201.png",
    category: "Bulk Hair",
    description: "Soft, tangle-free bulk hair ideal for box braids and twists.",
    tag: "Popular",
  },
  {
    name: "Wavy Bulk Premium",
    slug: "wavy-bulk-premium",
    price: "$85 - $180",
    image: "/images/Wavy%20Bulk%20Premium/Wavy%20Bulk%20Premium.png",
    category: "Bulk Hair",
    description: "Premium grade wavy bulk hair. Unprocessed, can be colored to any shade.",
    tag: "New",
  },
]
