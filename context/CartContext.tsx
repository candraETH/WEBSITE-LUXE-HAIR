"use client"

import { createContext, useContext, useState, ReactNode } from "react"

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
  addToCart: (item: CartItem) => void
  removeFromCart: (slug: string, length: number, variant?: string) => void
  updateQuantity: (slug: string, length: number, quantity: number, variant?: string) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

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
        updatedItems[existingIndex].quantity += newItem.quantity
        return updatedItems
      } else {
        // Add new item
        return [...prevItems, newItem]
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
    if (quantity < 1) {
      removeFromCart(slug, length, variant)
      return
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.slug === slug &&
        item.length === length &&
        (item.variant ?? "default") === variant
          ? { ...item, quantity }
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
