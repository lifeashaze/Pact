"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  RiAddLine,
  RiFlashlightFill,
  RiFlashlightLine,
  RiHome5Fill,
  RiHome5Line,
  RiTrophyFill,
  RiTrophyLine,
  RiUser3Fill,
  RiUser3Line,
} from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { AccountMenu, type ShellViewer } from "@/components/account-menu"
import { Wordmark } from "@/components/brand"
import { CheckInSheet } from "@/components/check-in-sheet"
import { useSquad, useSeason } from "@/components/squad-store"

const tabsFor = (youId: string) => [
  { href: "/home", label: "Home", icon: RiHome5Line, active: RiHome5Fill },
  { href: "/standings", label: "Standings", icon: RiTrophyLine, active: RiTrophyFill },
  { href: "/feed", label: "Feed", icon: RiFlashlightLine, active: RiFlashlightFill },
  { href: `/squad/${youId}`, label: "You", icon: RiUser3Line, active: RiUser3Fill },
]
type Tab = ReturnType<typeof tabsFor>[number]

function useActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || pathname.startsWith(href + "/")
}

export function AppShell({ children, viewer }: { children: React.ReactNode; viewer: ShellViewer }) {
  const { SEASON_DAYS, TODAY, started, daysUntilStart } = useSeason()
  const { openCheckIn, logs, you } = useSquad()
  const isActive = useActive()
  const tabs = tabsFor(you.id)
  const checkedIn = !!logs[you.id]?.[TODAY]

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-svh flex-col gap-8 border-e border-border bg-card px-4 py-6 lg:flex">
        <Link href="/home" aria-label="Pact90 home" className="w-fit rounded-lg px-3 focus-visible:outline-2 focus-visible:outline-ring">
          <Wordmark size={26} />
        </Link>
        <nav aria-label="Main" className="grid gap-1">
          {tabs.map((tab) => {
            const active = isActive(tab.href)
            const Icon = active ? tab.active : tab.icon
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-11 items-center gap-3 rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute inset-0 rounded-lg bg-muted"
                  />
                )}
                <Icon className="relative size-5" />
                <span className="relative">{tab.label}</span>
              </Link>
            )
          })}
        </nav>
        <button
          onClick={() => openCheckIn()}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <RiAddLine className="size-5" />
          {checkedIn ? "Edit today" : "Check in"}
        </button>
        <div className="mt-auto grid gap-5">
          <div className="grid gap-2 px-3 text-sm text-muted-foreground">
            <span>
              {started ? `Day ${TODAY + 1} of ${SEASON_DAYS}` : `Starts in ${daysUntilStart} ${daysUntilStart === 1 ? "day" : "days"}`}
            </span>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${started ? ((TODAY + 1) / SEASON_DAYS) * 100 : 0}%` }}
              />
            </div>
          </div>
          <AccountMenu viewer={viewer} />
        </div>
      </aside>

      <main className="relative min-w-0 pb-32 lg:pb-16">
        <AccountMenu viewer={viewer} placement="down" className="absolute top-4 right-4 z-20 lg:hidden" />
        {children}
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {tabs.slice(0, 2).map((tab) => (
            <TabLink key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}
          <div className="grid place-items-center">
            <button
              onClick={() => openCheckIn()}
              aria-label={checkedIn ? "Edit today's check-in" : "Check in for today"}
              className="grid size-13 -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/15 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <RiAddLine className="size-7" />
            </button>
          </div>
          {tabs.slice(2).map((tab) => (
            <TabLink key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>

      <CheckInSheet />
      <Toast />
    </div>
  )
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = active ? tab.active : tab.icon
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative grid h-full place-items-center content-center gap-0.5 text-[11px] font-medium text-muted-foreground focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring",
        active && "text-foreground"
      )}
    >
      <Icon className="size-6" />
      {tab.label}
      {active && (
        <motion.span
          layoutId="tab-active"
          className="absolute top-0 h-0.5 w-8 rounded-full bg-foreground"
        />
      )}
    </Link>
  )
}

function Toast() {
  const { toast, dismissToast } = useSquad()

  React.useEffect(() => {
    if (!toast) return
    const t = setTimeout(dismissToast, 2800)
    return () => clearTimeout(t)
  }, [toast, dismissToast])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
