"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

const COUNTRY_CALLING_CODES: Array<{ label: string; value: string }> = [
  { label: "Indonesia (+62)", value: "+62" },
  { label: "United States (+1)", value: "+1" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "Australia (+61)", value: "+61" },
  { label: "Singapore (+65)", value: "+65" },
  { label: "Malaysia (+60)", value: "+60" },
  { label: "Philippines (+63)", value: "+63" },
  { label: "Thailand (+66)", value: "+66" },
  { label: "Vietnam (+84)", value: "+84" },
  { label: "India (+91)", value: "+91" },
  { label: "China (+86)", value: "+86" },
  { label: "Japan (+81)", value: "+81" },
  { label: "South Korea (+82)", value: "+82" },
  { label: "United Arab Emirates (+971)", value: "+971" },
  { label: "Saudi Arabia (+966)", value: "+966" },
  { label: "Germany (+49)", value: "+49" },
  { label: "France (+33)", value: "+33" },
  { label: "Netherlands (+31)", value: "+31" },
  { label: "Brazil (+55)", value: "+55" },
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
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsSignIn, setNeedsSignIn] = useState(false)

  const authEnabled = Boolean(supabase)

  const registerSchema = z
    .object({
      fullName: z.string().trim().min(2, "Please enter your full name."),
      email: z.string().trim().email("Enter a valid email address."),
      phoneCountryCode: z
        .string()
        .trim()
        .regex(/^\+\d{1,4}$/, "Select a valid country code."),
      phoneNumber: z
        .string()
        .trim()
        .min(6, "Enter a valid phone number.")
        .max(14, "Enter a valid phone number.")
        .regex(/^\d+$/, "Phone number must contain digits only."),
      password: z.string().min(8, "Password must be at least 8 characters."),
      confirmPassword: z.string().min(1, "Please confirm your password."),
      agreeToTerms: z.boolean().refine((value) => value, "You must accept the terms to continue."),
    })
    .refine((values) => /^\+\d{8,15}$/.test(`${values.phoneCountryCode}${values.phoneNumber}`), {
      message: "Enter a valid phone number.",
      path: ["phoneNumber"],
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: "Passwords do not match.",
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

  async function handleSubmit(values: RegisterValues) {
    setSuccessMessage(null)
    setNeedsSignIn(false)
    form.clearErrors("root")

    if (!supabase) {
      form.setError("root", {
        message:
          "Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.",
      })
      return
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
            role: "user",
          },
        },
      })

      if (signUpError) {
        form.setError("root", { message: signUpError.message })
        return
      }

      if (!data.session) {
        setSuccessMessage("Account created. Please check your email to verify your account, then sign in.")
        setNeedsSignIn(true)
        return
      }

      setSuccessMessage("Account created successfully.")
      const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
      const safeReturnTo = sanitizeInternalPath(returnTo)
      router.push(appendReturnTo(safeNext, safeReturnTo))
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
      {!authEnabled && (
        <p className="mb-4 text-sm text-muted-foreground">
          Auth is not configured yet. Ask an admin to add Supabase public env variables (anon key).
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
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" placeholder="Your name" {...field} />
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
                  <FormLabel>Phone number</FormLabel>
                  <div className="flex overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <div className="w-[92px] shrink-0 border-r border-input">
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full rounded-none border-0 bg-transparent px-3 py-2 focus:ring-0 focus:ring-offset-0">
                            <span className={field.value ? "text-foreground" : "text-muted-foreground"}>
                              {field.value || "Code"}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRY_CALLING_CODES.map((code) => (
                              <SelectItem key={`${code.label}-${code.value}`} value={code.value}>
                                {code.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
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
                                placeholder="Phone number"
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

                  <FormDescription className="text-xs">Digits only. Select your country code first.</FormDescription>

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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    <span className="block">Use at least 8 characters.</span>
                    <span className="block">Lowercase, uppercase letters, digits and symbols</span>
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
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 rounded-xl border border-border/40 bg-background/40 p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Password strength</p>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {passwordStrength.label}
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
                    <FormLabel>I agree to the terms</FormLabel>
                    <FormDescription className="text-xs">
                      By creating an account, you agree to receive account-related emails.
                    </FormDescription>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

           {form.formState.errors.root?.message && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
           )}
           {successMessage && <p className="text-sm text-foreground">{successMessage}</p>}

           {needsSignIn && (
             <Button asChild type="button" variant="outline" className="w-full">
               <Link
                 href={`/login${(() => {
                   const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
                   const safeReturnTo = sanitizeInternalPath(returnTo)
                   const params = new URLSearchParams({ next: safeNext })
                   if (safeReturnTo) params.set("returnTo", safeReturnTo)
                   return `?${params.toString()}`
                 })()}`}
               >
                 Go to Sign In
               </Link>
             </Button>
           )}

           <Button type="submit" className="w-full" disabled={!authEnabled || isSubmitting}>
             {isSubmitting ? "Creating account..." : "Create account"}
           </Button>

           <p className="text-center text-sm text-muted-foreground">
             Already have an account?{" "}
             <Link
               href={`/login${(() => {
                 const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
                 const safeReturnTo = sanitizeInternalPath(returnTo)
                 const params = new URLSearchParams({ next: safeNext })
                 if (safeReturnTo) params.set("returnTo", safeReturnTo)
                 return `?${params.toString()}`
               })()}`}
               className="font-medium text-foreground underline underline-offset-4"
             >
               Sign in
             </Link>
           </p>
         </form>
       </Form>
     </div>
  )
}
