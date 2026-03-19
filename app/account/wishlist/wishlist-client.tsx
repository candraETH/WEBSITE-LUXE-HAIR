"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/context/CartContext"
import { calculateCheckoutUnitPrice } from "@/lib/paypal/catalog"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { formatVariantDisplay } from "@/lib/variant-display"
import { readWishlist, removeFromWishlist, type WishlistItem } from "@/lib/wishlist"

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "ready"; userId: string; items: WishlistItem[] }

export function WishlistClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const { addToCart } = useCart()
  const [state, setState] = useState<UiState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }
    const client = supabase

    async function load() {
      const { data } = await client.auth.getUser()
      if (cancelled) return
      const user = data.user
      if (!user) {
        setState({ status: "signed_out" })
        return
      }
      const userId = user.id
      setState({ status: "ready", userId, items: readWishlist(userId) })
    }

    void load()
    const { data: subscription } = client.auth.onAuthStateChange(() => void load())
    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  if (state.status === "loading") {
    return <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">Loading...</div>
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
        You are not signed in.{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  const { userId, items } = state

  function refresh() {
    setState({ status: "ready", userId, items: readWishlist(userId) })
  }

  function handleRemove(item: WishlistItem) {
    removeFromWishlist(userId, item.slug, item.length, item.variant)
    refresh()
  }

  function handleAddToCart(item: WishlistItem) {
    let unitPrice = 0
    try {
      unitPrice = calculateCheckoutUnitPrice({ slug: item.slug, length: item.length, variant: item.variant })
    } catch {
      unitPrice = item.basePrice
    }

    addToCart({
      slug: item.slug,
      name: item.name,
      category: item.category,
      length: item.length,
      quantity: 1,
      price: unitPrice,
      basePrice: item.basePrice,
      pricePerInch: item.pricePerInch,
      image: item.image,
      variant: item.variant,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Wishlist</h2>
          <p className="text-sm text-muted-foreground">Saved products you can add to cart later.</p>
        </div>
        <Badge variant="outline">{items.length} item(s)</Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
          Your wishlist is empty.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={`${item.slug}-${item.length}-${item.variant}`} className="rounded-2xl border border-border/30 bg-card/60 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.category} · {item.length}&quot; · {formatVariantDisplay(item.variant) || item.variant || "Default"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/order/${encodeURIComponent(item.slug)}`}>View product</Link>
                  </Button>
                  <Button size="sm" onClick={() => handleAddToCart(item)}>
                    Add to cart
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRemove(item)}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
