"use client"

import React from "react"
import Image from "next/image"
import useEmblaCarousel from "embla-carousel-react"

import { cn } from "@/lib/utils"

type ProductGalleryProps = {
  images: string[]
  alt?: string
  selectedIndex?: number
  onIndexChange?: (index: number) => void
  useContainFit?: boolean
}

export default function ProductGallery({
  images,
  alt,
  selectedIndex,
  onIndexChange,
  useContainFit = false,
}: ProductGalleryProps) {
  const [mainRef, mainApi] = useEmblaCarousel({ loop: false, align: "start" })
  const [thumbRef, thumbApi] = useEmblaCarousel({ containScroll: "keepSnaps", dragFree: true })
  const [selected, setSelected] = React.useState(0)
  const [canPrev, setCanPrev] = React.useState(false)
  const [canNext, setCanNext] = React.useState(false)
  const hasImages = images.length > 0
  const hasMultipleImages = images.length > 1

  React.useEffect(() => {
    if (!mainApi || !thumbApi) return

    const onSelect = () => {
      const index = mainApi.selectedScrollSnap()
      setSelected(index)
      thumbApi.scrollTo(index)
      setCanPrev(mainApi.canScrollPrev())
      setCanNext(mainApi.canScrollNext())
      onIndexChange?.(index)
    }

    onSelect()
    mainApi.on("select", onSelect)
    mainApi.on("reInit", onSelect)

    return () => {
      mainApi.off("select", onSelect)
      mainApi.off("reInit", onSelect)
    }
  }, [mainApi, thumbApi, onIndexChange])

  React.useEffect(() => {
    if (typeof selectedIndex === "number" && mainApi && selectedIndex >= 0 && selectedIndex < images.length) {
      mainApi.scrollTo(selectedIndex)
    }
  }, [selectedIndex, mainApi, images.length])

  if (!hasImages) {
    return (
      <div className="relative aspect-[3/4] w-full rounded-2xl bg-secondary shadow-2xl">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image available</div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0">
      <div className="relative w-full overflow-hidden rounded-2xl bg-secondary shadow-2xl">
        <div ref={mainRef} className="w-full overflow-hidden">
          <div className="flex">
            {images.map((src, i) => (
              <div key={i} className="min-w-full shrink-0 grow-0 basis-full">
                <div className="relative aspect-[3/4] bg-secondary">
                  <Image
                    src={src}
                    alt={alt ?? `Image ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={cn(
                      "transition-transform duration-700 ease-out hover:scale-110",
                      useContainFit ? "object-contain p-2" : "object-cover"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasMultipleImages && (
          <>
            <button
              aria-label="Previous image"
              onClick={() => mainApi?.scrollPrev()}
              disabled={!canPrev}
              className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/35 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              aria-label="Next image"
              onClick={() => mainApi?.scrollNext()}
              disabled={!canNext}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/40 bg-black/35 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/55 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4">
                <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white">
              {selected + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {hasMultipleImages && (
        <div ref={thumbRef} className="mt-4 w-full min-w-0 overflow-hidden">
          <div className="flex min-w-0 gap-2">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelected(i)
                  mainApi?.scrollTo(i)
                }}
                className={cn(
                  "relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border bg-white p-0 transition-all",
                  selected === i
                    ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40"
                    : "border-border/40 hover:border-[#D4AF37]/60"
                )}
                aria-label={`Open image ${i + 1}`}
              >
                <Image
                  src={src}
                  alt={alt ?? `Thumb ${i + 1}`}
                  fill
                  className={useContainFit ? "object-contain p-1" : "object-cover"}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
