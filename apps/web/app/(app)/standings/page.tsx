"use client"

import * as React from "react"
import Link from "next/link"
import { LayoutGroup, motion } from "motion/react"
import { RiArrowDownSFill, RiArrowUpSFill } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, hueVar, pct } from "@/components/bits"
import { SquadLines } from "@/components/charts"
import { useSquad, useSeason } from "@/components/squad-store"
import {
  type Member,
  type Season,
  type SeasonLogs,
  weightSeries,
} from "@/lib/season"

type Period = "week" | "last" | "season"
const periods: { id: Period; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "last", label: "Last week" },
  { id: "season", label: "Season" },
]

function scoresFor(
  season: Season,
  members: Member[],
  logs: SeasonLogs,
  period: Period,
  offset = 0
) {
  const { TODAY, weekOf, weekScore, rangeScore } = season
  const week = weekOf(TODAY)
  return members.map((m) => {
    const l = logs[m.id] ?? []
    const score =
      period === "week"
        ? weekScore(m, l, week - offset)
        : period === "last"
          ? weekScore(m, l, week - 1 - offset)
          : rangeScore(m, l, 0, offset ? week * 7 - 1 : TODAY)
    return { member: m, score }
  })
}

function ranked(list: ReturnType<typeof scoresFor>) {
  return [...list].sort((a, b) => b.score - a.score)
}

export default function StandingsPage() {
  const season = useSeason()
  const { TODAY, shortDate, weekOf, weekLabel, weekScore, started, longDate } =
    season
  const { logs, members } = useSquad()
  const [period, setPeriod] = React.useState<Period>("week")
  const current = ranked(scoresFor(season, members, logs, period))
  // Movement compares against the same table one week earlier
  const before = ranked(scoresFor(season, members, logs, period, 1))
  const week = weekOf(TODAY)

  const subtitle =
    period === "week"
      ? `Week ${week + 1}, ${weekLabel(week)}, so far`
      : period === "last"
        ? `Week ${week}, ${weekLabel(week - 1)}`
        : `${shortDate(0)} to ${shortDate(TODAY)}`

  const hitRateSeries = members.map((m) => ({
    member: m,
    values: Array.from(
      { length: week + 1 },
      (_, w) => weekScore(m, logs[m.id] ?? [], w) * 100
    ),
  }))
  // Members who share weight as kilos are converted to percent; "change only" members already are
  const weightChange = members
    .filter((m) => m.startWeight !== undefined)
    .map((m) => {
      const asPct = m.goals.find((g) => g.id === "weight")?.unit === "%"
      return {
        member: m,
        values: weightSeries((logs[m.id] ?? []).slice(0, TODAY + 1)).map((p) =>
          p.avg === undefined
            ? undefined
            : asPct
              ? p.avg
              : ((p.avg - m.startWeight!) / m.startWeight!) * 100
        ),
      }
    })
    .filter((s) => s.values.some((v) => v !== undefined))

  if (!started) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
        <header className="px-1 pe-14 lg:pe-1">
          <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">
            Standings
          </h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">
            The table starts on {longDate(0)}. You&apos;ll be ranked by hit
            rate: the share of your own goals you hit, so different goals still
            compete fairly.
          </p>
        </header>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <header className="px-1 pe-14 lg:pe-1">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">
          Standings
        </h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          Ranked by hit rate: the share of your own goals you hit.
          Everyone&apos;s goals are different, so this is the fair way to
          compare.
        </p>
      </header>

      <section className="rounded-3xl bg-card p-3 sm:p-4">
        <LayoutGroup>
          <div
            role="tablist"
            aria-label="Period"
            className="flex gap-1 rounded-full bg-muted p-1"
          >
            {periods.map((p) => (
              <button
                key={p.id}
                role="tab"
                aria-selected={period === p.id}
                onClick={() => setPeriod(p.id)}
                className="relative h-10 flex-1 rounded-full text-sm font-semibold text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring aria-selected:text-foreground"
              >
                {period === p.id && (
                  <motion.span
                    layoutId="period-pill"
                    className="absolute inset-0 rounded-full bg-card shadow-sm"
                  />
                )}
                <span className="relative">{p.label}</span>
              </button>
            ))}
          </div>

          <p className="px-3 pt-4 pb-1 text-sm text-muted-foreground">
            {subtitle}
          </p>

          <ol className="grid">
            {current.map((row, i) => {
              const prev = before.findIndex(
                (b) => b.member.id === row.member.id
              )
              const moved = prev - i
              return (
                <motion.li key={row.member.id} layout className="rounded-2xl">
                  <Link
                    href={`/squad/${row.member.id}`}
                    className="grid grid-cols-[1.75rem_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-3 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className="font-display text-2xl font-semibold text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <Avatar member={row.member} size={40} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {row.member.isYou ? "You" : row.member.name}
                        </span>
                        <Movement moved={moved} />
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: hueVar(row.member.hue) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${row.score * 100}%` }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 30,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-14 text-end font-display text-2xl font-semibold">
                      {pct(row.score)}
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </ol>
        </LayoutGroup>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Hit rate by week
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Week {week + 1} is still in progress
          </p>
          {week === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              A line per person appears once week 2 starts.
            </p>
          ) : (
            <SquadLines
              series={hitRateSeries}
              label="Each person's weekly hit rate"
              xLabel={(i) => `Week ${i + 1}`}
              xTicks={Array.from({ length: week + 1 }, (_, i) => i).filter(
                (i) => i % 2 === 0 || i === week
              )}
              format={(v) => `${Math.round(v)}%`}
            />
          )}
        </section>
        {weightChange.length > 0 && (
          <section className="min-w-0 rounded-3xl bg-card p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Weight change
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Percent of starting weight, 7-day average. No one&apos;s actual
              weight is shown.
            </p>
            <SquadLines
              series={weightChange}
              label={`Each person's weight change since ${shortDate(0)}, as a percent of starting weight`}
              xLabel={(i) => shortDate(i)}
              xTicks={[0, 31, 61].filter((d) => d < TODAY - 5).concat(TODAY)}
              format={(v) =>
                `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`
              }
              axisFormat={(v) =>
                `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`
              }
            />
          </section>
        )}
      </div>
    </div>
  )
}

function Movement({ moved }: { moved: number }) {
  if (moved === 0) return <span className="sr-only">No change</span>
  const up = moved > 0
  const Icon = up ? RiArrowUpSFill : RiArrowDownSFill
  return (
    <span
      className={cn(
        "flex items-center text-xs font-medium text-muted-foreground"
      )}
    >
      <Icon className="size-4" aria-hidden />
      {Math.abs(moved)}
      <span className="sr-only">
        {up ? " place up" : " place down"} on a week ago
      </span>
    </span>
  )
}
