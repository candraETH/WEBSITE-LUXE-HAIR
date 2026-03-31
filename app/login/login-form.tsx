"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { HCaptchaChallenge } from "@/components/hcaptcha-captcha"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { withLocaleHref } from "@/lib/i18n"
import { useLocale } from "@/context/LocaleContext"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

function sanitizeInternalPath(path: string | undefined): string | null {
  const value = (path ?? "").trim()
  if (!value) return null
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  if (value.toLowerCase().startsWith("/\\") || value.toLowerCase().includes("://")) return null
  return value
}

function appendReturnTo(target: string, returnTo: string | null) {
  if (!returnTo) return target
  const joiner = target.includes("?") ? "&" : "?"
  return `${target}${joiner}returnTo=${encodeURIComponent(returnTo)}`
}

export function LoginForm({ nextPath, returnTo }: { nextPath?: string; returnTo?: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const localizedHref = (href: string) => withLocaleHref(href, locale)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const authEnabled = Boolean(supabase)
  const captchaConfigured = Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim())

  const loginSchema = z.object({
    email: z.string().trim().email(isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email-\u0430\u0434\u0440\u0435\u0441." : "Enter a valid email address."),
    password: z.string().min(1, isRu ? "\u041f\u0430\u0440\u043e\u043b\u044c \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u0435\u043d." : "Password is required."),
  })

  type LoginValues = z.infer<typeof loginSchema>

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function handleSubmit(values: LoginValues) {
    setSuccessMessage(null)
    form.clearErrors("root")

    if (!supabase) {
      form.setError("root", {
        message:
          isRu
            ? "\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0430. \u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 NEXT_PUBLIC_SUPABASE_URL \u0438 NEXT_PUBLIC_SUPABASE_ANON_KEY \u0432 \u043f\u0435\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 \u043e\u043a\u0440\u0443\u0436\u0435\u043d\u0438\u044f."
            : "Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.",
      })
      return
    }

    if (process.env.NODE_ENV === "production" && !captchaConfigured) {
      form.setError("root", {
        message:
          isRu
            ? "\u0414\u043b\u044f production \u043d\u0443\u0436\u043d\u0430 CAPTCHA. \u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 NEXT_PUBLIC_HCAPTCHA_SITE_KEY."
            : "CAPTCHA is required in production. Add NEXT_PUBLIC_HCAPTCHA_SITE_KEY.",
      })
      return
    }

    if (captchaConfigured) {
      if (!captchaToken) {
        form.setError("root", {
          message: isRu ? "\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u043f\u0440\u043e\u0439\u0434\u0438\u0442\u0435 CAPTCHA." : "Please complete the CAPTCHA.",
        })
        return
      }

      const captchaResponse = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken, action: "login" }),
      })

      const captchaPayload = (await captchaResponse.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!captchaResponse.ok || !captchaPayload.ok) {
        setCaptchaToken(null)
        setCaptchaResetKey((current) => current + 1)
        form.setError("root", {
          message:
            captchaPayload.error ||
            (isRu ? "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0439\u0442\u0438 CAPTCHA." : "Unable to verify CAPTCHA."),
        })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (signInError) {
        setCaptchaToken(null)
        setCaptchaResetKey((current) => current + 1)
        form.setError("root", { message: signInError.message })
        return
      }

      setCaptchaToken(null)
      setCaptchaResetKey((current) => current + 1)
      setSuccessMessage(isRu ? "\u0412\u0445\u043e\u0434 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d." : "Signed in successfully.")
      const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
      const safeReturnTo = sanitizeInternalPath(returnTo)
      const nextTarget = localizedHref(safeNext)
      const returnTarget = safeReturnTo ? localizedHref(safeReturnTo) : null
      router.push(appendReturnTo(nextTarget, returnTarget))
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
      {!authEnabled && (
        <p className="mb-4 text-sm text-muted-foreground">
          {isRu
            ? "\u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f \u0435\u0449\u0451 \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d\u0430. \u041f\u043e\u043f\u0440\u043e\u0441\u0438\u0442\u0435 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430 \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0435 env \u043f\u0435\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 Supabase (\u0430\u043d\u043e\u043d\u0438\u043c\u043d\u044b\u0439 \u043a\u043b\u044e\u0447)."
            : "Auth is not configured yet. Ask an admin to add Supabase public env variables (anon key)."}
        </p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isRu ? "Email" : "Email"}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{isRu ? "\u041f\u0430\u0440\u043e\u043b\u044c" : "Password"}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <HCaptchaChallenge
            action="login"
            resetKey={captchaResetKey}
            onTokenChange={setCaptchaToken}
            label={isRu ? "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438" : "Security check"}
          />

          {form.formState.errors.root?.message && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
          )}
          {successMessage && <p className="text-sm text-foreground">{successMessage}</p>}

          <Button type="submit" className="w-full" disabled={!authEnabled || isSubmitting}>
            {isSubmitting
              ? isRu
                ? "\u0412\u0445\u043e\u0434..."
                : "Signing in..."
              : isRu
                ? "\u0412\u043e\u0439\u0442\u0438"
                : "Sign in"}
          </Button>

           <p className="text-center text-sm text-muted-foreground">
             {isRu ? "\u0412\u043f\u0435\u0440\u0432\u044b\u0435 \u0443 \u043d\u0430\u0441?" : "New here?"}{" "}
             <Link
               href={`${localizedHref("/register")}${(() => {
                 const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
                 const safeReturnTo = sanitizeInternalPath(returnTo)
                 const params = new URLSearchParams({ next: localizedHref(safeNext) })
                 if (safeReturnTo) params.set("returnTo", localizedHref(safeReturnTo))
                 return `?${params.toString()}`
               })()}`}
               className="font-medium text-foreground underline underline-offset-4"
             >
               {isRu ? "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442" : "Create an account"}
             </Link>
           </p>
        </form>
      </Form>
    </div>
  )
}
