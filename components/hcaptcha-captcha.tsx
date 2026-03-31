"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"

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
}

const DEV_HCAPTCHA_SITE_KEY = "10000000-ffff-ffff-ffff-000000000001"

function getSiteKey() {
  const configured = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim() ?? ""
  if (configured) return configured
  if (process.env.NODE_ENV !== "production") {
    return DEV_HCAPTCHA_SITE_KEY
  }
  return ""
}

export function HCaptchaChallenge({ action, onTokenChange, resetKey = 0 }: HCaptchaProps) {
  const siteKey = getSiteKey()
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && Boolean(window.hcaptcha))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onTokenChange(null)
    setError(null)
  }, [action, onTokenChange, resetKey])

  useEffect(() => {
    if (typeof window !== "undefined" && window.hcaptcha) {
      setScriptReady(true)
    }
  }, [])

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.hcaptcha) {
      return
    }

    if (widgetIdRef.current && window.hcaptcha.remove) {
      window.hcaptcha.remove(widgetIdRef.current)
      widgetIdRef.current = null
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
      <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 px-4 py-3.5 text-sm text-muted-foreground">
        CAPTCHA is not configured yet.
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://js.hcaptcha.com/1/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        onError={() => setError("CAPTCHA failed to load. Please refresh and try again.")}
      />
      <div className="flex justify-center">
        <div ref={containerRef} className="min-h-[84px] min-w-[302px]" />
      </div>
      {process.env.NODE_ENV !== "production" && siteKey === DEV_HCAPTCHA_SITE_KEY ? (
        <p className="text-center text-[11px] leading-5 text-muted-foreground">
          Development CAPTCHA mode is using the hCaptcha test key. For localhost, use a hosts alias like
          `test.candrashair.local`.
        </p>
      ) : null}
      {error ? <p className="text-center text-[11px] font-medium text-red-500">{error}</p> : null}
    </>
  )
}
