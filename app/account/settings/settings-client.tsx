"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | {
      status: "ready"
      preferences: {
        marketingEmails: boolean
        orderUpdates: boolean
        securityAlerts: boolean
      }
    }

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

type PasswordValues = z.infer<typeof passwordSchema>

export function SettingsClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }
    const client = supabase

    async function load() {
      const { data } = await client.auth.getUser()
      if (cancelled) return
      const user = data.user
      if (!user) {
        setState({ status: "signed_out" })
        return
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
      const prefs = (metadata.preferences ?? {}) as Record<string, unknown>

      setState({
        status: "ready",
        preferences: {
          marketingEmails: Boolean(prefs.marketingEmails),
          orderUpdates: prefs.orderUpdates === false ? false : true,
          securityAlerts: prefs.securityAlerts === false ? false : true,
        },
      })
    }

    void load()
    const { data: subscription } = client.auth.onAuthStateChange(() => void load())
    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  if (state.status === "loading") {
    return <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">Loading...</div>
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
        You are not signed in.{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  async function handleChangePassword(values: PasswordValues) {
    setStatusMessage(null)
    setErrorMessage(null)
    if (!supabase) return

    const { error } = await supabase.auth.updateUser({ password: values.newPassword })
    if (error) {
      setErrorMessage(error.message)
      return
    }

    passwordForm.reset()
    setStatusMessage("Password updated successfully.")
  }

  async function handleSavePreferences() {
    setStatusMessage(null)
    setErrorMessage(null)
    if (!supabase) return
    if (state.status !== "ready") return

    const { error } = await supabase.auth.updateUser({
      data: {
        preferences: state.preferences,
      },
    })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setStatusMessage("Preferences saved.")
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <h2 className="mb-1 font-serif text-2xl font-bold text-foreground">Change password</h2>
        <p className="mb-6 text-sm text-muted-foreground">Update your password to keep your account secure.</p>

        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Save password</Button>
          </form>
        </Form>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <h2 className="mb-1 font-serif text-2xl font-bold text-foreground">Preferences</h2>
        <p className="mb-6 text-sm text-muted-foreground">Choose what emails and notifications you receive.</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Marketing emails</p>
              <p className="text-sm text-muted-foreground">Product updates and promotions.</p>
            </div>
            <Switch
              checked={state.preferences.marketingEmails}
              onCheckedChange={(checked) =>
                setState((prev) =>
                  prev.status === "ready"
                    ? { ...prev, preferences: { ...prev.preferences, marketingEmails: checked } }
                    : prev,
                )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Order updates</p>
              <p className="text-sm text-muted-foreground">Payment and shipping notifications.</p>
            </div>
            <Switch
              checked={state.preferences.orderUpdates}
              onCheckedChange={(checked) =>
                setState((prev) =>
                  prev.status === "ready"
                    ? { ...prev, preferences: { ...prev.preferences, orderUpdates: checked } }
                    : prev,
                )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Security alerts</p>
              <p className="text-sm text-muted-foreground">Important account security messages.</p>
            </div>
            <Switch
              checked={state.preferences.securityAlerts}
              onCheckedChange={(checked) =>
                setState((prev) =>
                  prev.status === "ready"
                    ? { ...prev, preferences: { ...prev.preferences, securityAlerts: checked } }
                    : prev,
                )
              }
            />
          </div>

          <Button variant="outline" onClick={() => void handleSavePreferences()}>
            Save preferences
          </Button>
        </div>
      </div>

      {errorMessage && <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-destructive">{errorMessage}</div>}
      {statusMessage && <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-foreground">{statusMessage}</div>}
    </div>
  )
}
