"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { HCaptchaChallenge } from "@/components/hcaptcha-captcha"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { withLocaleHref } from "@/lib/i18n"
import { useLocale } from "@/context/LocaleContext"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

const COUNTRY_CALLING_CODES: Array<{ country: string; dial: string }> = [
  { country: "Afghanistan", dial: "+93" },
  { country: "Albania", dial: "+355" },
  { country: "Algeria", dial: "+213" },
  { country: "Argentina", dial: "+54" },
  { country: "Australia", dial: "+61" },
  { country: "Austria", dial: "+43" },
  { country: "Bangladesh", dial: "+880" },
  { country: "Belgium", dial: "+32" },
  { country: "Brazil", dial: "+55" },
  { country: "Cambodia", dial: "+855" },
  { country: "Canada", dial: "+1" },
  { country: "Chile", dial: "+56" },
  { country: "China", dial: "+86" },
  { country: "Colombia", dial: "+57" },
  { country: "Czech Republic", dial: "+420" },
  { country: "Denmark", dial: "+45" },
  { country: "Egypt", dial: "+20" },
  { country: "Finland", dial: "+358" },
  { country: "France", dial: "+33" },
  { country: "Germany", dial: "+49" },
  { country: "Ghana", dial: "+233" },
  { country: "Greece", dial: "+30" },
  { country: "Hong Kong", dial: "+852" },
  { country: "Hungary", dial: "+36" },
  { country: "India", dial: "+91" },
  { country: "Indonesia", dial: "+62" },
  { country: "Ireland", dial: "+353" },
  { country: "Israel", dial: "+972" },
  { country: "Italy", dial: "+39" },
  { country: "Japan", dial: "+81" },
  { country: "Kenya", dial: "+254" },
  { country: "Laos", dial: "+856" },
  { country: "Malaysia", dial: "+60" },
  { country: "Mexico", dial: "+52" },
  { country: "Morocco", dial: "+212" },
  { country: "Myanmar", dial: "+95" },
  { country: "Nepal", dial: "+977" },
  { country: "Netherlands", dial: "+31" },
  { country: "New Zealand", dial: "+64" },
  { country: "Nigeria", dial: "+234" },
  { country: "Norway", dial: "+47" },
  { country: "Pakistan", dial: "+92" },
  { country: "Peru", dial: "+51" },
  { country: "Philippines", dial: "+63" },
  { country: "Poland", dial: "+48" },
  { country: "Portugal", dial: "+351" },
  { country: "Romania", dial: "+40" },
  { country: "Russia", dial: "+7" },
  { country: "Saudi Arabia", dial: "+966" },
  { country: "Singapore", dial: "+65" },
  { country: "South Africa", dial: "+27" },
  { country: "South Korea", dial: "+82" },
  { country: "Spain", dial: "+34" },
  { country: "Sri Lanka", dial: "+94" },
  { country: "Sweden", dial: "+46" },
  { country: "Switzerland", dial: "+41" },
  { country: "Taiwan", dial: "+886" },
  { country: "Thailand", dial: "+66" },
  { country: "Tunisia", dial: "+216" },
  { country: "Turkey", dial: "+90" },
  { country: "Ukraine", dial: "+380" },
  { country: "United Arab Emirates", dial: "+971" },
  { country: "United Kingdom", dial: "+44" },
  { country: "United States", dial: "+1" },
  { country: "Vietnam", dial: "+84" },
]

function getPasswordStrength(password: string): { score: number; label: string; barClassName: string } {
  const value = password ?? ""
  if (!value) return { score: 0, label: "Not set", barClassName: "bg-muted-foreground/30" }

  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^a-zA-Z0-9]/.test(value)) score += 1

  const normalized = Math.min(4, Math.max(0, score))
  if (normalized <= 1) return { score: normalized, label: "Weak", barClassName: "bg-red-500" }
  if (normalized === 2) return { score: normalized, label: "Fair", barClassName: "bg-orange-500" }
  if (normalized === 3) return { score: normalized, label: "Good", barClassName: "bg-blue-500" }
  return { score: normalized, label: "Strong", barClassName: "bg-emerald-500" }
}

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

export function RegisterForm({ nextPath, returnTo }: { nextPath?: string; returnTo?: string }) {
  const router = useRouter()
  const { locale } = useLocale()
  const isRu = locale === "ru"
  const localizedHref = (href: string) => withLocaleHref(href, locale)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const authEnabled = Boolean(supabase)
  const captchaConfigured = Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim())

  const registerSchema = z
    .object({
      fullName: z
        .string()
        .trim()
        .min(2, isRu ? "\u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448\u0435 \u043f\u043e\u043b\u043d\u043e\u0435 \u0438\u043c\u044f." : "Please enter your full name."),
      email: z
        .string()
        .trim()
        .email(isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 email-\u0430\u0434\u0440\u0435\u0441." : "Enter a valid email address."),
      phoneCountryCode: z
        .string()
        .trim()
        .regex(/^\+\d{1,4}$/, isRu ? "\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u043a\u043e\u0434 \u0441\u0442\u0440\u0430\u043d\u044b." : "Select a valid country code."),
      phoneNumber: z
        .string()
        .trim()
        .min(6, isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430." : "Enter a valid phone number.")
        .max(14, isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430." : "Enter a valid phone number.")
        .regex(/^\d+$/, isRu ? "\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430 \u0434\u043e\u043b\u0436\u0435\u043d \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u0442\u044c \u0442\u043e\u043b\u044c\u043a\u043e \u0446\u0438\u0444\u0440\u044b." : "Phone number must contain digits only."),
      password: z
        .string()
        .min(8, isRu ? "\u041f\u0430\u0440\u043e\u043b\u044c \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043d\u0435 \u043c\u0435\u043d\u0435\u0435 8 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432." : "Password must be at least 8 characters."),
      confirmPassword: z.string().min(1, isRu ? "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c." : "Please confirm your password."),
      agreeToTerms: z
        .boolean()
        .refine((value) => value, isRu ? "\u0412\u044b \u0434\u043e\u043b\u0436\u043d\u044b \u043f\u0440\u0438\u043d\u044f\u0442\u044c \u0443\u0441\u043b\u043e\u0432\u0438\u044f, \u0447\u0442\u043e\u0431\u044b \u043f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c." : "You must accept the terms to continue."),
    })
    .refine((values) => /^\+\d{8,15}$/.test(`${values.phoneCountryCode}${values.phoneNumber}`), {
      message: isRu ? "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0440\u0440\u0435\u043a\u0442\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430." : "Enter a valid phone number.",
      path: ["phoneNumber"],
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: isRu ? "\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442." : "Passwords do not match.",
      path: ["confirmPassword"],
    })

  type RegisterValues = z.infer<typeof registerSchema>

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneCountryCode: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  })

  const passwordStrength = getPasswordStrength(form.watch("password"))
  const passwordStrengthLabel = (() => {
    if (!isRu) return passwordStrength.label
    const map: Record<string, string> = {
      "Not set": "\u041d\u0435 \u0437\u0430\u0434\u0430\u043d\u043e",
      Weak: "\u0421\u043b\u0430\u0431\u044b\u0439",
      Fair: "\u0421\u0440\u0435\u0434\u043d\u0438\u0439",
      Good: "\u0425\u043e\u0440\u043e\u0448\u0438\u0439",
      Strong: "\u0421\u0438\u043b\u044c\u043d\u044b\u0439",
    }
    return map[passwordStrength.label] ?? passwordStrength.label
  })()

  async function handleSubmit(values: RegisterValues) {
    setSuccessMessage(null)
    setNeedsSignIn(false)
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
        body: JSON.stringify({ token: captchaToken, action: "register" }),
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
      const phone = `${values.phoneCountryCode}${values.phoneNumber}`
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            phone,
          },
        },
      })

      if (signUpError) {
        setCaptchaToken(null)
        setCaptchaResetKey((current) => current + 1)
        form.setError("root", { message: signUpError.message })
        return
      }

      if (!data.session) {
        setCaptchaToken(null)
        setCaptchaResetKey((current) => current + 1)
        setSuccessMessage(
          isRu
            ? "\u0410\u043a\u043a\u0430\u0443\u043d\u0442 \u0441\u043e\u0437\u0434\u0430\u043d. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 email \u0434\u043b\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f, \u0437\u0430\u0442\u0435\u043c \u0432\u043e\u0439\u0434\u0438\u0442\u0435."
            : "Account created. Please check your email to verify your account, then sign in."
        )
        setNeedsSignIn(true)
        return
      }

      setCaptchaToken(null)
      setCaptchaResetKey((current) => current + 1)
      setSuccessMessage(isRu ? "\u0410\u043a\u043a\u0430\u0443\u043d\u0442 \u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0441\u043e\u0437\u0434\u0430\u043d." : "Account created successfully.")
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{isRu ? "\u0418\u043c\u044f \u0438 \u0444\u0430\u043c\u0438\u043b\u0438\u044f" : "Full name"}</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="name"
                      placeholder={isRu ? "\u0412\u0430\u0448\u0435 \u0438\u043c\u044f" : "Your name"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneCountryCode"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{isRu ? "\u0422\u0435\u043b\u0435\u0444\u043e\u043d" : "Phone number"}</FormLabel>
                  <div className="flex overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <div className="w-[104px] shrink-0 border-r border-input">
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-country-code"
                          placeholder={isRu ? "\u041a\u043e\u0434" : "Code"}
                          list="country-calling-codes"
                          className="w-full rounded-none border-0 bg-transparent px-3 py-2 text-center text-sm tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
                          {...field}
                          onChange={(event) => {
                            const raw = event.target.value
                            const digitsOnly = raw.replace(/\D/g, "").slice(0, 4)
                            field.onChange(digitsOnly ? `+${digitsOnly}` : "")
                          }}
                        />
                      </FormControl>
                      <datalist id="country-calling-codes">
                        {COUNTRY_CALLING_CODES.map((entry) => (
                          <option key={`${entry.country}-${entry.dial}`} value={entry.dial}>
                            {entry.country}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field: phoneField }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Input
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                placeholder={isRu ? "\u041d\u043e\u043c\u0435\u0440 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430" : "Phone number"}
                                className="rounded-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                {...phoneField}
                                onChange={(event) => phoneField.onChange(event.target.value.replace(/\D/g, ""))}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormDescription className="text-xs">
                    {isRu
                      ? "\u0422\u043e\u043b\u044c\u043a\u043e \u0446\u0438\u0444\u0440\u044b. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u043a\u043e\u0434 \u0441\u0442\u0440\u0430\u043d\u044b."
                      : "Digits only. Enter your country code first."}
                  </FormDescription>

                  {(form.formState.errors.phoneCountryCode?.message || form.formState.errors.phoneNumber?.message) && (
                    <div className="space-y-1">
                      {form.formState.errors.phoneCountryCode?.message && (
                        <p className="text-sm font-medium text-destructive">{String(form.formState.errors.phoneCountryCode.message)}</p>
                      )}
                      {form.formState.errors.phoneNumber?.message && (
                        <p className="text-sm font-medium text-destructive">{String(form.formState.errors.phoneNumber.message)}</p>
                      )}
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{isRu ? "\u041f\u0430\u0440\u043e\u043b\u044c" : "Password"}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    <span className="block">
                      {isRu ? "\u041c\u0438\u043d\u0438\u043c\u0443\u043c 8 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432." : "Use at least 8 characters."}
                    </span>
                    <span className="block">
                      {isRu
                        ? "\u0421\u0442\u0440\u043e\u0447\u043d\u044b\u0435 \u0438 \u043f\u0440\u043e\u043f\u0438\u0441\u043d\u044b\u0435 \u0431\u0443\u043a\u0432\u044b, \u0446\u0438\u0444\u0440\u044b \u0438 \u0441\u0438\u043c\u0432\u043e\u043b\u044b"
                        : "Lowercase, uppercase letters, digits and symbols"}
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{isRu ? "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c" : "Confirm password"}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 rounded-xl border border-border/40 bg-background/40 p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  {isRu ? "\u041d\u0430\u0434\u0451\u0436\u043d\u043e\u0441\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044f" : "Password strength"}
                </p>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {passwordStrengthLabel}
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary">
                <div
                  className={`h-2 rounded-full transition-all ${passwordStrength.barClassName}`}
                  style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="agreeToTerms"
            render={({ field }) => (
              <FormItem className="space-y-2 rounded-xl border border-border/40 bg-background/40 p-4">
                <div className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {isRu ? "\u042f \u0441\u043e\u0433\u043b\u0430\u0441\u0435\u043d(\u043d\u0430) \u0441 \u0443\u0441\u043b\u043e\u0432\u0438\u044f\u043c\u0438" : "I agree to the terms"}
                    </FormLabel>
                    <FormDescription className="text-xs">
                      {isRu
                        ? "\u0421\u043e\u0437\u0434\u0430\u0432\u0430\u044f \u0430\u043a\u043a\u0430\u0443\u043d\u0442, \u0432\u044b \u0441\u043e\u0433\u043b\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044c \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u044c \u043f\u0438\u0441\u044c\u043c\u0430 \u043f\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0443."
                        : "By creating an account, you agree to receive account-related emails."}
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <HCaptchaChallenge
            action="register"
            resetKey={captchaResetKey}
            onTokenChange={setCaptchaToken}
            label={isRu ? "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u0438" : "Security check"}
          />

           {form.formState.errors.root?.message && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
           )}
           {successMessage && <p className="text-sm text-foreground">{successMessage}</p>}

           {needsSignIn && (
             <Button asChild type="button" variant="outline" className="w-full">
               <Link
                  href={`${localizedHref("/login")}${(() => {
                    const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
                    const safeReturnTo = sanitizeInternalPath(returnTo)
                    const params = new URLSearchParams({ next: localizedHref(safeNext) })
                    if (safeReturnTo) params.set("returnTo", localizedHref(safeReturnTo))
                    return `?${params.toString()}`
                  })()}`}
                >
                  {isRu ? "\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a\u043e \u0432\u0445\u043e\u0434\u0443" : "Go to Sign In"}
                </Link>
              </Button>
            )}

           <Button type="submit" className="w-full" disabled={!authEnabled || isSubmitting}>
              {isSubmitting
                ? isRu
                  ? "\u0421\u043e\u0437\u0434\u0430\u0451\u043c \u0430\u043a\u043a\u0430\u0443\u043d\u0442..."
                  : "Creating account..."
                : isRu
                  ? "\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442"
                  : "Create account"}
           </Button>

           <p className="text-center text-sm text-muted-foreground">
              {isRu ? "\u0423\u0436\u0435 \u0435\u0441\u0442\u044c \u0430\u043a\u043a\u0430\u0443\u043d\u0442?" : "Already have an account?"}{" "}
              <Link
                href={`${localizedHref("/login")}${(() => {
                  const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
                  const safeReturnTo = sanitizeInternalPath(returnTo)
                  const params = new URLSearchParams({ next: localizedHref(safeNext) })
                  if (safeReturnTo) params.set("returnTo", localizedHref(safeReturnTo))
                  return `?${params.toString()}`
                })()}`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {isRu ? "\u0412\u043e\u0439\u0442\u0438" : "Sign in"}
              </Link>
            </p>
         </form>
       </Form>
     </div>
  )
}
