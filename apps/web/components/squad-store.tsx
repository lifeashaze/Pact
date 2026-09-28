"use client"

import * as React from "react"

import type { SeasonViewId } from "@/components/season-views"
import { type FeedItem, type Reaction, buildFeed } from "@/lib/feed"
import { type DayLog, type Member, type Season, type SeasonLogs, createSeason, dayResult, isoDay } from "@/lib/season"
import type { SquadSnapshot } from "@/lib/squad-data"

type Extras = Pick<SquadSnapshot, "reactions" | "comments">

type SquadState = {
  season: Season
  squadName: string
  members: Member[]
  you: Member
  getMember: (id: string) => Member | undefined
  logs: SeasonLogs
  feed: FeedItem[]
  nudged: string[]
  // Demo data on the landing page: nothing is saved
  demo: boolean
  checkInOpen: boolean
  checkInDay: number
  toast: string | null
  seasonView: SeasonViewId
  setSeasonView: (id: SeasonViewId) => void
  openCheckIn: (day?: number) => void
  closeCheckIn: () => void
  saveCheckIn: (log: DayLog, day: number) => Promise<boolean>
  toggleReaction: (itemId: string, emoji: Reaction) => void
  addComment: (itemId: string, text: string) => void
  nudge: (memberId: string) => void
  dismissToast: () => void
}

const SquadContext = React.createContext<SquadState | null>(null)

function toLogs(raw: SquadSnapshot["logs"]): SeasonLogs {
  const out: SeasonLogs = {}
  for (const [id, days] of Object.entries(raw)) out[id] = days.map((d) => d ?? undefined)
  return out
}

async function send(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers } })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res
}

// The squad as the signed-in member sees it. Starts from the server snapshot and
// updates optimistically as they check in, react and comment
export function SquadProvider({
  initial,
  timeZone,
  demo = false,
  children,
}: {
  initial: SquadSnapshot
  timeZone: string
  demo?: boolean
  children: React.ReactNode
}) {
  const season = React.useMemo(() => createSeason(initial.season), [initial.season])
  const members = initial.members
  const you = members.find((m) => m.id === initial.viewerId) ?? members[0]!
  const [logs, setLogs] = React.useState(() => toLogs(initial.logs))
  const [extras, setExtras] = React.useState<Extras>({ reactions: initial.reactions, comments: initial.comments })
  const [nudged, setNudged] = React.useState(() => initial.nudges.filter(([from]) => from === you.id).map(([, to]) => to))
  const [checkInOpen, setCheckInOpen] = React.useState(false)
  const [checkInDay, setCheckInDay] = React.useState(season.TODAY)
  const [toast, setToast] = React.useState<string | null>(null)
  const [seasonView, setSeasonView] = React.useState<SeasonViewId>("lanes")

  const feed = React.useMemo(
    () => buildFeed(season, members, logs, { ...extras, timeZone }),
    [season, members, logs, extras, timeZone]
  )

  const value = React.useMemo<SquadState>(() => {
    const getMember = (id: string) => members.find((m) => m.id === id)
    const fail = (e: unknown) => setToast(e instanceof Error ? e.message : "Something went wrong")

    return {
      season,
      squadName: initial.squad.name,
      members,
      you,
      getMember,
      logs,
      feed,
      nudged,
      demo,
      checkInOpen,
      checkInDay,
      toast,
      seasonView,
      setSeasonView,
      openCheckIn: (day = season.TODAY) => {
        if (!season.started) {
          setToast(`Check-ins open on ${season.longDate(0)}`)
          return
        }
        setCheckInDay(day)
        setCheckInOpen(true)
      },
      closeCheckIn: () => setCheckInOpen(false),
      saveCheckIn: async (log, day) => {
        const before = logs
        const wasLogged = !!logs[you.id]?.[day]
        const saved = { ...log, savedAt: log.savedAt ?? new Date().toISOString() }
        setLogs((all) => ({ ...all, [you.id]: (all[you.id] ?? []).map((l, i) => (i === day ? saved : l)) }))
        setCheckInOpen(false)
        const r = dayResult(you, log)
        const summary = r.total ? `${r.hit} of ${r.total} goals` : "saved"
        if (demo) {
          setToast(`Checked in. ${summary}`)
          return true
        }
        try {
          await send(`/api/check-ins/${isoDay(season.startsOn, day)}`, {
            method: "PUT",
            body: JSON.stringify({
              entries: you.goals.map((g) => ({
                goalId: g.dbId,
                checked: g.kind === "check" ? !!log.checks[g.id] : undefined,
                value: g.kind === "number" ? (log.numbers[g.id] ?? null) : undefined,
                note: g.id === "workout" ? (log.workoutName ?? null) : undefined,
              })),
            }),
          })
          setToast(wasLogged ? "Check-in updated" : day === season.TODAY ? `Checked in. ${summary} today` : `Saved ${season.longDate(day)}`)
          return true
        } catch (e) {
          setLogs(before)
          fail(e)
          return false
        }
      },
      toggleReaction: (itemId, emoji) => {
        const mine = extras.reactions.some((r) => r.eventId === itemId && r.userId === you.id && r.emoji === emoji)
        setExtras((x) => ({
          ...x,
          reactions: mine
            ? x.reactions.filter((r) => !(r.eventId === itemId && r.userId === you.id && r.emoji === emoji))
            : [...x.reactions, { eventId: itemId, userId: you.id, emoji }],
        }))
        if (demo) return
        send("/api/feed/reactions", { method: mine ? "DELETE" : "POST", body: JSON.stringify({ eventId: itemId, emoji }) }).catch(
          (e) => {
            setExtras((x) => ({ ...x, reactions: extras.reactions }))
            fail(e)
          }
        )
      },
      addComment: (itemId, text) => {
        const body = text.trim()
        if (!body) return
        const temp = { id: `temp-${Date.now()}`, eventId: itemId, userId: you.id, body, createdAt: new Date().toISOString() }
        setExtras((x) => ({ ...x, comments: [...x.comments, temp] }))
        if (demo) return
        send("/api/feed/comments", { method: "POST", body: JSON.stringify({ eventId: itemId, body }) })
          .then((res) => res.json() as Promise<{ comment: { id: string } }>)
          .then(({ comment }) =>
            setExtras((x) => ({ ...x, comments: x.comments.map((c) => (c.id === temp.id ? { ...c, id: comment.id } : c)) }))
          )
          .catch((e) => {
            setExtras((x) => ({ ...x, comments: x.comments.filter((c) => c.id !== temp.id) }))
            fail(e)
          })
      },
      nudge: (memberId) => {
        if (nudged.includes(memberId)) return
        setNudged((list) => [...list, memberId])
        if (demo) return
        send("/api/nudges", { method: "POST", body: JSON.stringify({ to: memberId }) }).catch((e) => {
          setNudged((list) => list.filter((id) => id !== memberId))
          fail(e)
        })
      },
      dismissToast: () => setToast(null),
    }
  }, [season, initial.squad.name, members, you, logs, feed, nudged, demo, checkInOpen, checkInDay, toast, seasonView, extras])

  return <SquadContext.Provider value={value}>{children}</SquadContext.Provider>
}

export function useSquad() {
  const ctx = React.useContext(SquadContext)
  if (!ctx) throw new Error("useSquad must be used inside SquadProvider")
  return ctx
}

// Date and scoring helpers for the current season
export function useSeason() {
  return useSquad().season
}
