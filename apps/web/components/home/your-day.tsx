"use client"

import { motion } from "motion/react"
import { RiCheckLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Kbd, hueVar } from "@/components/bits"
import { CardHeader, HomeCard } from "@/components/home/card"
import { goalTarget, goalValue, seasonPhase, weeklyWorkoutTarget } from "@/components/home/derive"
import { useSquad, useSeason } from "@/components/squad-store"
import { type DayLog, type Goal, type Member, type Season, dailyGoals, dayResult, isHit } from "@/lib/season"

function summary(season: Season, member: Member, log: DayLog | undefined) {
  const r = dayResult(member, log)
  if (seasonPhase(season) === "before") return `Check-ins open ${season.longDate(0)}`
  if (!log) return "Not checked in"
  if (r.total === 0) return "Checked in"
  if (r.hit === r.total) return `All ${r.total} daily goals done`
  return `${r.hit} of ${r.total} daily goals done`
}

// Your goals for today, with what's done. Shows on mobile and desktop at different spots.
// When the card is wide the goals split into two columns, and the button stays at the bottom
export function YourDay({ id, index, className }: { id: string; index?: number; className?: string }) {
  const season = useSeason()
  const { TODAY, weekOf, workoutsInWeek } = season
  const { logs, openCheckIn, you } = useSquad()
  const memberLogs = logs[you.id] ?? []
  const log = memberLogs[TODAY]
  const phase = seasonPhase(season)
  const goals = dailyGoals(you)
  const workouts = { done: workoutsInWeek(memberLogs, weekOf(TODAY)), target: weeklyWorkoutTarget(you) }

  return (
    <HomeCard labelledBy={id} index={index} className={cn("flex flex-col", className)}>
      <CardHeader id={id} title="Your day" description={summary(season, you, log)} live />

      {goals.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 @lg:grid-cols-2 @lg:gap-x-6" aria-label="Your daily goals">
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g} member={you} log={log} detail={log ? goalValue(g, log) : goalTarget(g)} />
          ))}
        </ul>
      )}

      {workouts.target !== undefined && (
        <WorkoutWeek
          member={you}
          done={workouts.done}
          target={workouts.target}
          today={log?.checks.workout ? (log.workoutName ?? "One") : undefined}
          className={goals.length ? "mt-3" : "mt-4"}
        />
      )}

      {goals.length === 0 && workouts.target === undefined && (
        <p className="mt-4 text-sm text-muted-foreground">No goals set yet. Pick a few and they&apos;ll show up here.</p>
      )}

      {phase === "during" && (
        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={() => openCheckIn()}
            aria-keyshortcuts="c"
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-[transform,background-color] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              log ? "border border-border hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {log ? "Edit today" : "Check in for today"}
            <Kbd aria-hidden className="max-lg:hidden">
              C
            </Kbd>
          </button>
        </div>
      )}
    </HomeCard>
  )
}

function GoalRow({ goal, member, log, detail }: { goal: Goal; member: Member; log: DayLog | undefined; detail?: string }) {
  const hit = isHit(goal, log)
  const missed = !!log && !hit
  return (
    <li className="flex min-h-11 items-center gap-3 border-t border-border first:border-t-0 @lg:nth-2:border-t-0">
      <motion.span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-full"
        initial={false}
        animate={{
          backgroundColor: hit ? hueVar(member.hue) : "rgba(0,0,0,0)",
          boxShadow: `inset 0 0 0 1.5px ${hit ? hueVar(member.hue) : "var(--axis)"}`,
        }}
        transition={{ duration: 0.25 }}
      >
        {hit && <RiCheckLine className="size-3.5" style={{ color: "var(--card)" }} />}
      </motion.span>
      <span className={cn("relative min-w-0 flex-1 truncate", missed && "text-muted-foreground")}>
        {goal.label}
        <span className="sr-only">{hit ? ", done" : missed ? ", not done" : ""}</span>
      </span>
      {detail && <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{detail}</span>}
    </li>
  )
}

// Workouts count toward a weekly target, so they get their own line instead of a daily tick
function WorkoutWeek({
  member,
  done,
  target,
  today,
  className,
}: {
  member: Member
  done: number
  target: number
  today?: string
  className?: string
}) {
  return (
    <div className={cn("flex min-h-12 items-center gap-3 rounded-2xl bg-muted/60 px-3.5 py-2", className)}>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block truncate">Workouts this week</span>
        {today && <span className="block truncate text-xs text-muted-foreground">{today} today</span>}
      </span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: target }, (_, i) => (
          <motion.span
            key={i}
            className="h-3.5 w-1.5 rounded-full"
            initial={false}
            animate={{ backgroundColor: i < done ? hueVar(member.hue) : "var(--axis)" }}
            transition={{ duration: 0.25, delay: i * 0.03 }}
          />
        ))}
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {done} of {target}
      </span>
    </div>
  )
}
