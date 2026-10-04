"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "motion/react"
import { RiCheckLine, RiNotification3Line } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, CountUp, hueVar, pct } from "@/components/bits"
import { CardHeader, HomeCard } from "@/components/home/card"
import { checkedInCount, memberWeekScore, seasonPhase, weeklyWorkoutTarget } from "@/components/home/derive"
import { levelColor } from "@/components/season-views"
import { useSquad, useSeason } from "@/components/squad-store"
import { type DayLog, type Member, dailyGoals, dayResult, dayScore, isHit } from "@/lib/season"

// Everyone's day at a glance: who's checked in, how much they got done, and their week so far.
// A wide card also shows each person's week day by day
export function SquadToday({ index }: { index?: number }) {
  const season = useSeason()
  const { TODAY } = season
  const { logs, members } = useSquad()
  const phase = seasonPhase(season)
  const inCount = checkedInCount(members, logs, TODAY)

  const description =
    phase === "before"
      ? "Everyone's goals, ready for 1 October"
      : inCount === members.length
        ? members.length === 1
          ? "You're checked in"
          : `All ${members.length} checked in`
        : `${inCount} of ${members.length} checked in`

  return (
    <HomeCard labelledBy="today-title" index={index}>
      <CardHeader
        id="today-title"
        title="Today"
        description={description} live
        meta={phase === "during" ? "This week" : undefined}
      />
      <ul className="mt-3 grid grid-cols-1">
        {members.map((m) => (
          <li key={m.id} className="border-t border-border first:border-t-0">
            <MemberRow member={m} />
          </li>
        ))}
      </ul>
    </HomeCard>
  )
}

function MemberRow({ member }: { member: Member }) {
  const season = useSeason()
  const { TODAY, weekOf, workoutsInWeek } = season
  const { logs, nudged, nudge } = useSquad()
  const memberLogs = logs[member.id] ?? []
  const log = memberLogs[TODAY]
  const phase = seasonPhase(season)
  const goals = dailyGoals(member)
  const r = dayResult(member, log)
  const week = memberWeekScore(season, member, memberLogs)
  const workouts = { done: workoutsInWeek(memberLogs, weekOf(TODAY)), target: weeklyWorkoutTarget(member) }
  const name = member.isYou ? "You" : member.name
  const canNudge = phase === "during" && !log && !member.isYou
  const wasNudged = nudged.includes(member.id)

  return (
    // The hover wash sits behind the row, so the stretched link above it still takes every click
    <div className="group relative isolate grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 before:absolute before:inset-y-0 before:-inset-x-2 before:-z-10 before:rounded-2xl before:transition-colors hover:before:bg-muted/60 @lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] @lg:gap-x-5">
      <Avatar member={member} size={40} />

      <div className="min-w-0">
        {/* The name's link stretches over the whole row; the nudge button sits above it */}
        <Link
          href={`/squad/${member.id}`}
          className="block truncate font-semibold underline-offset-4 group-hover:underline after:absolute after:inset-y-0 after:-inset-x-2 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring"
        >
          {name}
        </Link>
        <div className="flex h-6 items-center gap-2 text-sm text-muted-foreground">
          {phase === "before" ? (
            <span className="truncate">{goals.length ? `${goals.length} daily goals` : "No goals yet"}</span>
          ) : log ? (
            <>
              {goals.length > 0 && (
                <span className="flex shrink-0 gap-1" aria-hidden>
                  {goals.map((g) => (
                    <motion.span
                      key={g.id}
                      className="size-2 rounded-full"
                      initial={false}
                      animate={{
                        backgroundColor: isHit(g, log) ? hueVar(member.hue) : "rgba(0,0,0,0)",
                        boxShadow: `inset 0 0 0 1.5px ${isHit(g, log) ? hueVar(member.hue) : "var(--axis)"}`,
                      }}
                    />
                  ))}
                </span>
              )}
              <span className="truncate tabular-nums">{r.total ? `${r.hit} of ${r.total} goals` : "Checked in"}</span>
            </>
          ) : (
            <>
              <span className="truncate">Not checked in</span>
              {canNudge && <NudgeButton name={member.name} nudged={wasNudged} onNudge={() => nudge(member.id)} />}
            </>
          )}
        </div>
      </div>

      {phase !== "before" && <WeekStrip member={member} logs={memberLogs} />}

      {phase !== "before" && (
        <div className="min-w-16 text-end">
          {week === undefined ? (
            <span className="font-display text-xl leading-7 font-semibold text-muted-foreground">–</span>
          ) : (
            <CountUp value={week} format={pct} className="block font-display text-xl leading-7 font-semibold tabular-nums" />
          )}
          {workouts.target !== undefined && (
            <span className="block text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {workouts.done} of {workouts.target} workouts
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// This week so far, one square per day, shaded by how much got done
function WeekStrip({ member, logs }: { member: Member; logs: (DayLog | undefined)[] }) {
  const { TODAY, weekOf, weekDays } = useSeason()
  const { start, end } = weekDays(weekOf(TODAY))
  const days = Array.from({ length: end - start + 1 }, (_, i) => start + i)
  return (
    <span className="hidden gap-1 @lg:flex" aria-hidden>
      {days.map((d) => {
        const log = logs[d]
        return (
          <span
            key={d}
            className={cn("size-3.5 rounded-[4px]", d === TODAY && "ring-1 ring-axis ring-offset-1 ring-offset-card")}
            style={{ background: d > TODAY ? "var(--grid)" : log ? levelColor(member.hue, dayScore(member, log)) : "var(--muted)" }}
          />
        )
      })}
    </span>
  )
}

function NudgeButton({ name, nudged, onNudge }: { name: string; nudged: boolean; onNudge: () => void }) {
  return (
    <span className="relative z-10 inline-flex" aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        {nudged ? (
          <motion.span
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex h-7 items-center gap-1 text-sm font-medium text-muted-foreground"
          >
            <RiCheckLine className="size-4" aria-hidden />
            Nudged
          </motion.span>
        ) : (
          <motion.button
            key="nudge"
            type="button"
            onClick={onNudge}
            aria-label={`Nudge ${name}`}
            title={`Nudge ${name}`}
            whileTap={{ scale: 0.9 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative inline-flex h-7 items-center gap-1 rounded-full border border-border justify-center text-sm font-medium text-foreground transition-colors before:absolute before:-inset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:w-7 sm:px-2.5"
          >
            <RiNotification3Line className="size-4" aria-hidden />
            <span className="max-sm:sr-only">Nudge</span>
          </motion.button>
        )}
      </AnimatePresence>
    </span>
  )
}
