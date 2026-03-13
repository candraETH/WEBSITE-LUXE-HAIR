"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { cn } from "@/lib/utils"

const sidebarLinks = [
  { href: "/account/profile", label: "My Profile" },
  { href: "/account/membership", label: "Membership" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/address", label: "Address" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/settings", label: "Settings" },
] as const

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setIsLogoutOpen(false)
    router.push("/")
    router.refresh()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/30 bg-card/60 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-b border-border/30 bg-background/40 p-4 md:border-b-0 md:border-r">
          <nav className="space-y-1">
            {sidebarLinks.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}

            <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
                >
                  Logout
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be signed out and redirected to the homepage.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleLogout()}>Log out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </nav>
        </aside>

        <section className="p-4 sm:p-6">{children}</section>
      </div>
    </div>
  )
}
