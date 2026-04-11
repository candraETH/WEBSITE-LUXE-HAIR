"use client"

import { CartProvider } from "@/context/CartContext"
import { LocaleProvider } from "@/context/LocaleContext"
import { LAST_VISITED_ROUTE_KEY } from "@/lib/navigation-state"
import { WelcomeCouponPopup } from "@/components/welcome-coupon-popup"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect } from "react"
import { stripLocaleFromPathname, type SupportedLocale } from "@/lib/i18n"

function RouteMemory() {
  const pathname = usePathname()

  useEffect(() => {
    const effectivePath = pathname ? stripLocaleFromPathname(pathname) : ""
    if (!pathname || effectivePath.startsWith("/cart")) {
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
    <CartProvider>{children}</CartProvider>
  )
}

export function AppProviders({
  children,
  locale,
}: {
  children: ReactNode
  locale: SupportedLocale
}) {
  return (
    <LocaleProvider initialLocale={locale}>
      <Providers>
        <RouteMemory />
        <WelcomeCouponPopup />
        {children}
      </Providers>
    </LocaleProvider>
  )
}
