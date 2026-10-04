// The season model the UI works with: members, their goals, and one log per
// member per day. Real data arrives from the server (lib/squad-data.ts) in this
// shape; createSeason() binds the date and scoring helpers to a season.

export type Hue = "blue" | "orange" | "aqua" | "violet"
export const HUES: Hue[] = ["blue", "orange", "aqua", "violet"]

export type Goal = {
  // Stable per member: "workout", "weight", or "<module>-<metric>". Logs are keyed by it
  id: string
  // Database row, used when saving
  dbId: string
  module: string
  label: string
  category: string
  kind: "check" | "number"
  unit?: string
  target?: number
  compare?: "min" | "max"
  step?: number
  // Workouts count toward a weekly target instead of a daily one
  weekly?: number
  startValue?: number
  // Weight is tracked and charted but never scored
  scored: boolean
  visibility: "squad" | "summary" | "private"
}

export type Member = {
  id: string
  name: string
  initials: string
  hue: Hue
  image: string | null
  isYou: boolean
  goals: Goal[]
  // From the weight goal, when there is one
  startWeight?: number
  goalWeight?: number
}

export type DayLog = {
  checks: Record<string, boolean>
  numbers: Record<string, number | undefined>
  workoutName?: string
  savedAt?: string
}

export type SeasonLogs = Record<string, (DayLog | undefined)[]>

export type SeasonInfo = {
  // YYYY-MM-DD of day 0
  startsOn: string
  days: number
  // The viewer's today as a day index. Negative before the season starts
  today: number
}

const DAY_MS = 86_400_000

export const goalKey = (module: string, metric: string) =>
  module === "workouts" ? "workout" : module === "weight" ? "weight" : `${module}-${metric}`

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : (parts[0] ?? "?").slice(0, 2)
  return letters.toUpperCase()
}

// Day index for a calendar date in a given IANA zone
export function dayIndex(startsOn: string, date: Date, timeZone: string) {
  const local = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
  return Math.round((Date.parse(local) - Date.parse(startsOn)) / DAY_MS)
}

export const isoDay = (startsOn: string, day: number) =>
  new Date(Date.parse(startsOn) + day * DAY_MS).toISOString().slice(0, 10)

// People who joined after the season started can fill in every missed day until this date
// (inclusive, in their own time zone). After it, only today and yesterday stay open
export const BACKFILL_UNTIL = "2026-10-07"

// Earliest day index a member can still log or edit, given their today
export function firstEditableDay(startsOn: string, today: number) {
  if (isoDay(startsOn, today) <= BACKFILL_UNTIL) return 0
  return Math.max(0, today - 1)
}

// ---------- helpers that don't depend on the date ----------

export function isHit(goal: Goal, log: DayLog | undefined) {
  if (!log) return false
  if (goal.kind === "check") return !!log.checks[goal.id]
  const v = log.numbers[goal.id]
  if (v === undefined || goal.target === undefined) return false
  return goal.compare === "max" ? v <= goal.target : v >= goal.target
}

// Goals scored every day: everything scored except the weekly workout target
export const dailyGoals = (m: Member) => m.goals.filter((g) => g.scored && !g.weekly)
export const workoutGoal = (m: Member) => m.goals.find((g) => g.weekly && g.scored)
export const weightGoal = (m: Member) => m.goals.find((g) => g.id === "weight")

export function dayResult(m: Member, log: DayLog | undefined) {
  const goals = dailyGoals(m)
  const hit = goals.filter((g) => isHit(g, log)).length
  return { hit, total: goals.length, logged: !!log }
}

export function dayScore(m: Member, log: DayLog | undefined) {
  const { hit, total } = dayResult(m, log)
  return log && total ? hit / total : 0
}

// 7-day trailing average of logged weigh-ins
export function weightSeries(logs: (DayLog | undefined)[]) {
  const raw = logs.map((l) => l?.numbers.weight)
  return raw.map((w, i) => {
    const window = raw.slice(Math.max(0, i - 6), i + 1).filter((v): v is number => v !== undefined)
    const avg = window.length ? window.reduce((a, b) => a + b, 0) / window.length : undefined
    return { day: i, weight: w, avg }
  })
}

export function latestAverage(logs: (DayLog | undefined)[]) {
  const series = weightSeries(logs)
  for (let i = series.length - 1; i >= 0; i--) if (series[i]!.avg !== undefined) return series[i]!.avg!
  return undefined
}

const WHOLE_UNITS = new Set(["kcal", "steps"])

export function formatNumber(value: number, unit?: string) {
  const n = unit && WHOLE_UNITS.has(unit) ? Math.round(value).toLocaleString("en-GB") : `${value}`
  if (!unit) return n
  return `${n} ${unit}`
}

// ---------- helpers bound to a season ----------

export function createSeason(info: SeasonInfo) {
  const SEASON_START = Date.parse(info.startsOn)
  const SEASON_DAYS = info.days
  // Before the season this is negative; after it, pinned to the last day
  const TODAY = Math.min(info.today, SEASON_DAYS - 1)
  const WEEKS = Math.ceil(SEASON_DAYS / 7)

  const dateOf = (day: number) => new Date(SEASON_START + day * DAY_MS)
  const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts })
  const fmtShort = fmt({ day: "numeric", month: "short" })
  const fmtLong = fmt({ weekday: "long", day: "numeric", month: "long" })
  const fmtWeekday = fmt({ weekday: "short", day: "numeric", month: "short" })
  const shortDate = (day: number) => fmtShort.format(dateOf(day))
  const longDate = (day: number) => fmtLong.format(dateOf(day))
  const weekdayDate = (day: number) => fmtWeekday.format(dateOf(day))

  // Weeks are 7-day blocks from the first day; the last one may be short
  const weekOf = (day: number) => Math.floor(Math.max(0, day) / 7)
  const weekDays = (week: number) => {
    const start = week * 7
    return { start, end: Math.min(start + 6, SEASON_DAYS - 1) }
  }
  const weekLabel = (week: number) => {
    const { start, end } = weekDays(week)
    return `${shortDate(start)} – ${shortDate(end)}`
  }

  // Hit rate over a day range. Workouts count as one extra goal per day,
  // scored by how much of the weekly target was met. Today only counts once logged.
  function rangeScore(m: Member, logs: (DayLog | undefined)[], from: number, to: number) {
    let hit = 0
    let total = 0
    const target = workoutGoal(m)?.weekly
    for (let week = weekOf(from); week <= weekOf(to); week++) {
      const { start, end } = weekDays(week)
      const a = Math.max(start, from)
      const b = Math.min(end, to)
      let days = 0
      let workouts = 0
      for (let d = a; d <= b; d++) {
        if (d > TODAY || d < 0) continue
        if (d === TODAY && !logs[d]) continue
        const r = dayResult(m, logs[d])
        hit += r.hit
        total += r.total
        days++
        if (logs[d]?.checks.workout) workouts++
      }
      if (days === 0 || !target) continue
      // A week in progress is judged against its share of the weekly target
      const weekLength = end - start + 1
      const expected = (target * days) / weekLength
      hit += Math.min(1, workouts / expected) * days
      total += days
    }
    return total ? hit / total : 0
  }

  const weekScore = (m: Member, logs: (DayLog | undefined)[], week: number) => {
    const { start, end } = weekDays(week)
    return rangeScore(m, logs, start, Math.min(end, TODAY))
  }
  const seasonScore = (m: Member, logs: (DayLog | undefined)[]) => rangeScore(m, logs, 0, TODAY)

  function workoutsInWeek(logs: (DayLog | undefined)[], week: number) {
    const { start, end } = weekDays(week)
    let n = 0
    for (let d = start; d <= Math.min(end, TODAY); d++) if (logs[d]?.checks.workout) n++
    return n
  }

  // Days in a row with a check-in, counting back from today (or yesterday if today isn't logged yet)
  function streak(logs: (DayLog | undefined)[]) {
    let d = logs[TODAY] ? TODAY : TODAY - 1
    let n = 0
    while (d >= 0 && logs[d]) {
      n++
      d--
    }
    return n
  }

  return {
    ...info,
    SEASON_START,
    SEASON_DAYS,
    TODAY,
    WEEKS,
    started: info.today >= 0,
    ended: info.today >= SEASON_DAYS,
    FIRST_EDITABLE: firstEditableDay(info.startsOn, TODAY),
    backfillOpen: isoDay(info.startsOn, TODAY) <= BACKFILL_UNTIL,
    daysUntilStart: Math.max(0, -info.today),
    dateOf,
    shortDate,
    longDate,
    weekdayDate,
    weekOf,
    weekDays,
    weekLabel,
    rangeScore,
    weekScore,
    seasonScore,
    workoutsInWeek,
    streak,
  }
}

export type Season = ReturnType<typeof createSeason>
