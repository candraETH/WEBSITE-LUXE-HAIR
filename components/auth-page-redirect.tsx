"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/context/LocaleContext"
import { withLocaleHref } from "@/lib/i18n"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

function sanitizeInternalPath(path: string | undefined): string | null {
  const value = (path ?? "").trim()
  if (!value) return null
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  if (value.toLowerCase().startsWith("/\\") || value.toLowerCase().includes("://")) return null
  return value
}

function resolveRedirectTarget(nextPath?: string, returnTo?: string) {
  return sanitizeInternalPath(nextPath) ?? sanitizeInternalPath(returnTo) ?? "/account/profile"
}

type AuthPageRedirectProps = {
  nextPath?: string
  returnTo?: string
}

export function AuthPageRedirect({ nextPath, returnTo }: AuthPageRedirectProps) {
  const router = useRouter()
  const { locale } = useLocale()

  useEffect(() => {
    const maybeClient = getSupabaseBrowserClient()
    if (!maybeClient) {
      return
    }
    const client: NonNullable<typeof maybeClient> = maybeClient

    let active = true
    const redirectTo = withLocaleHref(resolveRedirectTarget(nextPath, returnTo), locale)

    async function checkSession() {
      const { data } = await client.auth.getSession()
      if (!active) return
      if (data.session) {
        router.replace(redirectTo)
      }
    }

    void checkSession()

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      if (session) {
        router.replace(redirectTo)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [locale, nextPath, returnTo, router])

  return null
}
