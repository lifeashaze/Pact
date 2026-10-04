"use client"

import * as React from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"
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

  function onTabKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    const next = tabs[(tabs.findIndex((t) => t.id === tab) + step + tabs.length) % tabs.length]!
    setTab(next.id)
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus()
  }

  const actions = (m: MemberRow) => <Actions member={m} busy={busy === m.userId} onDecide={(status) => decide(m, status)} />

  return (
    <section className="rounded-3xl bg-card p-3 sm:p-4 lg:p-5">
      <LayoutGroup>
        <div role="tablist" aria-label="Members" onKeyDown={onTabKey} className="flex gap-1 rounded-full bg-muted p-1 lg:w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              data-tab={t.id}
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className="relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground aria-selected:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:flex-none lg:px-5"
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

      <ul className="mt-2 grid lg:hidden">
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
                  <Name member={m} viewerId={viewerId} />
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {m.email}, signed up {joined.format(new Date(m.createdAt))}
                </p>
              </div>
              {actions(m)}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* Desktop: a table, so email and sign-up date line up for scanning */}
      {shown.length > 0 && (
        <table className="mt-4 w-full border-separate border-spacing-0 text-start max-lg:hidden">
          <caption className="sr-only">{current.label}</caption>
          <thead className="text-sm text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 pb-2 text-start font-medium">
                Member
              </th>
              <th scope="col" className="px-3 pb-2 text-start font-medium">
                Email
              </th>
              <th scope="col" className="px-3 pb-2 text-start font-medium">
                Signed up
              </th>
              <th scope="col" className="px-3 pb-2 text-end font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {shown.map((m) => (
                <motion.tr
                  key={m.userId}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.18 } }}
                  className="group"
                >
                  <td className={cn(cell, "whitespace-nowrap")}>
                    <div className="flex items-center gap-3">
                      <ViewerPhoto viewer={m} size={40} />
                      <span className="font-semibold">
                        <Name member={m} viewerId={viewerId} />
                      </span>
                    </div>
                  </td>
                  <td className={cn(cell, "w-full max-w-0 truncate text-muted-foreground")} title={m.email}>
                    {m.email}
                  </td>
                  <td className={cn(cell, "whitespace-nowrap text-muted-foreground tabular-nums")}>
                    {joined.format(new Date(m.createdAt))}
                  </td>
                  <td className={cell}>
                    <div className="flex justify-end">{actions(m)}</div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      )}
      {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{current.empty}</p>}
    </section>
  )
}

const cell = "px-3 py-3 transition-colors group-hover:bg-muted/60 group-focus-within:bg-muted/60 first:rounded-s-2xl last:rounded-e-2xl"

function Name({ member: m, viewerId }: { member: MemberRow; viewerId: string }) {
  return (
    <>
      {m.name}
      {m.userId === viewerId && <span className="font-normal text-muted-foreground"> (you)</span>}
      {m.isAdmin && m.userId !== viewerId && <span className="font-normal text-muted-foreground"> (admin)</span>}
    </>
  )
}

function Actions({ member: m, busy, onDecide }: { member: MemberRow; busy: boolean; onDecide: (status: ProfileStatus) => void }) {
  if (m.isAdmin) return null
  return (
    <div className="flex gap-2 max-sm:w-full max-sm:ps-14">
      {m.status !== "approved" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide("approved")}
          className="h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:flex-1"
        >
          Let in
        </button>
      )}
      {m.status !== "rejected" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide("rejected")}
          className="h-10 rounded-full bg-muted px-5 text-sm font-semibold transition-[transform,background-color] hover:bg-muted/70 active:scale-[0.97] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:flex-1"
        >
          {m.status === "approved" ? "Remove" : "Turn away"}
        </button>
      )}
    </div>
  )
}
