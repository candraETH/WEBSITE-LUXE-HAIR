"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Avoid logging potentially sensitive runtime state; keep it minimal.
    console.error("App error boundary triggered", {
      name: error.name,
      digest: error.digest ?? null,
    })
  }, [error])

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-background/50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-border/40 bg-card/80 p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Something went wrong</p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">We hit an unexpected error</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Please try again. If the problem continues, contact support.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={() => reset()} className="w-full">
            Try again
          </Button>
          <Link href="/" className="w-full">
            <Button type="button" variant="outline" className="w-full">
              Back to home
            </Button>
          </Link>
        </div>

        {process.env.NODE_ENV !== "production" ? (
          <pre className="mt-6 max-h-48 overflow-auto rounded-lg border border-border/40 bg-background/60 p-3 text-xs text-muted-foreground">
            {String(error.message || "Unknown error")}
          </pre>
        ) : null}
      </div>
    </main>
  )
}

