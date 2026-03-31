"use client"

import Script from "next/script"
import { useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
          "chalexpired-callback"?: () => void
          size?: "normal" | "compact" | "invisible"
          theme?: "light" | "dark"
          language?: string
        }
      ) => string
      reset: (widgetId?: string) => void
      remove?: (widgetId: string) => void
    }
  }
}

type HCaptchaProps = {
  action: "login" | "register"
  onTokenChange: (token: string | null) => void
  resetKey?: number
  label?: string
}

function getSiteKey() {
  return process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim() ?? ""
}

export function HCaptchaChallenge({ action, onTokenChange, resetKey = 0, label }: HCaptchaProps) {
  const siteKey = getSiteKey()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const caption = useMemo(() => label ?? "Security check", [label])

  useEffect(() => {
    onTokenChange(null)
    setError(null)
  }, [action, onTokenChange, resetKey])

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.hcaptcha) {
      return
    }

    containerRef.current.innerHTML = ""

    try {
      const widgetId = window.hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onTokenChange(token)
          setError(null)
        },
        "expired-callback": () => {
          onTokenChange(null)
          setError("CAPTCHA expired. Please try again.")
        },
        "error-callback": () => {
          onTokenChange(null)
          setError("CAPTCHA failed to load. Please refresh and try again.")
        },
        "chalexpired-callback": () => {
          onTokenChange(null)
          setError("CAPTCHA expired. Please try again.")
        },
        size: "normal",
        theme: "light",
      })

      widgetIdRef.current = widgetId
    } catch {
      onTokenChange(null)
      setError("CAPTCHA could not be rendered. Please refresh and try again.")
    }

    return () => {
      if (widgetIdRef.current && window.hcaptcha?.remove) {
        window.hcaptcha.remove(widgetIdRef.current)
      } else if (window.hcaptcha?.reset) {
        window.hcaptcha.reset(widgetIdRef.current ?? undefined)
      }
      widgetIdRef.current = null
    }
  }, [action, onTokenChange, resetKey, scriptReady, siteKey])

  if (!siteKey) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
        CAPTCHA is not configured yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {caption ? <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{caption}</p> : null}
      <Script
        src="https://js.hcaptcha.com/1/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("CAPTCHA failed to load. Please refresh and try again.")}
      />
      <div className="flex min-h-[88px] justify-center overflow-visible">
        <div ref={containerRef} className="min-h-[88px] min-w-[302px]" />
      </div>
      {error ? <p className="text-center text-xs font-medium text-red-500">{error}</p> : null}
    </div>
  )
}
