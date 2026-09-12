"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type ApiKeyRow = {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  permissions: string[]
  rate_limit_per_min: number
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

type UiState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; configured: boolean; apiKeys: ApiKeyRow[] }

function formatDate(value: string | null) {
  if (!value) return "-"
  try {
    return format(parseISO(value), "MMM d, yyyy p")
  } catch {
    return value
  }
}

export function ApiKeysClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<UiState>({ status: "loading" })
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [rateLimit, setRateLimit] = useState("120")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)
  const [newKeyPrefix, setNewKeyPrefix] = useState<string | null>(null)

  const load = async () => {
    if (!supabase) {
      setState({ status: "signed_out" })
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setState({ status: "signed_out" })
      return
    }
    setState({ status: "loading" })
    const res = await fetch("/api/admin/api-keys", { headers: { authorization: `Bearer ${token}` } })
    const payload = (await res.json().catch(() => ({}))) as { error?: string; configured?: boolean; apiKeys?: ApiKeyRow[]; message?: string }
    if (!res.ok) {
      setState({ status: "error", message: payload.error || "Failed to load API keys." })
      return
    }
    if (payload.configured === false) {
      setState({ status: "ready", configured: false, apiKeys: [] })
      return
    }
    setState({ status: "ready", configured: true, apiKeys: payload.apiKeys ?? [] })
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  const createKey = async () => {
    if (!supabase) return
    setError("")
    if (!name.trim()) {
      setError("Nama API key wajib diisi.")
      return
    }
    const rate = Number(rateLimit)
    if (!Number.isFinite(rate) || rate < 10 || rate > 10000) {
      setError("Rate limit harus 10 - 10000.")
      return
    }
    const expiresIso = expiresAt.trim() ? new Date(expiresAt).toISOString() : null
    if (expiresAt.trim() && !expiresIso) {
      setError("Format tanggal expired tidak valid.")
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) {
      setError("Session habis, silakan login ulang.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), expiresAt: expiresIso, rateLimitPerMin: rate }),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string; rawKey?: string; apiKey?: ApiKeyRow }
      if (!res.ok) throw new Error(payload.error || "Gagal membuat API key.")
      setNewKey(payload.rawKey ?? null)
      setNewKeyPrefix(payload.apiKey?.key_prefix ?? null)
      setCreateOpen(false)
      setName("")
      setExpiresAt("")
      setRateLimit("120")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat API key.")
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm("Revoke API key ini? Key tidak bisa dipakai lagi.")) return
    if (!supabase) return
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) return
    const res = await fetch("/api/admin/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string }
      alert(payload.error || "Gagal revoke key")
      return
    }
    await load()
  }

  const toggleActive = async (row: ApiKeyRow) => {
    if (!supabase) return
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) return
    const res = await fetch("/api/admin/api-keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: row.id, is_active: !row.is_active }),
    })
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string }
      alert(payload.error || "Gagal update key")
      return
    }
    await load()
  }

  if (state.status === "signed_out") {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-muted-foreground shadow-sm">
        Anda belum login. <Link href="/login?next=%2Fadmin%2Fapi-keys" className="font-medium text-foreground underline underline-offset-4">Login</Link>
      </div>
    )
  }
  if (state.status === "error") {
    return <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-sm text-destructive shadow-sm">{state.message}</div>
  }

  const configured = state.status === "ready" ? state.configured : true
  const keys = state.status === "ready" ? state.apiKeys : []

  return (
    <div className="space-y-4">
      {newKey ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">API Key berhasil dibuat! Simpan sekarang — tidak akan tampil lagi.</p>
          <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">API Key</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-foreground">{newKey}</p>
            {newKeyPrefix ? <p className="mt-1 text-xs text-muted-foreground">Prefix: {newKeyPrefix} • Rate: {rateLimit}/menit</p> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); alert("Copied!") }}>Copy Key</Button>
            <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>Tutup</Button>
          </div>
          <div className="mt-3 rounded-lg bg-white p-3 dark:bg-zinc-900">
            <p className="text-xs font-semibold text-muted-foreground">Cara pakai:</p>
            <pre className="mt-1 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs font-mono">{`curl -H "X-API-Key: ${newKey}" https://candrashair.com/api/v1/products\ncurl -H "X-API-Key: ${newKey}" https://candrashair.com/api/v1/products/virgin-straight-bulk`}</pre>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/30 bg-card/60 p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">API Keys</p>
            <p className="mt-1 text-xs text-muted-foreground">Buat API key untuk akses data produk (harga + foto) dari aplikasi eksternal. Key dikirim via header X-API-Key.</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!configured}>Buat API Key</Button>
        </div>

        {!configured ? (
          <div className="mt-4 rounded-xl border border-border/30 bg-background/40 p-4 text-sm text-muted-foreground">
            Tabel <span className="font-medium text-foreground">api_keys</span> belum ada. Jalankan file <span className="font-medium text-foreground">supabase/sql/20260316_add_api_keys.sql</span> di Supabase SQL Editor, lalu refresh.
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-border/30">
          {state.status === "loading" ? (
            <div className="p-4"><Skeleton className="h-10 w-full" /><Skeleton className="mt-3 h-10 w-full" /></div>
          ) : keys.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Belum ada API key. Klik &quot;Buat API Key&quot; untuk membuat yang pertama.</div>
          ) : (
            <div className="divide-y divide-border/30">
              {keys.map((k) => (
                <div key={k.id} className="flex flex-col gap-3 bg-background/40 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{k.name}</p>
                      <Badge className={k.is_active ? "border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "border-0 bg-muted text-foreground"}>{k.is_active ? "Active" : "Revoked"}</Badge>
                      <Badge variant="outline" className="font-mono text-xs">{k.key_prefix}****</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border bg-background px-3 py-1">Rate: <b className="text-foreground">{k.rate_limit_per_min}/min</b></span>
                      <span className="rounded-full border border-border bg-background px-3 py-1">Created: {formatDate(k.created_at)}</span>
                      <span className="rounded-full border border-border bg-background px-3 py-1">Last used: {formatDate(k.last_used_at)}</span>
                      {k.expires_at ? <span className="rounded-full border border-border bg-background px-3 py-1">Expires: {formatDate(k.expires_at)}</span> : <span className="rounded-full border border-border bg-background px-3 py-1">No expiry</span>}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">ID: <span className="font-mono">{k.id}</span> • Permissions: {k.permissions.join(", ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void toggleActive(k)}>{k.is_active ? "Disable" : "Enable"}</Button>
                    <Button size="sm" variant="destructive" onClick={() => void revoke(k.id)} disabled={!k.is_active}>Revoke</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-border/30 bg-background/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dokumentasi API</p>
          <div className="mt-2 space-y-2 text-xs text-muted-foreground">
            <p><span className="font-semibold text-foreground">GET</span> <code className="rounded bg-muted px-1 py-0.5">/api/v1/products</code> — List semua produk (harga + foto). Query: <code>category</code>, <code>search</code>, <code>tag</code>, <code>page</code>, <code>limit</code></p>
            <p><span className="font-semibold text-foreground">GET</span> <code className="rounded bg-muted px-1 py-0.5">/api/v1/products/[slug]</code> — Detail 1 produk + pricing per panjang & warna</p>
            <p>Auth: Header <code className="rounded bg-muted px-1 py-0.5">X-API-Key: candra_live_...</code> atau <code className="rounded bg-muted px-1 py-0.5">?api_key=...</code></p>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 font-mono text-[11px]">{`# Contoh
curl -H "X-API-Key: candra_live_xxx" https://candrashair.com/api/v1/products?category=Weft%20Hair&limit=5
curl -H "X-API-Key: candra_live_xxx" https://candrashair.com/api/v1/products/fumi-weft

# Response data mencakup:
# - price.originalLabel / discountedLabel (diskon 50%)
# - images[] (URL absolut)
# - pricingByLength[] (harga per 16-26 inch)
# - variants.colors (surcharge warna)`}</pre>
          </div>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Buat API Key Baru</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nama Key</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Mobile App, Partner A, n8n" />
              <p className="text-xs text-muted-foreground">Untuk identifikasi internal saja.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rate Limit / menit</p>
              <Input inputMode="numeric" value={rateLimit} onChange={(e) => setRateLimit(e.target.value.replace(/[^\d]/g, ""))} placeholder="120" />
              <p className="text-xs text-muted-foreground">Default 120 request/menit per key.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Expired At (opsional)</p>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={() => void createKey()} disabled={saving}>{saving ? "Membuat..." : "Buat Key"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
