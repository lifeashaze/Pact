// Weight progress worked out from the logs alone, so every past weigh-in counts:
// records, weekly change, pace, plateaus, milestones and personal bests.
// Values are kg, or percent change from the start for members who only share change.

import {
  type DayLog,
  type Member,
  isHit,
  weightGoal,
  weightSeries,
} from "@/lib/season"

type Logs = (DayLog | undefined)[]

// A trend low needs this many weigh-ins inside its 5-day window
const TREND_WINDOW = 5
const TREND_MIN_WEIGH_INS = 3
// Changes smaller than this are treated as no change
const EPSILON = 0.005

export type WeightDirection = -1 | 1

// Losing unless the goal sits above the start
export function weightDirection(member: Member): WeightDirection {
  const { startWeight, goalWeight } = member
  if (
    startWeight !== undefined &&
    goalWeight !== undefined &&
    goalWeight > startWeight
  )
    return 1
  return -1
}

const isBetter = (dir: WeightDirection, value: number, best: number) =>
  (value - best) * dir > EPSILON

// 7-day averages for every day up to today, even when the logs array has gaps
const averages = (logs: Logs, today: number) =>
  weightSeries(
    Array.from({ length: Math.max(0, today + 1) }, (_, d) => logs[d])
  ).map((p) => p.avg)

const weighIns = (logs: Logs, today: number) =>
  Array.from(
    { length: Math.max(0, today + 1) },
    (_, d) => logs[d]?.numbers.weight
  )

// 5-day trailing average, only on days with a weigh-in and enough weigh-ins around it
export function trendSeries(logs: Logs, today: number) {
  const raw = weighIns(logs, today)
  return raw.map((w, d) => {
    if (w === undefined) return undefined
    const window = raw
      .slice(Math.max(0, d - TREND_WINDOW + 1), d + 1)
      .filter((v): v is number => v !== undefined)
    if (window.length < TREND_MIN_WEIGH_INS) return undefined
    return window.reduce((a, b) => a + b, 0) / window.length
  })
}

export type DayRecord = {
  // A weigh-in better than every earlier one and the start weight
  scale?: number
  // A 5-day average better than every earlier one and the start weight
  trend?: number
}

// Days that set a new best, toward the goal (a new low for anyone losing)
export function weightRecords(member: Member, logs: Logs, today: number) {
  const dir = weightDirection(member)
  const raw = weighIns(logs, today)
  const trend = trendSeries(logs, today)
  const records: Record<number, DayRecord> = {}
  let bestScale = member.startWeight
  let bestTrend = member.startWeight
  for (let d = 0; d < raw.length; d++) {
    const w = raw[d]
    if (w !== undefined) {
      if (bestScale !== undefined && isBetter(dir, w, bestScale))
        (records[d] ??= {}).scale = w
      if (bestScale === undefined || isBetter(dir, w, bestScale)) bestScale = w
    }
    const t = trend[d]
    if (t !== undefined) {
      if (bestTrend !== undefined && isBetter(dir, t, bestTrend))
        (records[d] ??= {}).trend = t
      if (bestTrend === undefined || isBetter(dir, t, bestTrend)) bestTrend = t
    }
  }
  return records
}

// ---------- weekly change and pace ----------

type WeekRange = (week: number) => { start: number; end: number }

// The 7-day average at the end of each season week (or today), and its change on the week before.
// Week 1 is measured from the start weight
export function weeklyChanges(
  member: Member,
  logs: Logs,
  today: number,
  weeks: number,
  weekDays: WeekRange
) {
  const avg = averages(logs, today)
  const firstWeighIn = weighIns(logs, today).find((v) => v !== undefined)
  let previous = member.startWeight ?? firstWeighIn
  const out: {
    week: number
    end: number
    avg?: number
    change?: number
    partial: boolean
  }[] = []
  for (let week = 0; week < weeks; week++) {
    const { start, end } = weekDays(week)
    if (start > today) break
    const last = Math.min(end, today)
    const value = avg[last]
    out.push({
      week,
      end: last,
      avg: value,
      change:
        value !== undefined && previous !== undefined
          ? value - previous
          : undefined,
      partial: last < end,
    })
    if (value !== undefined) previous = value
  }
  return out
}

export function weightPace(member: Member, logs: Logs, today: number) {
  const avg = averages(logs, today)
  let last = -1
  for (let d = Math.min(today, avg.length - 1); d >= 0; d--)
    if (avg[d] !== undefined) {
      last = d
      break
    }
  if (last < 0) return undefined
  const current = avg[last]!
  const start = member.startWeight
  const at = (d: number) => (d >= 0 ? avg[d] : undefined)
  const diff = (a: number | undefined, b: number | undefined) =>
    a !== undefined && b !== undefined ? a - b : undefined

  // Season pace needs a full week of data to mean anything
  const seasonPerWeek =
    start !== undefined && last >= 6
      ? ((current - start) / (last + 1)) * 7
      : undefined
  const lastWeek = diff(current, at(last - 7))
  // The prediction leans on the last two weeks so it follows how things are going now
  const recentPerWeek =
    at(last - 14) !== undefined
      ? (current - at(last - 14)!) / 2
      : (lastWeek ?? seasonPerWeek)

  const goal = member.goalWeight
  const dir = weightDirection(member)
  let projection:
    | { kind: "reached" }
    | { kind: "stalled" }
    | { kind: "date"; day: number; weeks: number }
    | undefined
  if (goal !== undefined && recentPerWeek !== undefined) {
    const remaining = goal - current
    if (remaining * dir <= EPSILON) projection = { kind: "reached" }
    else if (recentPerWeek * dir <= 0.01) projection = { kind: "stalled" }
    else {
      const weeks = remaining / recentPerWeek
      projection = { kind: "date", weeks, day: last + Math.ceil(weeks * 7) }
    }
  } else if (goal !== undefined && (goal - current) * dir <= EPSILON) {
    projection = { kind: "reached" }
  }

  return {
    current,
    seasonPerWeek,
    lastWeek,
    recentPerWeek,
    projection,
    // Percent of what you weigh now, so it keeps adapting as you lose
    percentOf: (change: number | undefined) =>
      change === undefined ? undefined : (change / current) * 100,
  }
}

// ---------- milestones ----------

export type Milestone = {
  id: string
  kind: "percent" | "halfway" | "goal"
  label: string
  // For the badge itself, like "3 kg" or "5%"
  short: string
  // First day the 7-day average crossed it
  day?: number
  // Still to go when not earned yet
  remaining?: number
}

// Season-long badges, measured on the 7-day average so one light morning can't earn one.
// Kilo badges work in rounds instead, see kiloRounds
export function weightMilestones(
  member: Member,
  logs: Logs,
  today: number
): Milestone[] {
  const start = member.startWeight
  if (start === undefined) return []
  const dir = weightDirection(member)
  const avg = averages(logs, today)
  const moved = avg.map((v) =>
    v === undefined ? undefined : (v - start) * dir
  )
  const best = Math.max(0, ...moved.filter((v): v is number => v !== undefined))
  const firstDay = (amount: number) => {
    const d = moved.findIndex((v) => v !== undefined && v >= amount - EPSILON)
    return d < 0 ? undefined : d
  }
  const badge = (
    id: string,
    kind: Milestone["kind"],
    label: string,
    short: string,
    amount: number
  ): Milestone => {
    const day = firstDay(amount)
    return {
      id,
      kind,
      label,
      short,
      day,
      remaining: day === undefined ? amount - best : undefined,
    }
  }

  const span =
    member.goalWeight !== undefined
      ? Math.abs(member.goalWeight - start)
      : undefined
  const list: Milestone[] = []
  for (const p of [5, 10, 15, 20]) {
    const amount = (start * p) / 100
    if (span !== undefined && amount > span + EPSILON && p > 5) break
    list.push(
      badge(`pct-${p}`, "percent", `${p}% of body weight`, `${p}%`, amount)
    )
  }
  if (span !== undefined && span > 0) {
    list.push(
      badge("halfway", "halfway", "Halfway to goal", "Halfway", span / 2)
    )
    list.push(badge("goal", "goal", "Goal reached", "Goal", span))
  }
  return list
}

// Kilo badges restart every round: within each one you can earn 1 kg, 2 kg and so on
// again, counted from the 7-day average where the round began
export const BADGE_ROUND_DAYS = 20

export function kiloRounds(member: Member, logs: Logs, today: number) {
  const dir = weightDirection(member)
  const avg = averages(logs, today)
  const latestBefore = (day: number) => {
    for (let d = Math.min(day, avg.length - 1); d >= 0; d--)
      if (avg[d] !== undefined) return avg[d]
    return undefined
  }
  const rounds: {
    round: number
    start: number
    end: number
    // Kilos earned in this round, with the day each was reached
    earned: { kg: number; day: number }[]
    // How far it has moved toward the goal so far, in kg
    moved: number
  }[] = []
  for (let start = 0; start <= today; start += BADGE_ROUND_DAYS) {
    const end = start + BADGE_ROUND_DAYS - 1
    const base =
      start === 0
        ? (member.startWeight ?? avg.find((v) => v !== undefined))
        : latestBefore(start - 1)
    const earned: { kg: number; day: number }[] = []
    let moved = 0
    if (base !== undefined) {
      for (let d = start; d <= Math.min(end, today); d++) {
        if (avg[d] === undefined) continue
        const m = (avg[d]! - base) * dir
        moved = Math.max(moved, m)
        while (m >= earned.length + 1 - EPSILON)
          earned.push({ kg: earned.length + 1, day: d })
      }
    }
    rounds.push({ round: rounds.length, start, end, earned, moved })
  }
  return rounds
}

// ---------- personal bests ----------

export function longestRun(today: number, hit: (day: number) => boolean) {
  let best = 0
  let run = 0
  for (let d = 0; d <= today; d++) {
    run = hit(d) ? run + 1 : 0
    best = Math.max(best, run)
  }
  return best
}

export function personalBests(
  member: Member,
  logs: Logs,
  today: number,
  weeks: ReturnType<typeof weeklyChanges>
) {
  const dir = weightDirection(member)
  const protein = member.goals.find(
    (g) => g.id === "nutrition-protein" && g.target !== undefined
  )
  const raw = weighIns(logs, today).filter((v): v is number => v !== undefined)
  const bestWeek = weeks
    .filter((w) => w.change !== undefined && w.change * dir > EPSILON)
    .sort((a, b) => (b.change! - a.change!) * dir)[0]
  return {
    streak: longestRun(today, (d) => !!logs[d]),
    proteinRun: protein
      ? longestRun(today, (d) => isHit(protein, logs[d]))
      : undefined,
    bestWeek,
    bestWeighIn:
      raw.length && weightGoal(member)
        ? dir < 0
          ? Math.min(...raw)
          : Math.max(...raw)
        : undefined,
  }
}
