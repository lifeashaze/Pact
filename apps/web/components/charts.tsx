"use client"

import * as React from "react"
import { motion, useInView } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"
import { hueTint, hueVar } from "@/components/bits"
import { type DayLog, type Goal, type Member, dayResult, formatNumber, isHit, weightSeries, workoutGoal } from "@/lib/season"
import { useSeason } from "@/components/squad-store"

type Logs = (DayLog | undefined)[]

// ---------- shared plumbing ----------

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null)
  const [width, setWidth] = React.useState(0)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function linear(d0: number, d1: number, r0: number, r1: number) {
  return (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0)
}

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min
  const raw = span / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  const w = 176
  const left = Math.min(Math.max(x - w / 2, 0), Math.max(0, width - w))
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-xl border border-border bg-popover px-3 py-2 text-sm shadow-lg"
      style={{ left, top: Math.max(0, y - 12), width: w, transform: "translateY(-100%)" }}
    >
      {children}
    </div>
  )
}

// Every chart has a table twin, so no value is only reachable by hovering
export function NumbersTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="w-fit cursor-pointer rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        Show the numbers
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-border">
        <table className="w-full text-start tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-card text-muted-foreground">
            <tr>
              {head.map((h) => (
                <th key={h} className="px-3 py-2 text-start font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// ---------- weight trend ----------

export function WeightChart({ member, logs }: { member: Member; logs: Logs }) {
  const { SEASON_DAYS, TODAY, shortDate, weekdayDate } = useSeason()
  const [ref, width] = useWidth<HTMLDivElement>()
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [hover, setHover] = React.useState<number | null>(null)
  const series = weightSeries(logs)
  const height = 220
  const m = { top: 16, right: 64, bottom: 28, left: 36 }

  const monthTicks = [0, 31, 61, SEASON_DAYS - 1]
  const goal = member.goalWeight
  // Members sharing change only arrive as percent of their start weight
  const unit = member.goals.find((g) => g.id === "weight")?.unit ?? "kg"
  const u = unit === "%" ? "%" : ` ${unit}`
  const values = series.flatMap((p) => [p.weight, p.avg]).filter((v): v is number => v !== undefined)
  const lo = Math.floor(Math.min(...values, goal ?? Infinity) - 0.5)
  const hi = Math.ceil(Math.max(...values) + 0.5)
  const x = linear(0, SEASON_DAYS - 1, m.left, Math.max(m.left + 1, width - m.right))
  const y = linear(lo, hi, height - m.bottom, m.top)
  const ticks = niceTicks(lo, hi, 4)

  const avgPts = series.filter((p) => p.avg !== undefined)
  const path = avgPts.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(p.avg!).toFixed(1)}`).join("")
  const last = avgPts[avgPts.length - 1]
  const hovered = hover !== null ? series[hover] : undefined

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const day = Math.round(((e.clientX - box.left - m.left) / (x(SEASON_DAYS - 1) - m.left)) * (SEASON_DAYS - 1))
    setHover(Math.min(Math.max(day, 0), TODAY))
  }

  if (values.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No weigh-ins yet.</p>
  }

  return (
    <figure>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            className="overflow-visible"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`${member.name}'s weight, 7-day average, from ${member.startWeight}${u} on ${shortDate(0)} to ${last?.avg?.toFixed(1)}${u} today.${goal !== undefined ? ` Goal ${goal}${u}.` : ""}`}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-axis-label text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}
            {monthTicks.map((d) => (
              <text key={d} x={x(d)} y={height - 8} textAnchor={d === SEASON_DAYS - 1 ? "end" : "start"} className="fill-axis-label text-[11px]">
                {shortDate(d)}
              </text>
            ))}
            {/* Goal */}
            {goal !== undefined && (
              <>
                <line x1={m.left} x2={width - m.right} y1={y(goal)} y2={y(goal)} stroke="var(--axis)" />
                <text x={width - m.right + 8} y={y(goal)} dy="0.32em" className="fill-muted-foreground text-[11px]">
                  Goal {goal}
                </text>
              </>
            )}
            {/* Today */}
            <line x1={x(TODAY)} x2={x(TODAY)} y1={m.top} y2={height - m.bottom} stroke="var(--axis)" />
            {/* Daily weigh-ins, faint */}
            {series.map((p) =>
              p.weight === undefined ? null : (
                <circle key={p.day} cx={x(p.day)} cy={y(p.weight)} r={3} fill={hueVar(member.hue)} fillOpacity={0.28} />
              )
            )}
            <motion.path
              d={path}
              fill="none"
              stroke={hueVar(member.hue)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: inView ? 1 : 0 }}
              transition={{ duration: 1.1, ease: [0.33, 1, 0.68, 1] }}
            />
            {last && (
              <>
                <motion.circle
                  cx={x(last.day)}
                  cy={y(last.avg!)}
                  r={5}
                  fill={hueVar(member.hue)}
                  stroke="var(--card)"
                  strokeWidth={2}
                  initial={{ scale: 0 }}
                  animate={{ scale: inView ? 1 : 0 }}
                  transition={{ delay: 1 }}
                />
                <text x={x(last.day) + 10} y={y(last.avg!) - 10} className="fill-foreground text-[12px] font-semibold tabular-nums">
                  {last.avg!.toFixed(1)}{u}
                </text>
              </>
            )}
            {hovered && (
              <g pointerEvents="none">
                <line x1={x(hovered.day)} x2={x(hovered.day)} y1={m.top} y2={height - m.bottom} stroke="var(--foreground)" strokeOpacity={0.35} />
                {hovered.avg !== undefined && (
                  <circle cx={x(hovered.day)} cy={y(hovered.avg)} r={4.5} fill={hueVar(member.hue)} stroke="var(--card)" strokeWidth={2} />
                )}
              </g>
            )}
          </svg>
        )}
        {hovered && (
          <Tooltip x={x(hovered.day)} y={m.top} width={width}>
            <div className="font-medium">{weekdayDate(hovered.day)}</div>
            <div className="text-muted-foreground">
              Weigh-in {hovered.weight !== undefined ? `${hovered.weight}${u}` : "skipped"}
            </div>
            <div className="text-muted-foreground">7-day average {hovered.avg?.toFixed(1)}{u}</div>
          </Tooltip>
        )}
      </div>
      <NumbersTable
        caption={`${member.name}'s daily weight`}
        head={["Date", "Weigh-in", "7-day average"]}
        rows={series
          .slice(0, TODAY + 1)
          .reverse()
          .map((p) => [weekdayDate(p.day), p.weight !== undefined ? `${p.weight}${u}` : "–", p.avg !== undefined ? `${p.avg.toFixed(1)}${u}` : "–"])}
      />
    </figure>
  )
}

// ---------- consistency calendar ----------

const months = [
  { name: "October", start: 0, days: 31 },
  { name: "November", start: 31, days: 30 },
  { name: "December", start: 61, days: 31 },
]

// One hue, light to dark: how much of the day's goals were hit
function levelFill(member: Member, score: number) {
  if (score >= 1) return hueVar(member.hue)
  if (score >= 0.75) return hueTint(member.hue, 70)
  if (score >= 0.5) return hueTint(member.hue, 45)
  return hueTint(member.hue, 22)
}

export function ConsistencyCalendar({ member, logs }: { member: Member; logs: Logs }) {
  const { TODAY, dateOf, weekdayDate } = useSeason()
  const [hover, setHover] = React.useState<{ day: number; x: number; y: number; w: number } | null>(null)
  const wrap = React.useRef<HTMLDivElement>(null)

  return (
    <figure>
      <div ref={wrap} className="relative grid grid-cols-3 gap-3 sm:gap-6" onPointerLeave={() => setHover(null)}>
        {months.map((month) => {
          // Monday-first offset for the 1st of the month
          const offset = (dateOf(month.start).getUTCDay() + 6) % 7
          return (
            <div key={month.name}>
              <div className="mb-2 text-sm font-medium">{month.name}</div>
              <div className="grid grid-cols-7 gap-[3px] sm:gap-1" role="grid" aria-label={`${member.name}, ${month.name}`}>
                {Array.from({ length: offset }, (_, i) => (
                  <span key={`pad-${i}`} />
                ))}
                {Array.from({ length: month.days }, (_, i) => {
                  const day = month.start + i
                  const log = logs[day]
                  const future = day > TODAY
                  const r = dayResult(member, log)
                  const score = log ? r.hit / r.total : 0
                  const isToday = day === TODAY
                  return (
                    <span
                      key={day}
                      role="gridcell"
                      aria-label={`${weekdayDate(day)}: ${future ? "upcoming" : log ? `${r.hit} of ${r.total} goals` : "no check-in"}`}
                      className={cn(
                        "aspect-square rounded-[3px] sm:rounded-[5px]",
                        future && "border border-dashed border-border",
                        !future && !log && "bg-muted",
                        isToday && "ring-2 ring-foreground ring-offset-1 ring-offset-card"
                      )}
                      style={!future && log ? { background: levelFill(member, score) } : undefined}
                      onPointerEnter={(e) => {
                        if (future || !wrap.current) return
                        const box = wrap.current.getBoundingClientRect()
                        const cell = e.currentTarget.getBoundingClientRect()
                        setHover({ day, x: cell.left - box.left + cell.width / 2, y: cell.top - box.top, w: box.width })
                      }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
        {hover && (
          <Tooltip x={hover.x} y={hover.y} width={hover.w}>
            <CalendarTip member={member} day={hover.day} log={logs[hover.day]} />
          </Tooltip>
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Less
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <span key={s} className="size-3.5 rounded-[4px]" style={{ background: levelFill(member, s) }} />
          ))}
          More
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[4px] bg-muted" /> No check-in
        </span>
      </figcaption>
    </figure>
  )
}

function CalendarTip({ member, day, log }: { member: Member; day: number; log: DayLog | undefined }) {
  const { weekdayDate } = useSeason()
  const r = dayResult(member, log)
  return (
    <>
      <div className="font-medium">{weekdayDate(day)}</div>
      {log ? (
        <>
          <div className="text-muted-foreground">
            {r.hit} of {r.total} daily goals
          </div>
          <div className="text-muted-foreground">{log.workoutName ?? "Rest day"}</div>
        </>
      ) : (
        <div className="text-muted-foreground">No check-in</div>
      )}
    </>
  )
}

// ---------- a number goal against its target, last 14 days ----------

export function TargetBars({ member, goal, logs }: { member: Member; goal: Goal; logs: Logs }) {
  const { TODAY, dateOf, weekdayDate } = useSeason()
  const [ref, width] = useWidth<HTMLDivElement>()
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [hover, setHover] = React.useState<number | null>(null)
  const days = Array.from({ length: 14 }, (_, i) => TODAY - 13 + i)
  const height = 200
  const m = { top: 20, right: 52, bottom: 26, left: 44 }
  const vals = days.map((d) => logs[d]?.numbers[goal.id])
  const max = Math.max(goal.target!, ...vals.filter((v): v is number => v !== undefined)) * 1.12
  const y = linear(0, max, height - m.bottom, m.top)
  const band = (width - m.left - m.right) / days.length
  const barW = Math.min(24, band * 0.62)
  const ticks = niceTicks(0, max, 3)
  const lastLogged = [...days].reverse().find((d) => logs[d]?.numbers[goal.id] !== undefined)
  const hitDays = days.filter((d) => isHit(goal, logs[d])).length

  return (
    <figure>
      <div ref={ref} className="relative" style={{ height }} onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} className="overflow-visible" role="img" aria-label={`${member.name}'s ${goal.label.toLowerCase()}, last 14 days. Goal hit on ${hitDays} of 14 days.`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-axis-label text-[11px] tabular-nums">
                  {goal.unit === "kcal" || goal.unit === "steps" ? `${t / 1000}k` : t}
                </text>
              </g>
            ))}
            {days.map((d, i) => {
              const v = vals[i]
              const cx = m.left + band * i + band / 2
              const top = v !== undefined ? y(v) : height - m.bottom
              const h = height - m.bottom - top
              return (
                <g key={d} onPointerEnter={() => setHover(i)}>
                  {/* Hit area wider than the bar */}
                  <rect x={cx - band / 2} y={m.top} width={band} height={height - m.top - m.bottom} fill="transparent" />
                  {v !== undefined && (
                    <motion.path
                      d={`M${cx - barW / 2},${height - m.bottom} V${top + 4} q0,-4 4,-4 H${cx + barW / 2 - 4} q4,0 4,4 V${height - m.bottom} Z`}
                      fill={hueVar(member.hue)}
                      fillOpacity={hover === null || hover === i ? 1 : 0.55}
                      style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: inView ? 1 : 0 }}
                      transition={{ delay: i * 0.03, type: "spring", stiffness: 260, damping: 26 }}
                    />
                  )}
                  {v === undefined && (
                    <text x={cx} y={height - m.bottom - 6} textAnchor="middle" className="fill-axis-label text-[11px]">
                      –
                    </text>
                  )}
                  {d === lastLogged && v !== undefined && h > 0 && Math.abs(top - 6 - y(goal.target!)) > 12 && (
                    <text x={cx} y={top - 6} textAnchor="middle" className="fill-foreground text-[11px] font-semibold tabular-nums">
                      {formatNumber(v)}
                    </text>
                  )}
                  {(i % 2 === 1 || d === TODAY) && (
                    <text x={cx} y={height - 8} textAnchor="middle" className="fill-axis-label text-[11px]">
                      {d === TODAY ? "Today" : dateOf(d).getUTCDate()}
                    </text>
                  )}
                </g>
              )
            })}
            <line x1={m.left} x2={width - m.right} y1={height - m.bottom} y2={height - m.bottom} stroke="var(--axis)" />
            {/* Target, drawn over the bars */}
            <line x1={m.left} x2={width - m.right} y1={y(goal.target!)} y2={y(goal.target!)} stroke="var(--foreground)" strokeOpacity={0.7} />
            <text x={width - m.right + 6} y={y(goal.target!)} dy="0.32em" className="fill-foreground text-[11px] font-medium">
              {goal.compare === "max" ? "Limit" : "Goal"}
            </text>
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={m.left + band * hover + band / 2} y={vals[hover] !== undefined ? y(vals[hover]!) : height - m.bottom} width={width}>
            <div className="font-medium">{weekdayDate(days[hover]!)}</div>
            <div className="text-muted-foreground">
              {vals[hover] !== undefined ? formatNumber(vals[hover]!, goal.unit) : "Not logged"}
              {vals[hover] !== undefined && (isHit(goal, logs[days[hover]!]) ? ", goal hit" : ", missed")}
            </div>
          </Tooltip>
        )}
      </div>
      <NumbersTable
        caption={`${member.name}'s ${goal.label.toLowerCase()}, last 14 days`}
        head={["Date", goal.label, "Goal"]}
        rows={days
          .slice()
          .reverse()
          .map((d) => [weekdayDate(d), logs[d]?.numbers[goal.id] !== undefined ? formatNumber(logs[d]!.numbers[goal.id]!, goal.unit) : "–", isHit(goal, logs[d]) ? "Hit" : "Missed"])}
      />
    </figure>
  )
}

// ---------- workouts per week ----------

export function WeeklyWorkouts({ member, logs }: { member: Member; logs: Logs }) {
  const { TODAY, WEEKS, shortDate, weekDays, weekOf, workoutsInWeek } = useSeason()
  const [ref, width] = useWidth<HTMLDivElement>()
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [hover, setHover] = React.useState<number | null>(null)
  const target = workoutGoal(member)?.weekly ?? 0
  const weeks = Array.from({ length: WEEKS - 1 }, (_, i) => i) // week 14 is a single day
  const current = weekOf(TODAY)
  const height = 180
  const m = { top: 20, right: 12, bottom: 26, left: 28 }
  const max = 7
  const y = linear(0, max, height - m.bottom, m.top)
  const band = (width - m.left - m.right) / weeks.length
  const barW = Math.min(24, band * 0.6)

  return (
    <figure>
      <div ref={ref} className="relative" style={{ height }} onPointerLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={height} className="overflow-visible" role="img" aria-label={`${member.name}'s workouts per week against a target of ${target}.`}>
            {[0, 2, 4, 6].map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-axis-label text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            ))}
            {weeks.map((w) => {
              const n = w <= current ? workoutsInWeek(logs, w) : 0
              const cx = m.left + band * w + band / 2
              const top = y(n)
              const future = w > current
              return (
                <g key={w} onPointerEnter={() => !future && setHover(w)}>
                  <rect x={cx - band / 2} y={m.top} width={band} height={height - m.top - m.bottom} fill="transparent" />
                  {!future && n > 0 && (
                    <motion.path
                      d={`M${cx - barW / 2},${height - m.bottom} V${top + 4} q0,-4 4,-4 H${cx + barW / 2 - 4} q4,0 4,4 V${height - m.bottom} Z`}
                      fill={w === current ? hueTint(member.hue, 45) : hueVar(member.hue)}
                      style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: inView ? 1 : 0 }}
                      transition={{ delay: w * 0.04, type: "spring", stiffness: 260, damping: 26 }}
                    />
                  )}
                  {w === current && (
                    <text x={cx} y={top - 6} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                      {n}
                    </text>
                  )}
                  <text x={cx} y={height - 8} textAnchor="middle" className={cn("text-[11px]", w === current ? "fill-foreground font-semibold" : "fill-axis-label")}>
                    {w + 1}
                  </text>
                </g>
              )
            })}
            <line x1={m.left} x2={width - m.right} y1={height - m.bottom} y2={height - m.bottom} stroke="var(--axis)" />
            <line x1={m.left} x2={width - m.right} y1={y(target)} y2={y(target)} stroke="var(--foreground)" strokeOpacity={0.7} />
            <text x={width - m.right} y={y(target) - 6} textAnchor="end" className="fill-foreground text-[11px] font-medium">
              Target {target} a week
            </text>
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={m.left + band * hover + band / 2} y={y(workoutsInWeek(logs, hover))} width={width}>
            <div className="font-medium">Week {hover + 1}</div>
            <div className="text-muted-foreground">
              {shortDate(weekDays(hover).start)} – {shortDate(weekDays(hover).end)}
            </div>
            <div className="text-muted-foreground">
              {workoutsInWeek(logs, hover)} of {target} workouts{hover === current ? " so far" : ""}
            </div>
          </Tooltip>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Weeks 1 to 13. The lighter bar is this week so far.</p>
      <NumbersTable
        caption={`${member.name}'s workouts per week`}
        head={["Week", "Dates", "Workouts"]}
        rows={weeks.filter((w) => w <= current).map((w) => [w + 1, `${shortDate(weekDays(w).start)} – ${shortDate(weekDays(w).end)}`, `${workoutsInWeek(logs, w)} of ${target}`])}
      />
    </figure>
  )
}

// ---------- the whole squad on one axis ----------

export type SquadSeries = { member: Member; values: (number | undefined)[] }

export function SquadLines({
  series,
  xLabel,
  xTicks,
  format,
  axisFormat = format,
  label,
  height = 240,
}: {
  series: SquadSeries[]
  xLabel: (i: number) => string
  xTicks: number[]
  format: (v: number) => string
  axisFormat?: (v: number) => string
  label: string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [hover, setHover] = React.useState<number | null>(null)
  const n = Math.max(...series.map((s) => s.values.length))
  const m = { top: 16, right: 86, bottom: 28, left: 40 }
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== undefined)
  const pad = (Math.max(...all) - Math.min(...all)) * 0.12 || 1
  const lo = Math.min(...all) - pad
  const hi = Math.max(...all) + pad
  const x = linear(0, n - 1, m.left, Math.max(m.left + 1, width - m.right))
  const y = linear(lo, hi, height - m.bottom, m.top)
  const ticks = niceTicks(lo, hi, 4).filter((t) => t >= lo && t <= hi)

  // End labels: keep them in line order, pushed apart with leader lines when they'd collide
  const ends = series
    .map((s) => {
      let i = s.values.length - 1
      while (i > 0 && s.values[i] === undefined) i--
      return { s, i, v: s.values[i]!, y: y(s.values[i]!) }
    })
    .sort((a, b) => a.y - b.y)
  const labelY = ends.map((e) => e.y)
  for (let k = 1; k < labelY.length; k++) labelY[k] = Math.max(labelY[k]!, labelY[k - 1]! + 16)

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - box.left - m.left) / (x(n - 1) - m.left)) * (n - 1))
    setHover(Math.min(Math.max(i, 0), n - 1))
  }

  return (
    <figure>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Legend">
        {series.map((s) => (
          <li key={s.member.id} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ background: hueVar(s.member.hue) }} />
            {s.member.name}
          </li>
        ))}
      </ul>
      <div ref={ref} className="relative" style={{ height }}>
        {width > 0 && (
          <svg width={width} height={height} className="overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={label}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-axis-label text-[11px] tabular-nums">
                  {axisFormat(t)}
                </text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-axis-label text-[11px]">
                {xLabel(i)}
              </text>
            ))}
            {series.map((s, si) => {
              const d = s.values
                .map((v, i) => (v === undefined ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
                .filter(Boolean)
                .map((p, i) => `${i ? "L" : "M"}${p}`)
                .join("")
              return (
                <motion.path
                  key={s.member.id}
                  d={d}
                  fill="none"
                  stroke={hueVar(s.member.hue)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: inView ? 1 : 0 }}
                  transition={{ duration: 1, delay: si * 0.12, ease: [0.33, 1, 0.68, 1] }}
                />
              )
            })}
            {ends.map((e, k) => (
              <g key={e.s.member.id}>
                <circle cx={x(e.i)} cy={e.y} r={4.5} fill={hueVar(e.s.member.hue)} stroke="var(--card)" strokeWidth={2} />
                {Math.abs(labelY[k]! - e.y) > 2 && (
                  <line x1={x(e.i) + 6} y1={e.y} x2={x(e.i) + 14} y2={labelY[k]} stroke="var(--axis)" />
                )}
                <text x={x(e.i) + 16} y={labelY[k]} dy="0.32em" className="fill-foreground text-[12px] font-medium">
                  {e.s.member.name}
                </text>
              </g>
            ))}
            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={height - m.bottom} stroke="var(--foreground)" strokeOpacity={0.35} />
                {series.map((s) =>
                  s.values[hover] === undefined ? null : (
                    <circle key={s.member.id} cx={x(hover)} cy={y(s.values[hover]!)} r={4.5} fill={hueVar(s.member.hue)} stroke="var(--card)" strokeWidth={2} />
                  )
                )}
              </g>
            )}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tooltip x={x(hover)} y={m.top} width={width}>
            <div className="mb-1 font-medium">{xLabel(hover)}</div>
            {[...series]
              .filter((s) => s.values[hover] !== undefined)
              .sort((a, b) => b.values[hover]! - a.values[hover]!)
              .map((s) => (
                <div key={s.member.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: hueVar(s.member.hue) }} />
                    {s.member.name}
                  </span>
                  <span className="tabular-nums">{format(s.values[hover]!)}</span>
                </div>
              ))}
          </Tooltip>
        )}
      </div>
      <NumbersTable
        caption={label}
        head={["", ...series.map((s) => s.member.name)]}
        rows={Array.from({ length: n }, (_, i) => [xLabel(i), ...series.map((s) => (s.values[i] !== undefined ? format(s.values[i]!) : "–"))]).reverse()}
      />
    </figure>
  )
}
