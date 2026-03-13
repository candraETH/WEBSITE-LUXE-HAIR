"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { getAppRoleFromMetadata } from "@/lib/roles"

type AdminState = { status: "loading" } | { status: "denied" } | { status: "allowed" }

export function AdminClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<AdminState>({ status: "loading" })

  useEffect(() => {
    let isCancelled = false
    if (!supabase) {
      setState({ status: "denied" })
      return
    }
    const client = supabase

    async function load() {
      const { data } = await client.auth.getUser()
      if (isCancelled) return

      const user = data.user
      if (!user) {
        setState({ status: "denied" })
        return
      }

      const metadataRole = getAppRoleFromMetadata(user.user_metadata)
      const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle()
      const profileRoleRaw = typeof profile?.role === "string" ? profile.role : ""
      const profileRole = profileRoleRaw.trim().toLowerCase() === "admin" ? "admin" : profileRoleRaw ? "user" : null
      const role = profileRole ?? metadataRole
      setState({ status: role === "admin" ? "allowed" : "denied" })
    }

    void load()

    const { data: subscription } = client.auth.onAuthStateChange(() => {
      void load()
    })

    return () => {
      isCancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  if (state.status === "loading") {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">Loading...</div>
  }

  if (state.status === "denied") {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Access denied.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/account">Go to account</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
      <p className="text-sm text-foreground">
        Welcome, admin. This is a placeholder dashboard—tell me what admin features you want here.
      </p>
    </div>
  )
}
