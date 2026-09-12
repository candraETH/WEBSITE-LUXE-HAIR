"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  Percent,
  Search,
  Settings,
  ShoppingBag,
  UserRound,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"

type AdminStats = {
  orders: {
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    paid: number
    total: number
  }
  recentOrders: Array<{
    orderId: string
    status: string
    customerEmail: string
    createdAt: string | null
  }>
}

type AdminState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "allowed"; email: string; name: string }

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/discounts", label: "Discounts", icon: Percent },
  { href: "/admin/api-keys", label: "API Keys", icon: KeyRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [state, setState] = useState<AdminState>({ status: "loading" })
  const [searchValue, setSearchValue] = useState("")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [adminDate, setAdminDate] = useState(() => new Date())

  const pageTitle = useMemo(() => {
    const match = NAV_ITEMS.find((item) => isActivePath(pathname, item.href))
    return match?.label ?? "Admin"
  }, [pathname])

  const adminDateLabel = useMemo(() => {
    try {
      return format(adminDate, "d MMM yyyy")
    } catch {
      return "Date"
    }
  }, [adminDate])

  const adminDateLabelShort = useMemo(() => {
    try {
      return format(adminDate, "d MMM")
    } catch {
      return "Date"
    }
  }, [adminDate])

  useEffect(() => {
    let cancelled = false
    if (!supabase) {
      setState({ status: "denied" })
      return
    }
    const client = supabase

    async function load() {
      const { data } = await client.auth.getUser()
      if (cancelled) return

      const user = data.user
      if (!user) {
        setState({ status: "denied" })
        return
      }

      const { data: profile } = await client
        .from("profiles")
        .select("role,full_name")
        .eq("id", user.id)
        .maybeSingle()

      const profileRoleRaw = typeof profile?.role === "string" ? profile.role : ""
      const profileRole = profileRoleRaw.trim().toLowerCase() === "admin" ? "admin" : "user"
      if (profileRole !== "admin") {
        setState({ status: "denied" })
        return
      }

      setState({
        status: "allowed",
        email: user.email ?? "",
        name: (typeof profile?.full_name === "string" && profile.full_name.trim()
          ? profile.full_name
          : typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : ""
        ).trim(),
      })
    }

    void load()
    const { data: subscription } = client.auth.onAuthStateChange(() => void load())
    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/login?next=%2Fadmin")
    router.refresh()
  }

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      setSearchValue(params.get("q") ?? "")
    } catch {
      setSearchValue("")
    }
  }, [pathname])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchValue.trim()
      try {
        const url = new URL(window.location.href)
        const params = url.searchParams
        const current = params.get("q") ?? ""
        if (current === next) return

        if (next) params.set("q", next)
        else params.delete("q")

        const query = params.toString()
        const href = `${url.pathname}${query ? `?${query}` : ""}${url.hash}`
        router.replace(href)
      } catch {
        // ignore invalid URL in non-browser environments
      }
    }, 350)

    return () => window.clearTimeout(handle)
  }, [router, searchValue])

  const fetchStats = useCallback(async () => {
    if (!supabase) return null
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token ?? ""
    if (!token) return null

    const response = await fetch("/api/admin/stats", {
      headers: { authorization: `Bearer ${token}` },
    })
    const payload = (await response.json().catch(() => ({}))) as { error?: string } & AdminStats
    if (!response.ok) {
      throw new Error(payload.error || "Failed to load notifications.")
    }
    return payload as AdminStats
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    async function preload() {
      if (state.status !== "allowed") return
      setStatsLoading(true)
      setStatsError(null)
      try {
        const next = await fetchStats()
        if (cancelled) return
        if (next) setStats(next)
      } catch (error) {
        if (cancelled) return
        setStatsError(error instanceof Error ? error.message : "Failed to load notifications.")
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }

    void preload()
    return () => {
      cancelled = true
    }
  }, [fetchStats, state.status])

  useEffect(() => {
    let cancelled = false
    if (!notifOpen) return

    async function refresh() {
      setStatsLoading(true)
      setStatsError(null)
      try {
        const next = await fetchStats()
        if (cancelled) return
        if (next) setStats(next)
      } catch (error) {
        if (cancelled) return
        setStatsError(error instanceof Error ? error.message : "Failed to load notifications.")
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }

    void refresh()
    return () => {
      cancelled = true
    }
  }, [fetchStats, notifOpen])

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="rounded-2xl border border-border/30 bg-card/60 p-6 shadow-sm">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-4 h-10 w-full" />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (state.status === "denied") {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-6 py-20">
          <div className="rounded-2xl border border-border/30 bg-card/60 p-6 text-center shadow-sm">
            <h1 className="font-serif text-3xl font-bold text-foreground">Access denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">This area is available to admin users only.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/login?next=%2Fadmin">Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Go to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background">
              <UserRound className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none text-foreground">Admin</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">Candra&apos;s Hair</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const active = isActivePath(pathname, item.href)
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 border-b border-border/40 bg-background/70 backdrop-blur">
          <div className="relative h-14">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-6">
              <SidebarTrigger className="shrink-0" />
            </div>

            <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
               {pathname === "/admin" ? null : (
                 <div className="hidden min-w-0 sm:block">
                   <p className="truncate font-serif text-lg font-bold text-foreground">{pageTitle}</p>
                 </div>
               )}

              <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
                <div className="relative hidden w-[200px] shrink-0 sm:block md:w-[260px] lg:w-[320px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    placeholder="Search..."
                    className="h-9 w-full pl-9"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="h-9 max-w-[170px] min-w-0 gap-2 px-2 sm:max-w-none sm:px-3">
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      <span className="min-w-0 truncate text-sm tabular-nums">
                        <span className="sm:hidden">{adminDateLabelShort}</span>
                        <span className="hidden sm:inline">{adminDateLabel}</span>
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-[min(22rem,calc(100vw-1rem))] p-0"
                  >
                    <div className="border-b border-border/40 px-4 py-3">
                      <p className="text-sm font-medium text-foreground">Date</p>
                      <p className="text-xs font-normal text-muted-foreground">Pick any date (years included). UI only.</p>
                    </div>
                    <div className="p-3">
                      <Calendar
                        mode="single"
                        selected={adminDate}
                        onSelect={(value) => {
                          if (value) setAdminDate(value)
                        }}
                        captionLayout="dropdown"
                        fromYear={2000}
                        toYear={new Date().getFullYear()}
                        initialFocus
                        className="p-0"
                      />
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setAdminDate(new Date())}>
                            Today
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const next = new Date()
                              next.setDate(next.getDate() - 1)
                              setAdminDate(next)
                            }}
                          >
                            Yesterday
                          </Button>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="px-2 text-xs">
                          <Link href="/admin/analytics">View analytics</Link>
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="relative shrink-0" aria-label="Notifications">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {Boolean(stats?.orders.pending || stats?.orders.processing) && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-1rem))] sm:w-80">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Notifications</p>
                  <p className="text-xs font-normal text-muted-foreground">Quick order overview.</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {statsError ? (
                  <div className="px-3 py-2 text-sm text-destructive">{statsError}</div>
                ) : statsLoading && !stats ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
                ) : stats ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                        href="/admin/orders?status=PENDING"
                      >
                        Pending: {stats.orders.pending}
                      </Link>
                      <Link
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                        href="/admin/orders?status=PROCESSING"
                      >
                        Processing: {stats.orders.processing}
                      </Link>
                      <Link
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                        href="/admin/orders?status=SHIPPED"
                      >
                        Shipped: {stats.orders.shipped}
                      </Link>
                    </div>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent orders</p>
                    <div className="mt-2 space-y-2">
                      {stats.recentOrders.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No recent orders.</p>
                      ) : (
                        stats.recentOrders.map((order) => (
                          <Link
                            key={order.orderId}
                            href={`/admin/orders?q=${encodeURIComponent(order.orderId)}`}
                            className="block rounded-lg border border-border/40 bg-background px-3 py-2 text-xs text-foreground hover:bg-secondary"
                          >
                            <span className="font-semibold">#{order.orderId}</span> • {order.status} • {order.customerEmail || "-"}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No data.</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-9 gap-2 px-2 sm:px-3" aria-label="Admin menu">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden max-w-[140px] truncate text-sm sm:inline">
                    {state.name || state.email || "Admin"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[min(16rem,calc(100vw-1rem))] sm:w-56">
                <DropdownMenuLabel className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Admin</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{state.email || "-"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">View Store</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">My account</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(event) => event.preventDefault()} onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

              </div>
          </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
