"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
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
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const authEnabled = Boolean(supabase)

  const loginSchema = z.object({
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(1, "Password is required."),
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
          "Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.",
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

      setSuccessMessage("Signed in successfully.")
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
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
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
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root?.message && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
          )}
          {successMessage && <p className="text-sm text-foreground">{successMessage}</p>}

          <Button type="submit" className="w-full" disabled={!authEnabled || isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>

           <p className="text-center text-sm text-muted-foreground">
             New here?{" "}
             <Link
               href={`/register${(() => {
                 const safeNext = sanitizeInternalPath(nextPath) ?? "/account/address/new"
                 const safeReturnTo = sanitizeInternalPath(returnTo)
                 const params = new URLSearchParams({ next: safeNext })
                 if (safeReturnTo) params.set("returnTo", safeReturnTo)
                 return `?${params.toString()}`
               })()}`}
               className="font-medium text-foreground underline underline-offset-4"
             >
               Create an account
             </Link>
           </p>
        </form>
      </Form>
    </div>
  )
}
