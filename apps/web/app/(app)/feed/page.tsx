"use client"

import { AnimatePresence, motion } from "motion/react"
import { RiNotification3Line } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar } from "@/components/bits"
import { FeedItemView, useDayName } from "@/components/feed-item"
import { useSquad, useSeason } from "@/components/squad-store"
import { type Member, dayResult } from "@/lib/season"

// Phones get one column with the nudges on top. From xl the feed keeps a readable
// width and a sticky side column holds the squad's day, the week so far and day jumps
export default function FeedPage() {
  const { TODAY, started, longDate } = useSeason()
  const dayName = useDayName()
  const { feed, logs, members } = useSquad()
  const waiting = started ? members.filter((m) => !m.isYou && !logs[m.id]?.[TODAY]) : []
  const days = [...new Set(feed.map((i) => i.day))]

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10 xl:grid-cols-[minmax(0,42rem)_20rem] xl:items-start xl:justify-center xl:gap-x-10">
      <div className="mx-auto grid w-full max-w-2xl min-w-0 gap-6 xl:mx-0">
        <header className="px-1">
          <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">Feed</h1>
          <p className="mt-2 text-muted-foreground">Workouts, clean days and milestones from the squad.</p>
        </header>

        {waiting.length > 0 && (
          <section aria-label="Not checked in today" className="grid gap-3 rounded-3xl bg-card p-4 sm:p-5 xl:hidden">
            {waiting.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar member={m} size={40} />
                <p className="min-w-0 flex-1">
                  <span className="font-semibold">{m.name}</span>{" "}
                  <span className="text-muted-foreground">hasn&apos;t checked in today</span>
                </p>
                <NudgeButton member={m} />
              </div>
            ))}
          </section>
        )}

        {days.length === 0 && (
          <p className="rounded-3xl bg-card px-6 py-12 text-center text-muted-foreground">
            {started
              ? "Nothing yet today. Check-ins, workouts and milestones show up here as they happen."
              : `The feed starts on ${longDate(0)}, with the first check-ins.`}
          </p>
        )}

        {days.map((day) => (
          <section key={day} id={`feed-day-${day}`} aria-label={dayName(day)} className="grid scroll-mt-4 gap-3">
            {/* On desktop the day stays pinned while its items scroll past */}
            <h2 className="px-1 font-display text-xl font-semibold text-muted-foreground lg:sticky lg:top-0 lg:z-10 lg:-mx-1 lg:bg-background/85 lg:px-2 lg:py-2 lg:backdrop-blur">
              {dayName(day)}
            </h2>
            <ul className="grid gap-3">
              <AnimatePresence initial={false}>
                {feed
                  .filter((i) => i.day === day)
                  .map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-3xl bg-card p-4 sm:p-5"
                    >
                      <FeedItemView item={item} />
                    </motion.li>
                  ))}
              </AnimatePresence>
            </ul>
          </section>
        ))}
      </div>

      {started && <FeedAside days={days} />}
    </div>
  )
}

function NudgeButton({ member, compact = false }: { member: Member; compact?: boolean }) {
  const { nudged, nudge } = useSquad()
  const done = nudged.includes(member.id)
  return (
    <motion.button
      onClick={() => nudge(member.id)}
      disabled={done}
      whileTap={{ scale: 0.92 }}
      aria-label={compact ? (done ? `Nudged ${member.name}` : `Nudge ${member.name}`) : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        compact ? "h-8 px-3" : "h-9 px-4"
      )}
    >
      <motion.span animate={done ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.5 }}>
        <RiNotification3Line className="size-4" />
      </motion.span>
      {done ? "Nudged" : compact ? "Nudge" : `Nudge ${member.name}`}
    </motion.button>
  )
}

function FeedAside({ days }: { days: number[] }) {
  const { TODAY, weekOf, weekDays, workoutsInWeek } = useSeason()
  const dayName = useDayName()
  const { feed, logs, members } = useSquad()
  const week = weekOf(TODAY)
  const { start } = weekDays(week)
  const thisWeek = feed.filter((i) => i.day >= start)
  const daysSoFar = TODAY - start + 1
  const checkIns = members.reduce((n, m) => n + Array.from({ length: daysSoFar }, (_, k) => logs[m.id]?.[start + k]).filter(Boolean).length, 0)
  const stats = [
    { label: "Check-ins", value: checkIns, of: members.length * daysSoFar },
    { label: "Workouts", value: members.reduce((n, m) => n + workoutsInWeek(logs[m.id] ?? [], week), 0) },
    { label: "Milestones", value: thisWeek.filter((i) => i.kind === "streak" || i.kind === "weight").length },
    { label: "Comments", value: thisWeek.reduce((n, i) => n + i.comments.length, 0) },
  ]

  // Capped to the viewport so the whole column stays in view; the day list scrolls inside it
  return (
    <aside aria-label="Squad summary" className="sticky top-10 flex max-h-[calc(100svh-5rem)] flex-col gap-4 max-xl:hidden">
      <section aria-labelledby="feed-today" className="shrink-0 rounded-3xl bg-card p-5">
        <h2 id="feed-today" className="font-display text-xl font-semibold tracking-tight">
          Today
        </h2>
        <ul className="mt-3 grid gap-3">
          {members.map((m) => {
            const log = logs[m.id]?.[TODAY]
            const r = dayResult(m, log)
            return (
              <li key={m.id} className="flex min-h-8 items-center gap-3">
                <Avatar member={m} size={32} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-sm font-semibold">{m.isYou ? "You" : m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {!log ? "Not checked in" : r.total ? `${r.hit} of ${r.total} goals` : "Checked in"}
                  </p>
                </div>
                {!log && !m.isYou && <NudgeButton member={m} compact />}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="feed-week" className="shrink-0 rounded-3xl bg-card p-5">
        <h2 id="feed-week" className="font-display text-xl font-semibold tracking-tight">
          Week {week + 1} so far
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="font-display text-2xl font-semibold tabular-nums">
                {s.value}
                {s.of !== undefined && <span className="text-base text-muted-foreground"> / {s.of}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {days.length > 1 && (
        <nav aria-label="Jump to a day" className="min-h-0 overflow-y-auto rounded-3xl bg-card p-3">
          <ul className="grid">
            {days.map((day) => (
              <li key={day}>
                <a
                  href={`#feed-day-${day}`}
                  className="flex h-9 items-center justify-between rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {dayName(day)}
                  <span className="tabular-nums">{feed.filter((i) => i.day === day).length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  )
}
