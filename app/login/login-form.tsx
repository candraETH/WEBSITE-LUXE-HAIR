"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
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

function authTabClassName(active: boolean) {
  return active
    ? "h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm transition-all duration-200"
    : "h-11 w-full rounded-xl bg-transparent text-muted-foreground transition-all duration-200 hover:bg-background/80 hover:text-foreground"
}

export function LoginForm({ nextPath, returnTo }: { nextPath?: string; returnTo?: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const localizedHref = (href: string) => withLocaleHref(href, locale)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const authEnabled = Boolean(supabase)
  const forgotPasswordHref = "mailto:support@candrashair.com?subject=Password%20Reset"

  const loginSchema = z.object({
    email: z.string().trim().email(isRu ? "Ð’Ð²ÐµÐ´Ð¸Ñ‚Ðµ ÐºÐ¾Ñ€Ñ€ÐµÐºÑ‚Ð½Ñ‹Ð¹ email-Ð°Ð´Ñ€ÐµÑ." : "Enter a valid email address."),
    password: z.string().min(1, isRu ? "ÐŸÐ°Ñ€Ð¾Ð»ÑŒ Ð¾Ð±ÑÐ·Ð°Ñ‚ÐµÐ»ÐµÐ½." : "Password is required."),
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
            ? "ÐÐ²Ñ‚Ð¾Ñ€Ð¸Ð·Ð°Ñ†Ð¸Ñ Ð½Ðµ Ð½Ð°ÑÑ‚Ñ€Ð¾ÐµÐ½Ð°. Ð”Ð¾Ð±Ð°Ð²ÑŒÑ‚Ðµ NEXT_PUBLIC_SUPABASE_URL Ð¸ NEXT_PUBLIC_SUPABASE_ANON_KEY Ð² Ð¿ÐµÑ€ÐµÐ¼ÐµÐ½Ð½Ñ‹Ðµ Ð¾ÐºÑ€ÑƒÐ¶ÐµÐ½Ð¸Ñ."
            : "Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })

      if (signInError) {
        form.setError("root", { message: signInError.message })
        return
      }

      setSuccessMessage(isRu ? "Ð’Ñ…Ð¾Ð´ Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÐµÐ½." : "Signed in successfully.")
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

  const registerHref = `${localizedHref("/register")}${(() => {
    const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
    const safeReturnTo = sanitizeInternalPath(returnTo)
    const params = new URLSearchParams({ next: localizedHref(safeNext) })
    if (safeReturnTo) params.set("returnTo", localizedHref(safeReturnTo))
    return `?${params.toString()}`
  })()}`

  return (
    <div className="w-full rounded-[32px] border border-border/40 bg-card/95 p-5 shadow-[0_28px_90px_rgba(31,24,18,0.12)] backdrop-blur-xl sm:p-7">
      <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-border/60 bg-muted/40 p-1.5">
        <Button asChild variant="ghost" className={authTabClassName(false)}>
          <Link href={registerHref}>{isRu ? "Ð ÐµÐ³Ð¸ÑÑ‚Ñ€Ð°Ñ†Ð¸Ñ" : "Register"}</Link>
        </Button>
        <Button asChild variant="ghost" className={authTabClassName(true)}>
          <Link href={localizedHref("/login")}>{isRu ? "Ð’Ð¾Ð¹Ñ‚Ð¸" : "Log In"}</Link>
        </Button>
      </div>

      {!authEnabled && (
        <p className="mt-5 rounded-2xl border border-dashed border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          {isRu
            ? "ÐÐ²Ñ‚Ð¾Ñ€Ð¸Ð·Ð°Ñ†Ð¸Ñ ÐµÑ‰Ñ‘ Ð½Ðµ Ð½Ð°ÑÑ‚Ñ€Ð¾ÐµÐ½Ð°. ÐŸÐ¾Ð¿Ñ€Ð¾ÑÐ¸Ñ‚Ðµ Ð°Ð´Ð¼Ð¸Ð½Ð¸ÑÑ‚Ñ€Ð°Ñ‚Ð¾Ñ€Ð° Ð´Ð¾Ð±Ð°Ð²Ð¸Ñ‚ÑŒ Ð¿ÑƒÐ±Ð»Ð¸Ñ‡Ð½Ñ‹Ðµ Ð¿ÐµÑ€ÐµÐ¼ÐµÐ½Ð½Ñ‹Ðµ Supabase (anon key)."
            : "Auth is not configured yet. Ask an admin to add Supabase public env variables (anon key)."}
        </p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                  {isRu ? "Email" : "Email"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="example@gmail.com"
                    className="h-12 rounded-2xl border-border/60 bg-background px-4 text-[15px] shadow-none transition-all duration-200 placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/60"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <div className="flex items-end justify-between gap-4">
                  <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                    {isRu ? "ÐŸÐ°Ñ€Ð¾Ð»ÑŒ" : "Password"}
                  </FormLabel>
                  <Button asChild variant="link" className="h-auto p-0 text-sm font-semibold text-accent">
                    <Link href={forgotPasswordHref}>{isRu ? "Ð—Ð°Ð±Ñ‹Ð»Ð¸ Ð¿Ð°Ñ€Ð¾Ð»ÑŒ?" : "Forgot Password?"}</Link>
                  </Button>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="********"
                    className="h-12 rounded-2xl border-border/60 bg-background px-4 text-[15px] shadow-none transition-all duration-200 placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/60"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.message && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
          )}
          {successMessage && <p className="text-sm text-foreground">{successMessage}</p>}

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-primary/90"
            disabled={!authEnabled || isSubmitting}
          >
            {isSubmitting
              ? isRu
                ? "Ð’Ñ…Ð¾Ð´..."
                : "Signing in..."
              : isRu
                ? "Ð’Ð¾Ð¹Ñ‚Ð¸"
                : "Sign in"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isRu ? "Ð’Ð¿ÐµÑ€Ð²Ñ‹Ðµ Ñƒ Ð½Ð°Ñ?" : "New here?"}{" "}
            <Link
              href={registerHref}
              className="font-semibold text-foreground underline underline-offset-4"
            >
              {isRu ? "Ð¡Ð¾Ð·Ð´Ð°Ñ‚ÑŒ Ð°ÐºÐºÐ°ÑƒÐ½Ñ‚" : "Create an account"}
            </Link>
          </p>
        </form>
      </Form>
    </div>
  )
}

