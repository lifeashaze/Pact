"use client"

import { RiMedalFill } from "@remixicon/react"

import { useSeason } from "@/components/squad-store"
import { type DayLog, type Member, formatNumber } from "@/lib/season"
import {
  kiloRounds,
  personalBests,
  weeklyChanges,
  weightMilestones,
  weightPace,
} from "@/lib/weight-stats"

type Logs = (DayLog | undefined)[]

const signed = (n: number, digits = 1) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}`

// This week's change in kg and as a share of current body weight
export function WeightProgress({
  member,
  logs,
}: {
  member: Member
  logs: Logs
}) {
  const { TODAY, WEEKS, weekDays, weekOf, shortDate, longDate } = useSeason()
  const pace = weightPace(member, logs, TODAY, WEEKS, weekDays)
  if (pace?.week.change === undefined)
    return (
      <p className="text-sm text-muted-foreground">
        Shows once a week has 2 or more weigh-ins.
      </p>
    )
  const { week } = pace
  const change = week.change!
  const pct = pace.percentOf(change)!
  const proj = pace.projection
  const isCurrent = week.week === weekOf(TODAY)
  return (
    <div>
      {!isCurrent && (
        <p className="mb-1 text-sm text-muted-foreground">
          Week of {shortDate(weekDays(week.week).start)}. This week needs 2
          weigh-ins
        </p>
      )}
      <p className="flex items-baseline gap-3 font-display font-semibold tabular-nums">
        <span className="text-4xl">{signed(change)} kg</span>
        <span className="text-2xl text-muted-foreground">
          {signed(pct, 2)}%
        </span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {pace.current} kg
        {pace.previous !== undefined
          ? `, ${change > 0 ? "up from" : change < 0 ? "down from" : "same as"} ${pace.previous} kg`
          : ""}
      </p>
      {pace.seasonPerWeek !== undefined && (
        <p className="mt-1 text-sm text-muted-foreground">
          Average {signed(pace.seasonPerWeek, 2)} kg (
          {signed(pace.percentOf(pace.seasonPerWeek)!, 2)}%) a week
        </p>
      )}
      {proj && member.goalWeight !== undefined && (
        <p className="mt-4 border-t border-border pt-4">
          {proj.kind === "reached" ? (
            <span className="font-semibold">
              Goal of {member.goalWeight} kg reached
            </span>
          ) : proj.kind === "stalled" ? (
            <span className="text-muted-foreground">
              Not heading toward {member.goalWeight} kg over the last 2 weeks
            </span>
          ) : (
            <>
              <span className="font-semibold">
                {member.goalWeight} kg in about {weeksText(proj.weeks)}
              </span>
              <span className="block text-sm text-muted-foreground">
                Around {longDate(proj.day)}, at {signed(pace.recentPerWeek!, 2)}{" "}
                kg a week
              </span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

function weeksText(weeks: number) {
  if (weeks < 1.5) return `${Math.max(1, Math.round(weeks * 7))} days`
  if (weeks < 9) return `${Math.round(weeks)} weeks`
  return `${Math.round(weeks / 4.35)} months`
}

export function PersonalBests({
  member,
  logs,
  showWeight,
}: {
  member: Member
  logs: Logs
  showWeight: boolean
}) {
  const { TODAY, WEEKS, SEASON_DAYS, weekDays, shortDate } = useSeason()
  const weeks = weeklyChanges(member, logs, TODAY, WEEKS, weekDays)
  const bests = personalBests(member, logs, TODAY, weeks)
  const seasonBadges = showWeight
    ? weightMilestones(member, logs, TODAY).filter((b) => b.day !== undefined)
    : []
  const rounds = showWeight ? kiloRounds(member, logs, TODAY) : []
  // Each kilo badge with every day it was earned, one per round
  const kilos = new Map<number, number[]>()
  for (const r of rounds)
    for (const e of r.earned)
      kilos.set(e.kg, [...(kilos.get(e.kg) ?? []), e.day])
  const round = rounds.at(-1)
  const losing =
    member.goalWeight === undefined ||
    member.startWeight === undefined ||
    member.goalWeight <= member.startWeight
  const rows: [string, string][] = [
    [
      "Longest streak",
      `${bests.streak} ${bests.streak === 1 ? "day" : "days"}`,
    ],
  ]
  if (bests.proteinRun !== undefined)
    rows.push([
      "Protein streak",
      `${bests.proteinRun} ${bests.proteinRun === 1 ? "day" : "days"}`,
    ])
  if (showWeight && bests.bestWeek)
    rows.push(["Best week", `${signed(bests.bestWeek.change!)} kg`])
  if (showWeight && bests.bestWeighIn !== undefined)
    rows.push([
      losing ? "Lowest weigh-in" : "Highest weigh-in",
      formatNumber(bests.bestWeighIn, "kg"),
    ])

  return (
    <div>
      <dl className="grid gap-2.5">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {showWeight && (kilos.size > 0 || seasonBadges.length > 0) && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {[...kilos].map(([kg, days]) => (
            <Badge
              key={`kg-${kg}`}
              label={`${kg} kg${days.length > 1 ? ` ×${days.length}` : ""}`}
              title={`${kg} kg down: ${days.map(shortDate).join(", ")}`}
            />
          ))}
          {seasonBadges.map((b) => (
            <Badge
              key={b.id}
              label={b.short}
              title={`${b.label}, ${shortDate(b.day!)}`}
            />
          ))}
        </ul>
      )}
      {round && (
        <p className="mt-3 text-sm text-muted-foreground">
          Kilo badges restart every 20 days. This round
          {round.end < SEASON_DAYS - 1
            ? ` ends ${shortDate(round.end)}`
            : " runs to the end"}
          , {Math.max(0.1, round.earned.length + 1 - round.moved).toFixed(1)} kg
          to the {round.earned.length + 1} kg badge.
        </p>
      )}
    </div>
  )
}

function Badge({ label, title }: { label: string; title: string }) {
  return (
    <li
      title={title}
      className="flex items-center gap-1 rounded-full bg-gold-soft py-0.5 ps-1 pe-2.5 text-sm font-semibold"
    >
      <RiMedalFill className="size-4 text-gold" />
      {label}
    </li>
  )
}
