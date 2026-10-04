"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import {
  RiAddLine,
  RiCheckLine,
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
import { Avatar, Kbd, hueVar } from "@/components/bits"
import { Wordmark } from "@/components/brand"
import { CheckInSheet } from "@/components/check-in-sheet"
import { checkedInCount, seasonPhase } from "@/components/home/derive"
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

// "C" opens the check-in from anywhere, unless you're typing
function useCheckInShortcut() {
  const { openCheckIn, checkInOpen } = useSquad()
  const onKey = React.useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "c" || e.metaKey || e.ctrlKey || e.altKey || e.repeat || checkInOpen) return
    const t = e.target
    if (t instanceof HTMLElement && (t.isContentEditable || t.closest("input, textarea, select"))) return
    e.preventDefault()
    openCheckIn()
  })
  React.useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e)
    document.addEventListener("keydown", listener)
    return () => document.removeEventListener("keydown", listener)
  }, [])
}

export function AppShell({ children, viewer }: { children: React.ReactNode; viewer: ShellViewer }) {
  const { SEASON_DAYS, TODAY, started, daysUntilStart } = useSeason()
  const { openCheckIn, logs, you } = useSquad()
  const isActive = useActive()
  const tabs = tabsFor(you.id)
  const checkedIn = !!logs[you.id]?.[TODAY]
  useCheckInShortcut()

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-svh flex-col gap-8 border-e border-border bg-card px-4 py-6 lg:flex">
        <Link href="/home" aria-label="Pact home" className="w-fit rounded-lg px-3 focus-visible:outline-2 focus-visible:outline-ring">
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
                className="relative flex h-11 items-center gap-3 rounded-lg px-3 font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground aria-[current=page]:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
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
          aria-keyshortcuts="c"
          className="relative flex h-12 items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <RiAddLine className="size-5" />
          {checkedIn ? "Edit today" : "Check in"}
          <Kbd className="absolute right-4" aria-hidden>
            C
          </Kbd>
        </button>
        <RailSquad />
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

      <main id="main" className="relative min-w-0 pb-32 lg:pb-16">
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

// Wide screens have room for who's in today, on every page
function RailSquad() {
  const season = useSeason()
  const { members, logs } = useSquad()
  const isActive = useActive()
  const phase = seasonPhase(season)
  const inCount = checkedInCount(members, logs, season.TODAY)

  return (
    <section aria-labelledby="rail-squad-title" className="hidden min-h-0 flex-col gap-2 xl:flex">
      <div className="flex items-baseline justify-between gap-2 px-3 text-sm text-muted-foreground">
        <h2 id="rail-squad-title" className="font-medium">
          Squad
        </h2>
        {phase === "during" && (
          <span className="text-xs tabular-nums">
            {inCount} of {members.length} in
          </span>
        )}
      </div>
      <ul className="-mx-1 grid min-h-0 content-start gap-0.5 overflow-y-auto p-1">
        {members.map((m) => {
          const inToday = !!logs[m.id]?.[season.TODAY]
          const href = `/squad/${m.id}`
          return (
            <li key={m.id}>
              <Link
                href={href}
                // "You" already has a tab, so only other people light up here
                aria-current={!m.isYou && isActive(href) ? "page" : undefined}
                className="flex h-10 items-center gap-2.5 rounded-lg px-2 text-sm transition-colors hover:bg-muted/60 aria-[current=page]:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Avatar member={m} size={26} />
                <span className="min-w-0 flex-1 truncate font-medium">{m.isYou ? "You" : m.name}</span>
                {phase === "during" &&
                  (inToday ? (
                    <>
                      <RiCheckLine aria-hidden className="size-4 shrink-0" style={{ color: hueVar(m.hue) }} />
                      <span className="sr-only">, checked in</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden className="me-1 size-1.5 shrink-0 rounded-full bg-axis" />
                      <span className="sr-only">, not checked in yet</span>
                    </>
                  ))}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
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
      // Above the tab bar on phones; bottom-right corner on desktop, out of the content's way
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:right-8 lg:bottom-8 lg:left-auto lg:justify-end lg:px-0"
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
