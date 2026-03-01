"use client"

import { CartProvider } from "@/context/CartContext"
import { LAST_VISITED_ROUTE_KEY } from "@/lib/navigation-state"
import { WelcomeCouponPopup } from "@/components/welcome-coupon-popup"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect } from "react"

function RouteMemory() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith("/cart")) {
      return
    }

    const search = window.location.search ?? ""
    const hash = window.location.hash ?? ""
    const fullPath = `${pathname}${search}${hash}`
    window.localStorage.setItem(LAST_VISITED_ROUTE_KEY, fullPath)
  }, [pathname])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <RouteMemory />
      <WelcomeCouponPopup />
      {children}
    </CartProvider>
  )
}
