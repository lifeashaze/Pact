"use client"

import * as React from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"

import { ViewerPhoto } from "@/components/account-menu"
import type { ProfileStatus } from "@/lib/db/schema"
import type { MemberRow } from "@/lib/members"

const tabs: { id: ProfileStatus; label: string; empty: string }[] = [
  { id: "pending", label: "Waiting", empty: "Nobody is waiting. New sign-ups show up here." },
  { id: "approved", label: "In the pact", empty: "Nobody approved yet." },
  { id: "rejected", label: "Turned away", empty: "Nobody turned away." },
]

const joined = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export function AdminBoard({ initial, viewerId }: { initial: MemberRow[]; viewerId: string }) {
  const [members, setMembers] = React.useState(initial)
  const [tab, setTab] = React.useState<ProfileStatus>(initial.some((m) => m.status === "pending") ? "pending" : "approved")
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const counts = Object.fromEntries(tabs.map((t) => [t.id, members.filter((m) => m.status === t.id).length])) as Record<
    ProfileStatus,
    number
  >
  const shown = members.filter((m) => m.status === tab)
  const current = tabs.find((t) => t.id === tab)!

  async function decide(member: MemberRow, status: ProfileStatus) {
    setBusy(member.userId)
    setError(null)
    const before = members
    // Move the row straight away, put it back if the server says no
    setMembers((list) => list.map((m) => (m.userId === member.userId ? { ...m, status } : m)))
    try {
      const res = await fetch(`/api/admin/members/${member.userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Something went wrong")
      }
    } catch (e) {
      setMembers(before)
      setError(`Couldn't update ${member.name}. ${e instanceof Error ? e.message : ""}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-3xl bg-card p-3 sm:p-4">
      <LayoutGroup>
        <div role="tablist" aria-label="Members" className="flex gap-1 rounded-full bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-muted-foreground transition-colors aria-selected:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {tab === t.id && (
                <motion.span layoutId="admin-pill" className="absolute inset-0 rounded-full bg-card shadow-sm" />
              )}
              <span className="relative">{t.label}</span>
              <span className="relative tabular-nums text-muted-foreground">{counts[t.id]}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      {error && (
        <p role="alert" className="mx-3 mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="mt-2 grid">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((m) => (
            <motion.li
              key={m.userId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: m.status === "approved" ? 24 : -24, transition: { duration: 0.18 } }}
              className="flex flex-wrap items-center gap-x-3 gap-y-3 rounded-2xl px-3 py-3"
            >
              <ViewerPhoto viewer={m} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {m.name}
                  {m.userId === viewerId && <span className="font-normal text-muted-foreground"> (you)</span>}
                  {m.isAdmin && m.userId !== viewerId && <span className="font-normal text-muted-foreground"> (admin)</span>}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {m.email}, signed up {joined.format(new Date(m.createdAt))}
                </p>
              </div>
              {!m.isAdmin && (
                <div className="flex gap-2 max-sm:w-full max-sm:ps-14">
                  {m.status !== "approved" && (
                    <button
                      type="button"
                      disabled={busy === m.userId}
                      onClick={() => decide(m, "approved")}
                      className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-60 max-sm:flex-1"
                    >
                      Let in
                    </button>
                  )}
                  {m.status !== "rejected" && (
                    <button
                      type="button"
                      disabled={busy === m.userId}
                      onClick={() => decide(m, "rejected")}
                      className="h-10 rounded-full bg-muted px-5 text-sm font-semibold transition-transform active:scale-[0.97] disabled:opacity-60 max-sm:flex-1"
                    >
                      {m.status === "approved" ? "Remove" : "Turn away"}
                    </button>
                  )}
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{current.empty}</p>}
    </section>
  )
}
