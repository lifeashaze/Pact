"use client"

import * as React from "react"
import Link from "next/link"
import { motion, useInView } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, CountUp, hueTint, hueVar, pct } from "@/components/bits"
import { useSquad, useSeason } from "@/components/squad-store"
import { type DayLog, type Hue, type Member, type Season, dayScore } from "@/lib/season"

type Logs = (DayLog | undefined)[]

// ---------- shared ----------

// One hue per person, light to dark: how much of the day's goals got done
export function levelColor(hue: Hue, score: number) {
  if (score >= 1) return hueVar(hue)
  if (score >= 0.75) return hueTint(hue, 70)
  if (score >= 0.5) return hueTint(hue, 45)
  return hueTint(hue, 22)
}

function dayFill(season: Season, m: Member, logs: Logs, day: number) {
  if (day > season.TODAY) return "var(--grid)"
  const log = logs[day]
  if (!log) return "var(--muted)"
  return levelColor(m.hue, dayScore(m, log))
}

// Days counted so far: today only once it's logged
const countedDays = ({ TODAY }: Season, logs: Logs) => Math.max(0, TODAY + (logs[TODAY] ? 1 : 0))

// Total "points": one per day for hitting everything, fractions for partial days
const seasonPoints = (season: Season, m: Member, logs: Logs) => season.seasonScore(m, logs) * countedDays(season, logs)

// Trailing 7-day hit rate; a day without a check-in counts as zero
function rolling({ TODAY }: Season, m: Member, logs: Logs) {
  const out: (number | undefined)[] = []
  for (let d = 0; d <= TODAY; d++) {
    if (d === TODAY && !logs[d]) break
    let sum = 0
    let n = 0
    for (let k = Math.max(0, d - 6); k <= d; k++) {
      sum += dayScore(m, logs[k])
      n++
    }
    out.push(sum / n)
  }
  return out
}

export function ordinal(n: number) {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`
}

function MonthAxis({ className }: { className?: string }) {
  const season = useSeason()
  const { SEASON_DAYS } = season
  return (
    <div className={cn("relative h-5 text-xs text-muted-foreground", className)}>
      <span className="absolute start-0">1 Oct</span>
      <span className="absolute" style={{ left: `${(31 / SEASON_DAYS) * 100}%` }}>
        1 Nov
      </span>
      <span className="absolute" style={{ left: `${(61 / SEASON_DAYS) * 100}%` }}>
        1 Dec
      </span>
      <span className="absolute end-0 font-medium text-foreground">31 Dec</span>
    </div>
  )
}

function RowLink({ m, label, children, className }: { m: Member; label: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={`/squad/${m.id}`}
      aria-label={label}
      className={cn("rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring", className)}
    >
      {children}
    </Link>
  )
}

// ---------- 1. Lanes: one tick per day ----------

function LanesView() {
  const season = useSeason()
  const { SEASON_DAYS, TODAY, seasonScore } = season
  const { logs, members } = useSquad()
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3">
      {members.map((m, row) => {
        const l = logs[m.id]!
        return (
          <RowLink key={m.id} m={m} label={`${m.name}: ${pct(seasonScore(m, l))} hit rate so far`} className="col-span-3 grid grid-cols-subgrid items-center">
            <Avatar member={m} size={32} />
            <div className="relative h-9">
              <motion.div
                className="flex h-full items-end gap-px"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 0% 0 0)" }}
                transition={{ duration: 1.1, delay: 0.15 + row * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                {Array.from({ length: SEASON_DAYS }, (_, day) => (
                  <span
                    key={day}
                    className="flex-1 rounded-[1px]"
                    style={{
                      height: day > TODAY ? "30%" : !l[day] ? "45%" : "100%",
                      background: dayFill(season, m, l, day),
                    }}
                  />
                ))}
              </motion.div>
            </div>
            <CountUp value={seasonScore(m, l)} format={pct} className="w-11 text-end font-display text-lg font-semibold tabular-nums" />
          </RowLink>
        )
      })}
      <span />
      <MonthAxis />
      <span />
    </div>
  )
}

// ---------- 2. Calendar grids: a GitHub-style grid each ----------

// Columns are Monday-to-Sunday weeks; 1 October is a Thursday
function GridsView() {
  const season = useSeason()
  const { SEASON_DAYS, TODAY, weekdayDate, seasonScore, dateOf } = season
  const FIRST_OFFSET = (dateOf(0).getUTCDay() + 6) % 7
  const GRID_COLS = Math.ceil((SEASON_DAYS + FIRST_OFFSET) / 7)
  const { logs, members } = useSquad()
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:gap-x-8">
      {members.map((m, row) => {
        const l = logs[m.id]!
        return (
          <RowLink key={m.id} m={m} label={`${m.name}: ${pct(seasonScore(m, l))} hit rate so far`} className="grid gap-2">
            <div className="flex items-center gap-2">
              <Avatar member={m} size={24} />
              <span className="font-medium">{m.isYou ? "You" : m.name}</span>
              <CountUp value={seasonScore(m, l)} format={pct} className="ms-auto font-display text-lg font-semibold" />
            </div>
            <motion.div
              className="grid grid-flow-col gap-[3px]"
              style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: row * 0.08 }}
            >
              {Array.from({ length: GRID_COLS * 7 }, (_, i) => {
                const day = i - FIRST_OFFSET
                if (day < 0 || day >= SEASON_DAYS) return <span key={i} />
                return (
                  <span
                    key={i}
                    title={`${weekdayDate(day)}`}
                    className={cn("aspect-square rounded-[3px]", day === TODAY && "ring-2 ring-foreground ring-offset-1 ring-offset-card")}
                    style={{ background: dayFill(season, m, l, day) }}
                  />
                )
              })}
            </motion.div>
          </RowLink>
        )
      })}
      <p className="col-span-2 text-xs text-muted-foreground">Each column is a week, Monday at the top. Oct, Nov and Dec read left to right.</p>
    </div>
  )
}

// ---------- 3. The race: points so far, finish line on 31 December ----------

function RaceView() {
  const season = useSeason()
  const { SEASON_DAYS } = season
  const { logs, members } = useSquad()
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const rows = members.map((m) => ({ m, points: seasonPoints(season, m, logs[m.id]!), counted: countedDays(season, logs[m.id]!) }))
  const ranked = [...rows].sort((a, b) => b.points - a.points)
  const maxSoFar = Math.max(...rows.map((r) => r.counted))
  const todayPct = (maxSoFar / SEASON_DAYS) * 100

  return (
    <div ref={ref} className="grid gap-4">
      <div className="relative grid gap-3">
        {/* Best possible so far: a runner who hit everything every day would be on this line */}
        <div className="pointer-events-none absolute inset-y-0 z-0" style={{ left: `calc(2.75rem + (100% - 2.75rem - 4.75rem) * ${todayPct / 100})` }}>
          <div className="h-full w-px bg-foreground/30" />
        </div>
        {rows.map(({ m, points }, row) => {
          const pos = (points / SEASON_DAYS) * 100
          const rank = ranked.findIndex((r) => r.m.id === m.id) + 1
          return (
            <RowLink key={m.id} m={m} label={`${m.name}: ${points.toFixed(1)} points, rank ${rank}`} className="relative z-10 grid grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-3">
              <span className="text-center font-display text-lg font-semibold text-muted-foreground">{ordinal(rank)}</span>
              <div className="relative h-10">
                {/* The track */}
                <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted" />
                {/* Distance covered */}
                <motion.div
                  className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full"
                  style={{ background: hueVar(m.hue) }}
                  initial={{ width: 0 }}
                  animate={{ width: inView ? `${pos}%` : 0 }}
                  transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.1 + row * 0.1 }}
                />
                {/* The runner */}
                <motion.div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                  initial={{ left: "0%" }}
                  animate={{ left: inView ? `${pos}%` : "0%" }}
                  transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.1 + row * 0.1 }}
                >
                  <span className="block rounded-full ring-3 ring-card">
                    <Avatar member={m} size={34} />
                  </span>
                </motion.div>
              </div>
              <span className="text-end">
                <CountUp value={points} format={(n) => n.toFixed(1)} className="block font-display text-lg leading-tight font-semibold" />
                <span className="text-xs text-muted-foreground">points</span>
              </span>
            </RowLink>
          )
        })}
      </div>
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem] gap-3">
        <span />
        <div className="relative h-5 text-xs text-muted-foreground">
          <span className="absolute start-0">1 Oct</span>
          <span className="absolute -translate-x-1/2 font-medium text-foreground" style={{ left: `${todayPct}%` }}>
            Today
          </span>
          <span className="absolute end-0 font-medium text-foreground">Finish</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        One point for a day with every goal hit, part points for part days. The line is the most anyone could have by now.
      </p>
    </div>
  )
}

// ---------- 4. Week grid: 13 weeks, one cell each ----------

function WeeksView() {
  const season = useSeason()
  const { TODAY, WEEKS, shortDate, weekDays, weekOf, weekScore } = season
  const { logs, members } = useSquad()
  const current = weekOf(TODAY)
  const weeks = Array.from({ length: WEEKS - 1 }, (_, w) => w)
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[2rem_repeat(13,minmax(0,1fr))] gap-1 text-center text-[11px] text-muted-foreground">
        <span />
        {weeks.map((w) => (
          <span key={w} className={cn(w === current && "font-semibold text-foreground")}>
            {w + 1}
          </span>
        ))}
      </div>
      {members.map((m, row) => {
        const l = logs[m.id]!
        return (
          <RowLink key={m.id} m={m} label={`${m.name}, hit rate by week`} className="grid grid-cols-[2rem_repeat(13,minmax(0,1fr))] items-center gap-1">
            <Avatar member={m} size={28} />
            {weeks.map((w) => {
              const future = w > current
              const s = future ? 0 : weekScore(m, l, w)
              return (
                <motion.span
                  key={w}
                  title={future ? `Week ${w + 1}` : `Week ${w + 1} (${shortDate(weekDays(w).start)}): ${pct(s)}${w === current ? " so far" : ""}`}
                  className={cn(
                    "grid aspect-square place-items-center rounded-md text-[10px] font-semibold tabular-nums sm:text-xs",
                    future && "border border-dashed border-border",
                    w === current && "ring-2 ring-foreground ring-offset-1 ring-offset-card"
                  )}
                  style={future ? undefined : { background: `color-mix(in oklab, ${hueVar(m.hue)} ${Math.round(12 + s * 58)}%, var(--card))` }}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: row * 0.06 + w * 0.025 }}
                >
                  {!future && Math.round(s * 100)}
                </motion.span>
              )
            })}
          </RowLink>
        )
      })}
      <p className="mt-1 text-xs text-muted-foreground">Weekly hit rate, weeks 1 to 13. The outlined week is still in progress.</p>
    </div>
  )
}

// ---------- 5. Momentum: 7-day trend per person ----------

function Sparkline({ m, values }: { m: Member; values: (number | undefined)[] }) {
  const season = useSeason()
  const { SEASON_DAYS } = season
  // Drawn at its real pixel width so the line and end dot don't get stretched
  const box = React.useRef<HTMLDivElement>(null)
  const inView = useInView(box, { once: true })
  const [w, setW] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const h = 40
  // x spans the whole season, so the empty right side is the road still ahead
  const x = (i: number) => 4 + (i / (SEASON_DAYS - 1)) * (w - 8)
  const y = (v: number) => h - 4 - v * (h - 8)
  const pts = values.flatMap((v, i) => (v === undefined ? [] : [[x(i), y(v)] as const]))
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("")
  const last = pts[pts.length - 1]
  const area = last ? `${line}L${last[0].toFixed(1)},${h}L${pts[0]![0].toFixed(1)},${h}Z` : ""

  return (
    <div ref={box} className="h-10 min-w-0">
      {w > 0 && last && (
        <svg width={w} height={h} className="overflow-visible" aria-hidden>
          <line x1={4} x2={w - 4} y1={y(1)} y2={y(1)} stroke="var(--grid)" />
          <line x1={4} x2={w - 4} y1={h - 4} y2={h - 4} stroke="var(--grid)" />
          <motion.path d={area} fill={hueVar(m.hue)} initial={{ opacity: 0 }} animate={{ opacity: inView ? 0.1 : 0 }} transition={{ delay: 0.6 }} />
          <motion.path
            d={line}
            fill="none"
            stroke={hueVar(m.hue)}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: inView ? 1 : 0 }}
            transition={{ duration: 1, ease: [0.33, 1, 0.68, 1] }}
          />
          <circle cx={last[0]} cy={last[1]} r={4} fill={hueVar(m.hue)} stroke="var(--card)" strokeWidth={2} />
        </svg>
      )}
    </div>
  )
}

function MomentumView() {
  const season = useSeason()
  const { logs, members } = useSquad()
  return (
    <div className="grid gap-1">
      {members.map((m) => {
        const series = rolling(season, m, logs[m.id]!)
        const now = series[series.length - 1] ?? 0
        const before = series[series.length - 8] ?? now
        const delta = Math.round((now - before) * 100)
        return (
          <RowLink key={m.id} m={m} label={`${m.name}: ${pct(now)} over the last 7 days`} className="grid grid-cols-[auto_4.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 py-1.5">
            <Avatar member={m} size={32} />
            <span className="truncate font-medium">{m.isYou ? "You" : m.name}</span>
            <Sparkline m={m} values={series} />
            <span className="text-end">
              <CountUp value={now} format={pct} className="block font-display text-lg leading-tight font-semibold" />
              <span className="text-xs text-muted-foreground">
                {delta === 0 ? "level" : `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} pts`}
              </span>
            </span>
          </RowLink>
        )
      })}
      <p className="mt-2 text-xs text-muted-foreground">Hit rate over the trailing 7 days since 1 October. The arrow compares with a week ago.</p>
    </div>
  )
}

// ---------- 6. Season rings: the quarter as a clock ----------

function RingsView() {
  const season = useSeason()
  const { SEASON_DAYS, TODAY, seasonScore } = season
  const { logs, members } = useSquad()
  const ref = React.useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true })
  const maskId = React.useId()
  const size = 280
  const c = size / 2
  const outer = c - 6
  // Rings share about 60% of the radius, so any squad size fits around the centre label
  const gap = members.length > 5 ? 3 : 5
  const ringW = Math.min(16, (outer * 0.6) / Math.max(1, members.length) - gap)
  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number) => [c + r * Math.sin(a), c - r * Math.cos(a)]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M${x0!.toFixed(2)},${y0!.toFixed(2)} A${r},${r} 0 0 1 ${x1!.toFixed(2)},${y1!.toFixed(2)}`
  }
  const step = (Math.PI * 2) / SEASON_DAYS
  const todayAngle = (TODAY + 1) * step

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <svg ref={ref} viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[280px]" role="img" aria-label={`Day ${TODAY + 1} of ${SEASON_DAYS}. Rings from outside in: ${members.map((m) => m.name).join(", ")}.`}>
        <defs>
          <mask id={maskId}>
            <motion.circle
              cx={c}
              cy={c}
              r={outer / 2}
              fill="none"
              stroke="white"
              strokeWidth={outer + 4}
              transform={`rotate(-90 ${c} ${c})`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          {members.map((m, i) => {
            const r = outer - ringW / 2 - i * (ringW + gap)
            const l = logs[m.id]!
            return (
              <g key={m.id}>
                {Array.from({ length: SEASON_DAYS }, (_, d) => (
                  <path key={d} d={arc(r, d * step + 0.006, (d + 1) * step - 0.006)} stroke={dayFill(season, m, l, d)} strokeWidth={ringW} fill="none" />
                ))}
              </g>
            )
          })}
        </g>
        {/* Today hand */}
        <line
          x1={c + (outer - members.length * (ringW + gap) + gap) * Math.sin(todayAngle)}
          y1={c - (outer - members.length * (ringW + gap) + gap) * Math.cos(todayAngle)}
          x2={c + (outer + 4) * Math.sin(todayAngle)}
          y2={c - (outer + 4) * Math.cos(todayAngle)}
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <text x={c} y={c - 4} textAnchor="middle" className="fill-foreground font-display text-[34px] font-semibold">
          {SEASON_DAYS - TODAY - 1}
        </text>
        <text x={c} y={c + 18} textAnchor="middle" className="fill-muted-foreground text-[12px]">
          days to go
        </text>
      </svg>
      <ul className="grid gap-3">
        {members.map((m, i) => (
          <li key={m.id}>
            <RowLink m={m} label={`${m.name}: ${pct(seasonScore(m, logs[m.id]!))}`} className="flex items-center gap-3">
              <Avatar member={m} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.isYou ? "You" : m.name}</span>
                <span className="text-xs text-muted-foreground">{["Outer ring", "Second ring", "Third ring", "Inner ring"][i]}</span>
              </span>
              <CountUp value={seasonScore(m, logs[m.id]!)} format={pct} className="font-display text-lg font-semibold" />
            </RowLink>
          </li>
        ))}
        <li className="text-xs text-muted-foreground">One segment per day, clockwise from 1 October at the top. The hand is today.</li>
      </ul>
    </div>
  )
}

// ---------- registry ----------

export type SeasonViewId = "lanes" | "grids" | "race" | "weeks" | "momentum" | "rings"

export const seasonViews: { id: SeasonViewId; name: string; blurb: string; aside: string; View: () => React.JSX.Element }[] = [
  { id: "lanes", name: "Lanes", blurb: "Every day for everyone, one tick each. What you have now.", aside: "Hit rate so far", View: LanesView },
  { id: "grids", name: "Calendar grids", blurb: "A GitHub-style grid per person. Easy to spot weekday patterns, like skipped Sundays.", aside: "Hit rate so far", View: GridsView },
  { id: "race", name: "The race", blurb: "Points as distance. Who's ahead, by how much, and how far to the finish.", aside: "Points so far", View: RaceView },
  { id: "weeks", name: "Week grid", blurb: "13 cells each, one per week, with the hit rate written in. Coarser but the easiest to read.", aside: "By week", View: WeeksView },
  { id: "momentum", name: "Momentum", blurb: "Trailing 7-day trend per person. Shows who's heating up or slipping right now.", aside: "Last 7 days", View: MomentumView },
  { id: "rings", name: "Season rings", blurb: "The quarter as a clock: one ring each, a segment per day, a hand for today.", aside: "Hit rate so far", View: RingsView },
]

export const getSeasonView = (id: SeasonViewId) => seasonViews.find((v) => v.id === id)!
