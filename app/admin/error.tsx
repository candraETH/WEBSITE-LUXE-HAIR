"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Admin error boundary triggered", {
      name: error.name,
      digest: error.digest ?? null,
    })
  }, [error])

  return (
    <main className="min-h-[60vh] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-2xl border border-border/40 bg-card/80 p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Admin error</p>
        <h1 className="mt-3 text-2xl font-bold text-foreground">This admin page failed to load</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Try again. If it keeps happening, refresh the page or check server logs.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button type="button" onClick={() => reset()} className="w-full">
            Retry
          </Button>
          <Link href="/admin" className="w-full">
            <Button type="button" variant="outline" className="w-full">
              Back to dashboard
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

