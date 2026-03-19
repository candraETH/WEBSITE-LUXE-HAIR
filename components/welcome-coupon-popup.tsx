"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/context/LocaleContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  COUPON_UPDATED_EVENT,
  getWelcomeCoupon,
  hasClaimedCoupon,
  markCouponClaimed,
  saveActiveCouponCode,
} from "@/lib/coupon"

export function WelcomeCouponPopup() {
  const coupon = getWelcomeCoupon()
  const pathname = usePathname()
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const [open, setOpen] = useState(false)
  const [alreadyClaimed, setAlreadyClaimed] = useState(false)

  useEffect(() => {
    if (pathname !== "/") {
      setOpen(false)
      return
    }

    setAlreadyClaimed(hasClaimedCoupon(coupon.code))
    setOpen(true)
  }, [coupon.code, pathname])

  const closePopup = () => {
    setOpen(false)
  }

  const handleClaimCoupon = () => {
    markCouponClaimed(coupon.code)
    saveActiveCouponCode(coupon.code)
    setOpen(false)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(COUPON_UPDATED_EVENT))
    }
  }

  const copy = isRu
    ? {
        imageAlt: "Премиальные коллекции волос",
        badge: "Подарок новым клиентам",
        title: "Купон на скидку 25%",
        description: "Используйте этот приветственный купон при оформлении заказа и сэкономьте на первой покупке.",
        codeLabel: "Промокод",
        useNow: "Использовать купон",
        claim: "Получить купон",
        later: "Позже",
        couponDescriptionFallback: "Скидка 25% на первый заказ.",
      }
    : {
        imageAlt: "Premium hair collections",
        badge: "New Visitor Gift",
        title: "Claim 25% Coupon",
        description: "Use this welcome coupon at checkout for extra savings on your first order.",
        codeLabel: "Coupon Code",
        useNow: "Use Coupon Now",
        claim: "Claim Coupon",
        later: "Maybe Later",
        couponDescriptionFallback: "25% off your first order.",
      }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closePopup()
          return
        }
        setOpen(nextOpen)
      }}
    >
      <DialogContent className="overflow-hidden border-[#D4AF37]/35 p-0 sm:max-w-xl">
        <div className="relative h-44">
          <Image
            src="/images/hero.jpg"
            alt={copy.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, 576px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
          <div className="absolute left-5 top-5 rounded-full bg-[#D4AF37] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#1b1814]">
            {copy.badge}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-serif text-3xl leading-none text-[#171411]">
              {copy.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {copy.description}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-dashed border-[#D4AF37]/60 bg-[#FFF7E6] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8A6510]">{copy.codeLabel}</p>
            <p className="mt-1 text-2xl font-bold tracking-wider text-[#1F1810]">{coupon.code}</p>
            <p className="mt-1 text-xs text-[#7A6A4A]">{coupon.description || copy.couponDescriptionFallback}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleClaimCoupon}
              className="bg-[#1F1810] text-white hover:bg-[#2A2218] sm:flex-1"
            >
              {alreadyClaimed ? copy.useNow : copy.claim}
            </Button>
            <Button type="button" variant="outline" onClick={closePopup} className="sm:flex-1">
              {copy.later}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
