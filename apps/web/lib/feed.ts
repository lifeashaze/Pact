import { type DayLog, type Member, type Season, type SeasonLogs, dayResult, weightSeries, workoutGoal } from "@/lib/season"

export const REACTIONS = ["🔥", "💪", "👏", "😤"] as const
export type Reaction = (typeof REACTIONS)[number]

export type FeedItem = {
  // Stable, so reactions and comments stored against it survive rebuilding the feed
  id: string
  memberId: string
  day: number
  time: string
  // For ordering within a day
  at: string
  kind: "workout" | "perfect" | "weight" | "streak" | "checkin"
  title: string
  detail?: string
  reactions: Partial<Record<Reaction, string[]>>
  comments: { id: string; memberId: string; text: string }[]
}

export type FeedExtras = {
  reactions: { eventId: string; userId: string; emoji: string }[]
  comments: { id: string; eventId: string; userId: string; body: string; createdAt: string }[]
  timeZone: string
}

const STREAKS = new Set([7, 14, 21, 30, 45, 60, 75, 92])

function clock(iso: string | undefined, timeZone: string) {
  if (!iso) return ""
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso))
}

// One item per check-in (titled by its best moment), plus streak and weight milestones
// on the day they happened. Everything is derived from logs, so nothing drifts
export function buildFeed(season: Season, members: Member[], logs: SeasonLogs, extras: FeedExtras, daysBack = 14): FeedItem[] {
  const items: Omit<FeedItem, "reactions" | "comments">[] = []
  const last = season.TODAY
  const first = Math.max(0, last - daysBack + 1)

  for (const m of members) {
    const l = logs[m.id] ?? []
    const wg = workoutGoal(m)
    let run = 0
    const weights = weightSeries(l.slice(0, last + 1))
    let weightStep = 0
    const start = m.startWeight

    for (let day = 0; day <= last; day++) {
      const log = l[day]
      run = log ? run + 1 : 0
      // Weight milestones every 2 kg (or 2% when the squad only sees change)
      const avg = weights[day]?.avg
      let weightItem: string | null = null
      if (avg !== undefined && start !== undefined) {
        const pct = m.goals.find((g) => g.id === "weight")?.unit === "%"
        const down = pct ? -avg : start - avg
        const step = Math.floor(down / 2)
        if (step > weightStep) {
          weightStep = step
          weightItem = pct ? `Down ${step * 2}% since ${season.shortDate(0)}` : `Down ${step * 2} kg since ${season.shortDate(0)}`
        }
      }
      if (day < first || !log) continue
      const time = clock(log.savedAt, extras.timeZone)
      const at = log.savedAt ?? ""
      const r = dayResult(m, log)

      if (log.checks.workout && wg) {
        const n = season.workoutsInWeek(l, season.weekOf(day))
        items.push({
          id: `${m.id}:${day}:day`,
          memberId: m.id,
          day,
          time,
          at,
          kind: "workout",
          title: log.workoutName || "Worked out",
          detail: `Workout ${Math.min(n, 99)} of ${wg.weekly} this week${r.total ? `, ${r.hit} of ${r.total} daily goals` : ""}`,
        })
      } else if (r.total && r.hit === r.total) {
        items.push({ id: `${m.id}:${day}:day`, memberId: m.id, day, time, at, kind: "perfect", title: `Hit all ${r.total} daily goals` })
      } else {
        items.push({
          id: `${m.id}:${day}:day`,
          memberId: m.id,
          day,
          time,
          at,
          kind: "checkin",
          title: r.total ? `Checked in: ${r.hit} of ${r.total} daily goals` : "Checked in",
        })
      }
      if (STREAKS.has(run)) {
        items.push({ id: `${m.id}:${day}:streak`, memberId: m.id, day, time, at: at + "1", kind: "streak", title: `${run}-day check-in streak` })
      }
      if (weightItem) {
        items.push({ id: `${m.id}:${day}:weight`, memberId: m.id, day, time, at: at + "2", kind: "weight", title: weightItem, detail: "Based on the 7-day average" })
      }
    }
  }

  const byEvent = new Map<string, FeedItem["reactions"]>()
  for (const r of extras.reactions) {
    const map = byEvent.get(r.eventId) ?? {}
    const emoji = r.emoji as Reaction
    map[emoji] = [...(map[emoji] ?? []), r.userId]
    byEvent.set(r.eventId, map)
  }
  const talk = new Map<string, FeedItem["comments"]>()
  for (const c of extras.comments) {
    talk.set(c.eventId, [...(talk.get(c.eventId) ?? []), { id: c.id, memberId: c.userId, text: c.body }])
  }

  return items
    .map((i) => ({ ...i, reactions: byEvent.get(i.id) ?? {}, comments: talk.get(i.id) ?? [] }))
    .sort((a, b) => b.day - a.day || b.at.localeCompare(a.at))
}

export const logSavedNow = (log: DayLog): DayLog => ({ ...log, savedAt: new Date().toISOString() })
