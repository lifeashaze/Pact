"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { RiLogoutBoxRLine, RiShieldUserLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { authClient } from "@/lib/auth/client"

export type ShellViewer = {
  name: string
  email: string
  image: string | null
  isAdmin: boolean
}

export function ViewerPhoto({ viewer, size = 36, className }: { viewer: Pick<ShellViewer, "name" | "image">; size?: number; className?: string }) {
  const initials = viewer.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return viewer.image ? (
    // Google profile photos come from lh3.googleusercontent.com, a plain img avoids image config
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={viewer.image}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className={cn("shrink-0 rounded-full bg-muted object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full bg-muted font-display font-semibold", className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}

export function useSignOut() {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const signOut = async () => {
    setPending(true)
    await authClient.signOut()
    router.replace("/")
    router.refresh()
  }
  return { signOut, pending }
}

// Photo button that opens name, email, admin link and sign out
export function AccountMenu({ viewer, placement = "up", className }: { viewer: ShellViewer; placement?: "up" | "down"; className?: string }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const { signOut, pending } = useSignOut()

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-xl p-1.5 text-start transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ViewerPhoto viewer={viewer} size={32} />
        <span className="min-w-0 flex-1 max-lg:sr-only">
          <span className="block truncate text-sm font-semibold">{viewer.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{viewer.email}</span>
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: placement === "up" ? 6 : -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: placement === "up" ? 4 : -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            className={cn(
              "absolute z-50 grid w-60 gap-0.5 rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/10",
              placement === "up" ? "bottom-full left-0 mb-2 origin-bottom-left" : "top-full right-0 mt-2 origin-top-right"
            )}
          >
            <div className="px-3 pt-2 pb-2.5 lg:hidden">
              <p className="truncate text-sm font-semibold">{viewer.name}</p>
              <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
            </div>
            {viewer.isAdmin && (
              <Link
                role="menuitem"
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium hover:bg-muted"
              >
                <RiShieldUserLine className="size-4.5 text-muted-foreground" />
                Admin
              </Link>
            )}
            <button
              role="menuitem"
              type="button"
              onClick={signOut}
              disabled={pending}
              className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-start text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <RiLogoutBoxRLine className="size-4.5 text-muted-foreground" />
              {pending ? "Signing out" : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
