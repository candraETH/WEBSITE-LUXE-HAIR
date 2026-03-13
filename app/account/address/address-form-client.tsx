"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { readAddresses, upsertAddress, type AddressRecord } from "@/lib/address-book"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required."),
  phone: z.string().trim().min(5, "Phone is required."),
  address: z.string().trim().min(5, "Address is required."),
  city: z.string().trim().min(2, "City is required."),
  province: z.string().trim().min(2, "Province is required."),
  postalCode: z.string().trim().min(3, "Postal code is required."),
  country: z.string().trim().min(2, "Country is required."),
})

type AddressValues = z.infer<typeof addressSchema>

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "ready"; userId: string; existing: AddressRecord | null }

function sanitizeInternalPath(path: string | undefined): string | null {
  const value = (path ?? "").trim()
  if (!value) return null
  if (!value.startsWith("/")) return null
  if (value.startsWith("//")) return null
  if (value.toLowerCase().startsWith("/\\") || value.toLowerCase().includes("://")) return null
  return value
}

export function AddressFormClient({ addressId, returnTo }: { addressId?: string; returnTo?: string }) {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
    },
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

      const userId = user.id
      const addresses = readAddresses(userId)
      const existing = addressId ? addresses.find((item) => item.id === addressId) ?? null : null
      setState({ status: "ready", userId, existing })

      if (existing) {
        form.reset({
          fullName: existing.fullName,
          phone: existing.phone,
          address: existing.address,
          city: existing.city,
          province: existing.province,
          postalCode: existing.postalCode,
          country: existing.country,
        })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [addressId, form, supabase])

  if (state.status === "loading") {
    return <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">Loading...</div>
  }

  if (state.status === "signed_out") {
    const safeReturnTo = sanitizeInternalPath(returnTo)
    const loginParams = new URLSearchParams({ next: addressId ? `/account/address/${addressId}/edit` : "/account/address/new" })
    if (safeReturnTo) loginParams.set("returnTo", safeReturnTo)
    return (
      <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
        You are not signed in.{" "}
        <Link href={`/login?${loginParams.toString()}`} className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    )
  }

  async function handleSave(values: AddressValues) {
    setError(null)
    if (state.status !== "ready") {
      setError("Address form is not ready yet.")
      return
    }
    const now = new Date().toISOString()
    const id = addressId ?? crypto.randomUUID()
    const existing = state.existing

    const record: AddressRecord = {
      id,
      fullName: values.fullName,
      phone: values.phone,
      address: values.address,
      city: values.city,
      province: values.province,
      postalCode: values.postalCode,
      country: values.country,
      isDefault: existing?.isDefault ?? false,
      updatedAt: now,
    }

    try {
      upsertAddress(state.userId, record)
      const safeReturnTo = sanitizeInternalPath(returnTo)
      router.push(safeReturnTo ?? "/account/address")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address.")
    }
  }

  const isEdit = Boolean(addressId)

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
      <h2 className="mb-1 font-serif text-2xl font-bold text-foreground">{isEdit ? "Edit address" : "Add address"}</h2>
      <p className="mb-6 text-sm text-muted-foreground">Save your shipping details for faster checkout.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input autoComplete="street-address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input autoComplete="address-level2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Province</FormLabel>
                  <FormControl>
                    <Input autoComplete="address-level1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal code</FormLabel>
                  <FormControl>
                    <Input autoComplete="postal-code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input autoComplete="country-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit">{isEdit ? "Save changes" : "Save address"}</Button>
            <Button type="button" variant="outline" onClick={() => router.push("/account/address")}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
