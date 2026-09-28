"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { RiArrowLeftLine, RiCheckLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, CountUp, hueVar, pct } from "@/components/bits"
import {
  ConsistencyCalendar,
  TargetBars,
  WeeklyWorkouts,
  WeightChart,
} from "@/components/charts"
import { useSquad, useSeason } from "@/components/squad-store"
import { getModule } from "@/lib/modules"
import {
  dailyGoals,
  formatNumber,
  isHit,
  latestAverage,
  weightGoal,
  workoutGoal,
} from "@/lib/season"

export function Profile({ id }: { id: string }) {
  const {
    TODAY,
    weekOf,
    workoutsInWeek,
    seasonScore,
    streak,
    started,
    shortDate,
    longDate,
  } = useSeason()
  const { logs, openCheckIn, getMember } = useSquad()
  const member = getMember(id)
  if (!member) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-10 text-center sm:px-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Not in your squad
        </h1>
        <p className="mt-2 text-muted-foreground">
          This person isn&apos;t part of your pact, or hasn&apos;t finished
          setting up yet.
        </p>
        <Link
          href="/home"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 font-semibold text-primary-foreground"
        >
          Back to home
        </Link>
      </div>
    )
  }
  const memberLogs = logs[id] ?? []
  const today = memberLogs[TODAY]
  const wGoal = workoutGoal(member)
  const weight = weightGoal(member)
  const kg = weight?.unit !== "%"
  const avg = latestAverage(memberLogs)
  const change =
    avg !== undefined && member.startWeight !== undefined
      ? avg - member.startWeight
      : 0
  const toGo =
    avg !== undefined && member.goalWeight !== undefined
      ? avg - member.goalWeight
      : undefined
  const numberGoals = member.goals.filter(
    (g) => g.kind === "number" && g.target !== undefined && g.id !== "weight"
  )
  const week = weekOf(TODAY)
  const modules = [
    ...new Set(
      member.goals
        .map((g) => getModule(g.module)?.name.toLowerCase())
        .filter(Boolean)
    ),
  ]
  const unit = kg ? " kg" : "%"

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 lg:px-10 lg:pt-10">
      <Link
        href="/home"
        className="mb-4 inline-flex h-10 items-center gap-2 rounded-full pe-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
      >
        <RiArrowLeftLine className="size-5" /> Squad
      </Link>

      {/* Identity band: the member's colour runs along the top of their page */}
      <header className="relative overflow-hidden rounded-3xl bg-card p-5 sm:p-7">
        <motion.div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ background: hueVar(member.hue), transformOrigin: "left" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="flex items-center gap-4">
          <Avatar member={member} size={64} />
          <div className="min-w-0">
            <h1 className="font-display text-4xl leading-none font-semibold tracking-tight">
              {member.isYou ? "You" : member.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {weight &&
              kg &&
              member.startWeight !== undefined &&
              member.goalWeight !== undefined
                ? `${member.startWeight} kg on ${shortDate(0)}, aiming for ${member.goalWeight} kg`
                : modules.length
                  ? `Tracking ${listOf(modules as string[])}`
                  : "No goals yet"}
            </p>
          </div>
          {member.isYou && (
            <div className="ms-auto hidden gap-2 sm:flex">
              <Link
                href="/onboarding?edit=1"
                className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                Edit goals
              </Link>
              {started && (
                <button
                  onClick={() => openCheckIn()}
                  className="h-10 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {today ? "Edit today" : "Check in"}
                </button>
              )}
            </div>
          )}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Stat label="Season hit rate">
            <CountUp value={seasonScore(member, memberLogs)} format={pct} />
          </Stat>
          <Stat label="Check-in streak" sub="days in a row">
            <CountUp value={streak(memberLogs)} />
          </Stat>
          {weight && (
            <Stat
              label={`Weight since ${shortDate(0)}`}
              sub={
                toGo === undefined
                  ? undefined
                  : (weight.compare === "min" ? toGo < 0 : toGo > 0)
                    ? `${Math.abs(toGo).toFixed(1)}${unit} to goal`
                    : "Goal reached"
              }
            >
              <CountUp
                value={kg ? change : (avg ?? 0)}
                format={(n) =>
                  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}${unit}`
                }
              />
            </Stat>
          )}
          {wGoal && (
            <Stat label="Workouts this week">
              <CountUp value={workoutsInWeek(memberLogs, week)} />
              <span className="text-muted-foreground"> / {wGoal.weekly}</span>
            </Stat>
          )}
        </dl>
      </header>

      {!started ? (
        <Card
          title={member.isYou ? "Your plan" : `${member.name}'s plan`}
          sub={`Starts ${longDate(0)}`}
          className="mt-6"
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {member.goals.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3"
              >
                <span className="font-medium">{g.label}</span>
                <span className="text-sm text-muted-foreground">
                  {planValue(g)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Today" className="lg:col-span-2">
            {today ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {wGoal && (
                  <GoalLine
                    done={!!today.checks.workout}
                    label="Workout"
                    value={
                      today.workoutName ??
                      (today.checks.workout ? "Done" : "Rest day")
                    }
                    hue={member.hue}
                  />
                )}
                {dailyGoals(member).map((g) => (
                  <GoalLine
                    key={g.id}
                    done={isHit(g, today)}
                    label={g.label}
                    value={
                      g.kind === "number"
                        ? today.numbers[g.id] !== undefined
                          ? formatNumber(today.numbers[g.id]!, g.unit)
                          : "Not logged"
                        : isHit(g, today)
                          ? "Done"
                          : "Missed"
                    }
                    hue={member.hue}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                {member.isYou ? "You haven't" : `${member.name} hasn't`} checked
                in yet today.
              </p>
            )}
          </Card>

          {weight && (
            <Card
              title="Weight"
              sub={
                kg
                  ? "Faint dots are daily weigh-ins; the line is the 7-day average"
                  : "Shared as change since the start, 7-day average"
              }
              className="lg:col-span-2"
            >
              <WeightChart member={member} logs={memberLogs} />
            </Card>
          )}

          <Card
            title="Consistency"
            sub="How much of each day's goals got done"
            className="lg:col-span-2"
          >
            <ConsistencyCalendar member={member} logs={memberLogs} />
          </Card>

          {numberGoals.map((g) => (
            <Card
              key={g.id}
              title={g.label}
              sub={`Last 14 days, ${g.compare === "max" ? "limit" : "goal"} ${formatNumber(g.target!, g.unit)}`}
            >
              <TargetBars member={member} goal={g} logs={memberLogs} />
            </Card>
          ))}

          {wGoal && (
            <Card
              title="Workouts per week"
              className={cn(numberGoals.length % 2 === 0 && "lg:col-span-2")}
            >
              <WeeklyWorkouts member={member} logs={memberLogs} />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function listOf(items: string[]) {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`
}

function planValue(g: import("@/lib/season").Goal) {
  if (g.weekly) return `${g.weekly} a week`
  if (g.kind === "check") return "Every day"
  if (g.target === undefined)
    return g.id === "weight" ? "Tracked" : "Tracked daily"
  return `${g.compare === "max" ? "At most" : "At least"} ${formatNumber(g.target, g.unit)}`
}

function Stat({
  label,
  sub,
  children,
}: {
  label: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-display text-3xl font-semibold">{children}</dd>
      {sub && <dd className="text-sm text-muted-foreground">{sub}</dd>}
    </div>
  )
}

function Card({
  title,
  sub,
  className,
  children,
}: {
  title: string
  sub?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn("min-w-0 rounded-3xl bg-card p-5 sm:p-6", className)}
    >
      <h2 className="font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function GoalLine({
  done,
  label,
  value,
  hue,
}: {
  done: boolean
  label: string
  value: string
  hue: Parameters<typeof hueVar>[0]
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
      <span
        className="grid size-6 shrink-0 place-items-center rounded-full text-white"
        style={
          done
            ? { background: hueVar(hue) }
            : { boxShadow: "inset 0 0 0 1.5px var(--axis)" }
        }
      >
        {done && <RiCheckLine className="size-4" />}
      </span>
      <span className="font-medium">{label}</span>
      <span className="ms-auto text-sm text-muted-foreground">{value}</span>
    </li>
  )
}
