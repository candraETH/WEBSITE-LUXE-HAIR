"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { TierBadge, getTierNameGradientClass } from "@/components/loyalty/tier-badge"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { getTierForSpend, type LoyaltyTier } from "@/lib/loyalty-tier"
import { cn } from "@/lib/utils"

type ProfileState =
  | { status: "loading" }
  | { status: "signed_out" }
  | {
      status: "signed_in"
      email: string
      fullName: string
      phone: string
      avatar: string
    }

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name."),
  phone: z.string().trim().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

async function resizeImageToDataUrl(file: File, size = 256): Promise<string> {
  const imageUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Failed to load image."))
      img.src = imageUrl
    })

    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("Canvas is not supported in this browser.")
    }

    const minSide = Math.min(image.width, image.height)
    const sx = Math.floor((image.width - minSide) / 2)
    const sy = Math.floor((image.height - minSide) / 2)

    ctx.drawImage(image, sx, sy, minSide, minSide, 0, 0, size, size)
    return canvas.toDataURL("image/jpeg", 0.85)
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

export function ProfileClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<ProfileState>({ status: "loading" })
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", phone: "" },
  })

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }
    const client = supabase

    async function load() {
      setLoyaltyTier(null)
      const { data } = await client.auth.getUser()
      if (cancelled) return

      const user = data.user
      if (!user) {
        setState({ status: "signed_out" })
        return
      }

      const { data: sessionData } = await client.auth.getSession()
      if (!cancelled) {
        const token = sessionData.session?.access_token ?? ""
        if (token) {
          const response = await fetch("/api/account/loyalty", { headers: { authorization: `Bearer ${token}` } })
          const payload = (await response.json().catch(() => ({}))) as { totalSpent?: number; totalPoints?: number }
          if (!cancelled && response.ok) {
            const spent = typeof payload.totalSpent === "number" ? payload.totalSpent : Number(payload.totalSpent ?? 0)
            const points = typeof payload.totalPoints === "number" ? payload.totalPoints : Math.max(0, Math.floor(spent))
            setLoyaltyTier(getTierForSpend(points))
          }
        }
      }

      const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
      const fullName = typeof metadata.full_name === "string" ? metadata.full_name : ""
      const phone = typeof metadata.phone === "string" ? metadata.phone : ""
      const avatar = typeof metadata.avatar === "string" ? metadata.avatar : ""

      setState({
        status: "signed_in",
        email: user.email ?? "",
        fullName,
        phone,
        avatar,
      })

      form.reset({ fullName, phone })
      setAvatarPreview(avatar)
    }

    void load()
    const { data: subscription } = client.auth.onAuthStateChange(() => void load())
    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [form, supabase])

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

  async function handleSave(values: ProfileValues) {
    setStatusMessage(null)
    form.clearErrors("root")

    if (!supabase) {
      form.setError("root", { message: "Auth is not configured." })
      return
    }
    if (state.status !== "signed_in") {
      form.setError("root", { message: "You must be signed in to update your profile." })
      return
    }

    const nextAvatar = avatarPreview
    const payload = {
      full_name: values.fullName.trim(),
      phone: values.phone?.trim() || "",
      avatar: nextAvatar,
    }

    const { error } = await supabase.auth.updateUser({ data: payload })
    if (error) {
      form.setError("root", { message: error.message })
      return
    }

    setStatusMessage("Profile updated successfully.")
    setIsEditing(false)
  }

  async function handleAvatarChange(file: File | null) {
    setStatusMessage(null)
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setStatusMessage("Please select an image file.")
      return
    }
    const resized = await resizeImageToDataUrl(file, 256)
    setAvatarPreview(resized)
  }

  const initials =
    (state.fullName || state.email || "U")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/30 bg-background/40 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarPreview || state.avatar} alt="Profile avatar" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "text-sm font-semibold",
                  loyaltyTier ? getTierNameGradientClass(loyaltyTier.key) : "text-foreground",
                )}
              >
                {state.fullName || "Your profile"}
              </p>
              {loyaltyTier ? <TierBadge tier={loyaltyTier.key} label={loyaltyTier.name} /> : null}
            </div>
            <p className="text-sm text-muted-foreground">{state.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit profile
            </Button>
          ) : (
            <Button variant="outline" onClick={() => {
              setIsEditing(false)
              form.reset({ fullName: state.fullName, phone: state.phone })
              setAvatarPreview(state.avatar)
              setStatusMessage(null)
            }}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
        <h2 className="mb-1 font-serif text-2xl font-bold text-foreground">Profile information</h2>
        <p className="mb-6 text-sm text-muted-foreground">View and update your account details.</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!isEditing} placeholder="Your name" autoComplete="name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-foreground">Email</p>
                <p className="mt-1 text-sm text-muted-foreground">{state.email}</p>
              </div>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} placeholder="+1 555 000 0000" autoComplete="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Avatar</p>
              <p className="text-sm text-muted-foreground">Upload a photo to personalize your account.</p>
              <input
                type="file"
                accept="image/*"
                disabled={!isEditing}
                onChange={(event) => void handleAvatarChange(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border file:border-border file:bg-background file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent/10 disabled:opacity-60"
              />
            </div>

            {form.formState.errors.root?.message && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
            {statusMessage && <p className="text-sm text-foreground">{statusMessage}</p>}

            {isEditing && (
              <Button type="submit" className="w-full sm:w-auto">
                Save changes
              </Button>
            )}
          </form>
        </Form>
      </div>
    </div>
  )
}
