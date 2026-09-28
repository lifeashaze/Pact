"use client"

import { AnimatePresence, motion } from "motion/react"
import { RiNotification3Line } from "@remixicon/react"

import { Avatar } from "@/components/bits"
import { FeedItemView, useDayName } from "@/components/feed-item"
import { useSquad, useSeason } from "@/components/squad-store"

export default function FeedPage() {
  const { TODAY, started, longDate } = useSeason()
  const dayName = useDayName()
  const { feed, logs, nudged, nudge, members } = useSquad()
  const waiting = started ? members.filter((m) => !m.isYou && !logs[m.id]?.[TODAY]) : []
  const days = [...new Set(feed.map((i) => i.day))]

  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 pt-6 sm:px-6 lg:pt-10">
      <header className="px-1">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">Feed</h1>
        <p className="mt-2 text-muted-foreground">Workouts, clean days and milestones from the squad.</p>
      </header>

      {waiting.length > 0 && (
        <section aria-label="Not checked in today" className="rounded-3xl bg-card p-4 sm:p-5">
          {waiting.map((m) => {
            const done = nudged.includes(m.id)
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar member={m} size={40} />
                <p className="min-w-0 flex-1">
                  <span className="font-semibold">{m.name}</span>{" "}
                  <span className="text-muted-foreground">hasn&apos;t checked in today</span>
                </p>
                <motion.button
                  onClick={() => nudge(m.id)}
                  disabled={done}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <motion.span animate={done ? { rotate: [0, -18, 14, -8, 0] } : {}} transition={{ duration: 0.5 }}>
                    <RiNotification3Line className="size-4" />
                  </motion.span>
                  {done ? "Nudged" : `Nudge ${m.name}`}
                </motion.button>
              </div>
            )
          })}
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
        <section key={day} aria-label={dayName(day)} className="grid gap-3">
          <h2 className="px-1 font-display text-xl font-semibold text-muted-foreground">{dayName(day)}</h2>
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
  )
}
