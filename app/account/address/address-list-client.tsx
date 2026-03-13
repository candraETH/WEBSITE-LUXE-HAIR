"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { readAddresses, deleteAddress, setDefaultAddress, type AddressRecord } from "@/lib/address-book"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "ready"; userId: string; addresses: AddressRecord[] }

export function AddressListClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [deleteTarget, setDeleteTarget] = useState<AddressRecord | null>(null)

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
      setState({ status: "ready", userId, addresses: readAddresses(userId) })
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

  const { userId, addresses } = state

  function refresh() {
    setState({ status: "ready", userId, addresses: readAddresses(userId) })
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    deleteAddress(userId, deleteTarget.id)
    setDeleteTarget(null)
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Address list</h2>
          <p className="text-sm text-muted-foreground">Manage your saved shipping addresses.</p>
        </div>
        <Button asChild>
          <Link href="/account/address/new">Add address</Link>
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
          No saved addresses yet.
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="rounded-2xl border border-border/30 bg-card/60 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{address.fullName}</p>
                    {address.isDefault ? <Badge>Default</Badge> : <Badge variant="outline">Saved</Badge>}
                  </div>

                  <div className="grid gap-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Phone:</span> {address.phone}
                    </p>
                    <p className="break-words">
                      <span className="font-medium text-foreground">Address:</span>{" "}
                      {address.address}, {address.city}, {address.province} {address.postalCode}, {address.country}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {!address.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDefaultAddress(userId, address.id)
                        refresh()
                      }}
                    >
                      Set default
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/account/address/${encodeURIComponent(address.id)}/edit`}>Edit</Link>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(address)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete address?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteConfirm()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
