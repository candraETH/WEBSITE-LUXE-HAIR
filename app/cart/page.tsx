"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useCart } from "@/context/CartContext"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { LAST_VISITED_ROUTE_KEY } from "@/lib/navigation-state"

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useCart()
  const [continueShoppingHref, setContinueShoppingHref] = useState("/")

  useEffect(() => {
    const storedRoute = window.localStorage.getItem(LAST_VISITED_ROUTE_KEY)
    if (storedRoute && !storedRoute.startsWith("/cart")) {
      setContinueShoppingHref(storedRoute)
      return
    }

    const referrer = document.referrer
    if (!referrer) {
      return
    }

    try {
      const refUrl = new URL(referrer)
      if (refUrl.origin === window.location.origin && !refUrl.pathname.startsWith("/cart")) {
        setContinueShoppingHref(`${refUrl.pathname}${refUrl.search}${refUrl.hash}`)
      }
    } catch {
      // ignore invalid referrer
    }
  }, [])

  if (items.length === 0) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50">
        <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-8 lg:py-10">
          <Link href="/">
            <Button variant="ghost" className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors">
              ← Back to Shop
            </Button>
          </Link>
        </div>

        <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-24">
          <div className="text-center">
            <h1 className="mb-4 font-serif text-4xl font-bold text-foreground">Your Cart is Empty</h1>
            <p className="mb-8 text-muted-foreground">Browse our collection and add some items to get started.</p>
            <Link href={continueShoppingHref}>
              <Button className="bg-[#D4AF37] hover:bg-[#C4951F] text-white">Continue Shopping</Button>
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    )
  }

  const totalPrice = getTotalPrice()

  const handleCheckout = () => {
    const itemsList = items
      .map(
        (item) =>
          `• ${item.name} (${item.length}") - ${item.quantity}x - $${(item.price * item.quantity).toFixed(2)}`
      )
      .join("\n")

    const message = encodeURIComponent(
      `Hi, I'd like to place an order with the following items:\n\n${itemsList}\n\nTotal: $${totalPrice.toFixed(2)}\n\nPlease confirm availability and proceed with the order. Thank you!`
    )

    window.open(`https://wa.me/6282234109177?text=${message}`, "_blank")
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-b from-background to-background/50">
      {/* Back Button */}
      <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-8 lg:py-10">
        <Link href="/">
          <Button variant="ghost" className="text-sm text-muted-foreground/70 hover:text-foreground transition-colors">
            ← Back to Shop
          </Button>
        </Link>
      </div>

      {/* Cart Section */}
      <div className="mx-auto max-w-7xl px-4 md:px-5 lg:px-6 py-8 lg:py-16">
        <h1 className="mb-2 font-serif text-5xl font-bold text-foreground">Shopping Cart</h1>
        <p className="mb-12 text-muted-foreground">{getTotalItems()} item(s) in your cart</p>

        <div className="grid gap-8 lg:gap-16 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <div
                key={`${item.slug}-${item.length}-${item.variant ?? "default"}-${index}`}
                className="flex flex-col gap-4 rounded-xl border border-border/30 bg-card/50 p-4 sm:flex-row sm:gap-6 sm:p-6 transition-all duration-300 hover:shadow-lg"
              >
                {/* Product Image */}
                <div className="relative h-24 w-24 sm:h-32 sm:w-32 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 96px, 128px"
                    className="object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-accent/80">
                      {item.category}
                    </p>
                    <h3 className="mb-2 font-serif text-lg sm:text-xl font-semibold text-foreground">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Length: <span className="font-semibold text-foreground">{item.length}"</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateQuantity(item.slug, item.length, item.quantity - 1, item.variant)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:text-foreground transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.slug,
                            item.length,
                            parseInt(e.target.value) || 1,
                            item.variant
                          )
                        }
                        className="w-12 text-center font-semibold text-foreground focus:outline-none border border-gray-300 rounded-md py-1"
                        min="1"
                      />
                      <button
                        onClick={() =>
                          updateQuantity(item.slug, item.length, item.quantity + 1, item.variant)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:text-foreground transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.slug, item.length, item.variant)}
                      className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end sm:justify-between">
                  <p className="text-xs sm:text-sm text-muted-foreground/80">
                    ${item.price.toFixed(2)} each
                  </p>
                  <p className="font-serif text-xl sm:text-2xl font-bold text-[#D4AF37]">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="h-fit">
            <div className="rounded-xl bg-gradient-to-b from-[#FBF8F3] to-[#FAF6F0] border border-[#D4AF37]/30 p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 lg:sticky lg:top-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37] mb-4">
                  Order Summary
                </p>

                <div className="space-y-3 border-b border-[#D4AF37]/20 pb-4">
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Subtotal</p>
                    <p className="font-semibold text-foreground">${totalPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Shipping</p>
                    <p className="text-right font-semibold text-foreground">Calculated at checkout</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <p className="text-gray-600">Tax</p>
                    <p className="text-right font-semibold text-foreground">Calculated at checkout</p>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <p className="font-semibold text-foreground">Total:</p>
                  <p className="font-serif text-2xl font-bold text-[#D4AF37]">
                    ${totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full group flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#25D366] to-[#20BA5A] px-8 py-4 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 transition-transform group-hover:scale-110">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span>Checkout via WhatsApp</span>
                </button>

                <Link href={continueShoppingHref} className="block">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>

                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="w-full text-sm font-semibold text-red-500 hover:text-red-700 transition-colors py-2"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="border-t border-[#D4AF37]/20 pt-4 text-xs text-gray-600 space-y-2">
                <p>✓ Free shipping on orders over $200</p>
                <p>✓ 30-day return policy</p>
                <p>✓ 24/7 customer support</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </main>
  )
}
