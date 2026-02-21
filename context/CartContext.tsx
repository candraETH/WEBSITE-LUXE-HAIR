"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export interface CartItem {
  slug: string
  name: string
  category: string
  length: number
  variant?: string
  quantity: number
  price: number
  basePrice: number
  pricePerInch: number
  image: string
}

interface CartContextType {
  items: CartItem[]
  isCartReady: boolean
  addToCart: (item: CartItem) => void
  removeFromCart: (slug: string, length: number, variant?: string) => void
  updateQuantity: (slug: string, length: number, quantity: number, variant?: string) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)
const CART_STORAGE_KEY = "candrashair-cart-v1"
export const MAX_ITEM_QUANTITY = 1000

function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") {
    return false
  }

  const candidate = item as Partial<CartItem>

  return (
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.category === "string" &&
    typeof candidate.length === "number" &&
    typeof candidate.quantity === "number" &&
    typeof candidate.price === "number" &&
    typeof candidate.basePrice === "number" &&
    typeof candidate.pricePerInch === "number" &&
    typeof candidate.image === "string"
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isCartReady, setIsCartReady] = useState(false)

  useEffect(() => {
    try {
      const savedItems = window.localStorage.getItem(CART_STORAGE_KEY)
      if (!savedItems) {
        return
      }

      const parsedItems: unknown = JSON.parse(savedItems)
      if (!Array.isArray(parsedItems)) {
        return
      }

      const normalizedItems = parsedItems.filter(isValidCartItem).map((item) => ({
        ...item,
        variant: item.variant?.trim() ? item.variant : undefined,
        quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(item.quantity))),
      }))

      setItems(normalizedItems)
    } catch {
      // ignore invalid persisted cart
    } finally {
      setIsCartReady(true)
    }
  }, [])

  useEffect(() => {
    if (!isCartReady) {
      return
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [isCartReady, items])

  const addToCart = (newItem: CartItem) => {
    setItems((prevItems) => {
      const newVariant = newItem.variant ?? "default"
      // Check if item with same slug, length, and variant already exists
      const existingIndex = prevItems.findIndex(
        (item) =>
          item.slug === newItem.slug &&
          item.length === newItem.length &&
          (item.variant ?? "default") === newVariant
      )

      if (existingIndex > -1) {
        // Update quantity if item exists
        const updatedItems = [...prevItems]
        const mergedQuantity = updatedItems[existingIndex].quantity + Math.max(1, Math.floor(newItem.quantity))
        updatedItems[existingIndex].quantity = Math.min(MAX_ITEM_QUANTITY, mergedQuantity)
        return updatedItems
      } else {
        // Add new item
        return [
          ...prevItems,
          {
            ...newItem,
            quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(newItem.quantity))),
          },
        ]
      }
    })
  }

  const removeFromCart = (slug: string, length: number, variant = "default") => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(item.slug === slug && item.length === length && (item.variant ?? "default") === variant)
      )
    )
  }

  const updateQuantity = (slug: string, length: number, quantity: number, variant = "default") => {
    const safeQuantity = Number.isFinite(quantity)
      ? Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(quantity)))
      : 1

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.slug === slug &&
        item.length === length &&
        (item.variant ?? "default") === variant
          ? { ...item, quantity: safeQuantity }
          : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalPrice = () => {
    return parseFloat(
      items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)
    )
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        isCartReady,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
