"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

function authTabClassName(active: boolean) {
  return active
    ? "h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm transition-all duration-200"
    : "h-11 w-full rounded-xl bg-transparent text-muted-foreground transition-all duration-200 hover:bg-background/80 hover:text-foreground"
}

export function RegisterForm({ nextPath, returnTo }: { nextPath?: string; returnTo?: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const localizedHref = (href: string) => withLocaleHref(href, locale)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [step, setStep] = useState<"email" | "details">("email")

  const authEnabled = Boolean(supabase)
  const captchaConfigured = process.env.NODE_ENV === "production" || Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim())

  const registerSchema = z
    .object({
      email: z
        .string()
        .trim()
        .email(isRu ? "Введите корректный email-адрес." : "Enter a valid email address."),
      password: z
        .string()
        .min(8, isRu ? "Пароль должен быть не менее 8 символов." : "Password must be at least 8 characters."),
      confirmPassword: z.string().min(1, isRu ? "Подтвердите пароль." : "Please confirm your password."),
      newsletterOptIn: z.boolean().default(true),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: isRu ? "Пароли не совпадают." : "Passwords do not match.",
      path: ["confirmPassword"],
    })

  type RegisterValues = z.infer<typeof registerSchema>

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      newsletterOptIn: true,
    },
  })

  function buildOauthRedirectUrl() {
    if (typeof window === "undefined") return ""
    const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
    const safeReturnTo = sanitizeInternalPath(returnTo)
    const nextTarget = localizedHref(safeNext)
    const returnTarget = safeReturnTo ? localizedHref(safeReturnTo) : null
    return `${window.location.origin}${appendReturnTo(nextTarget, returnTarget)}`
  }

  async function handleGoogleSignIn() {
    setNeedsSignIn(false)
    form.clearErrors("root")

    if (!supabase) {
      toast.error(
        isRu
          ? "Авторизация не настроена. Обратитесь к администратору."
          : "Authentication is not configured. Please contact support.",
      )
      return
    }

    setIsSubmitting(true)
    try {
      const redirectTo = buildOauthRedirectUrl()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: redirectTo ? { redirectTo } : undefined,
      })

      if (error) {
        toast.error(error.message)
      }
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

  const loginHref = `${localizedHref("/login")}${(() => {
    const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
    const safeReturnTo = sanitizeInternalPath(returnTo)
    const params = new URLSearchParams({ next: localizedHref(safeNext) })
    if (safeReturnTo) params.set("returnTo", localizedHref(safeReturnTo))
    return `?${params.toString()}`
  })()}`

  async function handleContinueEmailStep() {
    setNeedsSignIn(false)
    form.clearErrors("root")

    const valid = await form.trigger("email")
    if (!valid) return

    setStep("details")
  }

  async function handleSubmit(values: RegisterValues) {
    setNeedsSignIn(false)
    form.clearErrors("root")

    if (!supabase) {
      toast.error(
        isRu
          ? "Авторизация не настроена. Обратитесь к администратору."
          : "Authentication is not configured. Please contact support.",
      )
      return
    }

    if (process.env.NODE_ENV === "production" && !captchaConfigured) {
      toast.error(
        isRu
          ? "CAPTCHA обязательна. Добавьте NEXT_PUBLIC_HCAPTCHA_SITE_KEY."
          : "CAPTCHA is required in production. Add NEXT_PUBLIC_HCAPTCHA_SITE_KEY.",
      )
      return
    }

    if (captchaConfigured) {
      if (!captchaToken) {
        toast.warning(
          isRu ? "Пожалуйста, пройдите CAPTCHA." : "Please complete the CAPTCHA verification.",
        )
        return
      }

      const captchaResponse = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken, action: "register" }),
      })

      const captchaPayload = (await captchaResponse.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!captchaResponse.ok || !captchaPayload.ok) {
        setCaptchaToken(null)
        setCaptchaResetKey((current) => current + 1)
        toast.error(
          captchaPayload.error ||
            (isRu ? "Не удалось пройти CAPTCHA." : "CAPTCHA verification failed. Please try again."),
        )
        return
      }
    }

    setIsSubmitting(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            marketing_opt_in: values.newsletterOptIn,
          },
        },
      })

      if (signUpError) {
        setCaptchaToken(null)
        setCaptchaResetKey((current) => current + 1)
        toast.error(signUpError.message)
        return
      }

      if (!data.session) {
        setCaptchaToken(null)
        setCaptchaResetKey((current) => current + 1)
        toast.success(
          isRu
            ? "🎉 Аккаунт создан! Проверьте email для подтверждения и войдите."
            : "🎉 Account created! Check your email to verify, then sign in.",
          {
            description: isRu
              ? "Мы отправили письмо со ссылкой для подтверждения."
              : "We've sent a verification link to your email.",
            duration: 8000,
          },
        )
        setNeedsSignIn(true)
        return
      }

      setCaptchaToken(null)
      setCaptchaResetKey((current) => current + 1)
      toast.success(
        isRu ? "🎉 Добро пожаловать!" : "🎉 Welcome to Candra's Hair!",
      )
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
    <div className="w-full rounded-[32px] border border-border/40 bg-card/95 p-5 shadow-[0_28px_90px_rgba(31,24,18,0.12)] backdrop-blur-xl sm:p-7">
      <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-border/60 bg-muted/40 p-1.5">
        <Button asChild variant="ghost" className={authTabClassName(true)}>
          <Link href={registerHref}>{isRu ? "Регистрация" : "Register"}</Link>
        </Button>
        <Button asChild variant="ghost" className={authTabClassName(false)}>
          <Link href={loginHref}>{isRu ? "Войти" : "Log In"}</Link>
        </Button>
      </div>

      {!authEnabled && (
        <p className="mt-5 rounded-2xl border border-dashed border-border/60 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
          {isRu
            ? "Авторизация ещё не настроена. Попросите администратора добавить публичные переменные Supabase."
            : "Auth is not configured yet. Ask an admin to add Supabase public env variables."}
        </p>
      )}

      <Form {...form}>
        <form
          onSubmit={
            step === "email"
              ? (event) => {
                  event.preventDefault()
                  void handleContinueEmailStep()
                }
              : form.handleSubmit(handleSubmit)
          }
          className="mt-6 space-y-5"
        >
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-center gap-3 rounded-2xl border-border/60 bg-white px-4 text-[15px] font-semibold text-foreground shadow-none transition-all duration-200 hover:-translate-y-px hover:bg-background/80 hover:text-foreground"
            onClick={() => void handleGoogleSignIn()}
            disabled={!authEnabled || isSubmitting}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
              <path
                fill="#4285F4"
                d="M21.35 11.1H12v2.9h5.35c-.23 1.34-1.03 2.48-2.15 3.24v2.69h3.47c2.03-1.87 3.2-4.61 3.2-8.03 0-.8-.07-1.53-.52-2.8z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.88 0 5.3-.95 7.07-2.57l-3.47-2.69c-.96.65-2.2 1.03-3.6 1.03-2.76 0-5.1-1.86-5.93-4.37H2.47v2.75A10 10 0 0 0 12 22z"
              />
              <path
                fill="#FBBC05"
                d="M6.07 13.4A6 6 0 0 1 5.74 12c0-.48.06-.95.18-1.4V7.85H2.47A10 10 0 0 0 2 12c0 1.61.39 3.13 1.07 4.47l3-2.3z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.56 0 2.97.54 4.08 1.6l3.06-3.06A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9.53 5.85l3.6 2.8C6.9 7.38 9.1 5.38 12 5.38z"
              />
            </svg>
            {isRu ? "Продолжить через Google" : "Continue with Google"}
          </Button>

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

          {step === "details" ? (
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                      {isRu ? "Пароль" : "Password"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="********"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                      {isRu ? "Подтвердите пароль" : "Confirm password"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={isRu ? "Подтвердите пароль" : "Confirm password"}
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
                name="newsletterOptIn"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          className="mt-0.5 h-5 w-5 rounded-sm border-[#313131] data-[state=checked]:border-[#313131] data-[state=checked]:bg-[#313131]"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="text-[15px] font-normal text-foreground">
                          {isRu ? "Отправлять мне новости и предложения" : "Email me with news and offers"}
                        </FormLabel>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <HCaptchaChallenge action="register" resetKey={captchaResetKey} onTokenChange={setCaptchaToken} />

              {needsSignIn ? (
                <Button asChild type="button" variant="outline" className="h-12 w-full rounded-2xl">
                  <Link href={loginHref}>{isRu ? "Перейти ко входу" : "Go to Sign In"}</Link>
                </Button>
              ) : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-primary/90"
                disabled={!authEnabled || isSubmitting}
              >
                {isSubmitting
                  ? isRu
                    ? "Создаём аккаунт..."
                    : "Creating account..."
                  : isRu
                    ? "Продолжить"
                    : "Create account"}
              </Button>

              <p className="text-center text-xs leading-5 text-muted-foreground">
                {isRu ? "Продолжая, вы соглашаетесь с нашими " : "By continuing, you agree to our "}
                <Link
                  href={localizedHref("/terms-of-service")}
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  {isRu ? "Условиями обслуживания" : "Terms of service"}
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <Button
                type="button"
                className="h-12 w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-primary/90"
                onClick={() => void handleContinueEmailStep()}
                disabled={!authEnabled || isSubmitting}
              >
                {isRu ? "Продолжить с email" : "Continue with email"}
              </Button>

              <FormField
                control={form.control}
                name="newsletterOptIn"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          className="mt-0.5 h-5 w-5 rounded-sm border-[#313131] data-[state=checked]:border-[#313131] data-[state=checked]:bg-[#313131]"
                        />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="text-[15px] font-normal text-foreground">
                          {isRu ? "Отправлять мне новости и предложения" : "Email me with news and offers"}
                        </FormLabel>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-center text-xs leading-5 text-muted-foreground">
                {isRu ? "Продолжая, вы соглашаетесь с нашими " : "By continuing, you agree to our "}
                <Link
                  href={localizedHref("/terms-of-service")}
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  {isRu ? "Условиями обслуживания" : "Terms of service"}
                </Link>
              </p>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
