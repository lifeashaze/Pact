// Small derived numbers for the home screen, kept apart from the layout code.

import { type DayLog, type Goal, type Member, type Season, type SeasonLogs, formatNumber } from "@/lib/season"

type Logs = (DayLog | undefined)[]

export type Phase = "before" | "during" | "after"

export function seasonPhase(season: Season): Phase {
  if (!season.started) return "before"
  if (season.ended) return "after"
  return "during"
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// The big line at the top of the page
export function headline(season: Season) {
  const { longDate, SEASON_DAYS, today } = season
  const phase = seasonPhase(season)
  if (phase === "before") return { date: longDate(today), title: `Starts in ${plural(-today, "day")}.` }
  if (phase === "after") return { date: longDate(SEASON_DAYS - 1), title: "That's the season." }
  const left = SEASON_DAYS - today - 1
  return { date: longDate(today), title: left === 0 ? `Day ${today + 1}. Last one.` : `Day ${today + 1}. ${left} to go.` }
}

export const checkedInCount = (people: Member[], logs: SeasonLogs, today: number) =>
  people.filter((m) => !!logs[m.id]?.[today]).length

// Not everyone has a workout goal
export const weeklyWorkoutTarget = (m: Member) => m.goals.find((g) => g.weekly)?.weekly

export const memberWeekScore = (season: Season, m: Member, logs: Logs): number | undefined =>
  m.goals.some((g) => g.scored) ? season.weekScore(m, logs, season.weekOf(season.TODAY)) : undefined

export function goalTarget(goal: Goal) {
  if (goal.kind !== "number" || goal.target === undefined) return undefined
  const n = formatNumber(goal.target, goal.unit)
  return goal.compare === "max" ? `${n} max` : `${n} min`
}

export function goalValue(goal: Goal, log: DayLog | undefined) {
  const v = log?.numbers[goal.id]
  return v === undefined ? undefined : formatNumber(v, goal.unit)
}

// The most recent finished week, if there is one
export function recapWeek(season: Season) {
  const { weekOf, weekLabel, TODAY, ended } = season
  if (!season.started) return undefined
  const week = ended ? weekOf(TODAY) : weekOf(TODAY) - 1
  return week < 0 ? undefined : { number: week + 1, label: weekLabel(week) }
}
