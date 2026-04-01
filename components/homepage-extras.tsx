"use client"

import dynamic from "next/dynamic"

const Testimonials = dynamic(() => import("@/components/testimonials").then((mod) => mod.Testimonials), {
  ssr: false,
  loading: () => null,
})
const WhatsAppFloat = dynamic(() => import("@/components/whatsapp-float").then((mod) => mod.WhatsAppFloat), {
  ssr: false,
  loading: () => null,
})

export function HomepageExtras() {
  return (
    <>
      <Testimonials />
      <WhatsAppFloat />
    </>
  )
}
