"use client"

export type WishlistItem = {
  slug: string
  name: string
  category: string
  image: string
  length: number
  variant: string
  basePrice: number
  pricePerInch: number
  addedAt: string
}

function getStorageKey(userId: string) {
  return `candrashair-wishlist-v1:${userId}`
}

export function readWishlist(userId: string): WishlistItem[] {
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(Boolean) as WishlistItem[]
  } catch {
    return []
  }
}

export function writeWishlist(userId: string, items: WishlistItem[]) {
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(items))
}

export function addToWishlist(userId: string, item: WishlistItem) {
  const current = readWishlist(userId)
  const exists = current.some((existing) => existing.slug === item.slug && existing.length === item.length && existing.variant === item.variant)
  if (exists) {
    return
  }
  writeWishlist(userId, [item, ...current])
}

export function removeFromWishlist(userId: string, slug: string, length: number, variant: string) {
  const current = readWishlist(userId)
  const next = current.filter((item) => !(item.slug === slug && item.length === length && item.variant === variant))
  writeWishlist(userId, next)
}

