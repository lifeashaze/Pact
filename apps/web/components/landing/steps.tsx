"use client"

import * as React from "react"
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from "motion/react"
import { RiCheckLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, hueVar } from "@/components/bits"
import { demoMembers } from "@/lib/demo"

// Runs a step counter while the element is on screen
function useTicker(ref: React.RefObject<Element | null>, length: number, ms: number) {
  const inView = useInView(ref, { amount: 0.5 })
  const still = useReducedMotion()
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (!inView || still) return
    const id = setInterval(() => setI((n) => (n + 1) % length), ms)
    return () => clearInterval(id)
  }, [inView, still, length, ms])
  return still ? length - 1 : i
}

const goals = [
  "5 workouts a week",
  "Protein, 160 g",
  "10,000 steps",
  "No added sugar",
  "In bed by 12",
  "Read 20 minutes",
  "3 L of water",
  "No alcohol",
  "Under 2,200 kcal",
  "7 hours of sleep",
]
const picks = [0, 1, 3, 4]

export function GoalPicker() {
  const ref = React.useRef<HTMLDivElement>(null)
  const step = useTicker(ref, picks.length + 3, 850)
  const chosen = new Set(picks.slice(0, Math.min(step, picks.length)))

  return (
    <div ref={ref} className="rounded-3xl bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl font-semibold">Your goals</p>
        <p className="text-sm text-muted-foreground tabular-nums">{chosen.size} picked</p>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">
        {goals.map((g, i) => {
          const on = chosen.has(i)
          return (
            <motion.li
              key={g}
              animate={on ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-200",
                on ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground"
              )}
            >
              <AnimatePresence initial={false}>
                {on && (
                  <motion.span
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="-ms-1 overflow-hidden"
                  >
                    <RiCheckLine className="size-4" />
                  </motion.span>
                )}
              </AnimatePresence>
              {g}
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

const rows = [
  { label: "Workout", sub: "Push day" },
  { label: "Protein", sub: "165 of 160 g" },
  { label: "No added sugar", sub: "Held the line" },
  { label: "In bed by 12", sub: "11:40 pm" },
]

export function MiniCheckIn() {
  const ref = React.useRef<HTMLDivElement>(null)
  const step = useTicker(ref, rows.length + 3, 800)
  const done = Math.min(step, rows.length)

  return (
    <div ref={ref} className="rounded-3xl bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl font-semibold">Thursday 1 October</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {done} of {rows.length}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1" aria-hidden>
        {rows.map((_, i) => (
          <div key={i} className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-[var(--m-blue)]"
              initial={false}
              animate={{ width: i < done ? "100%" : "0%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          </div>
        ))}
      </div>
      <ul className="mt-4 grid gap-1">
        {rows.map((r, i) => {
          const on = i < done
          return (
            <li key={r.label} className="flex items-center gap-3 rounded-2xl py-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.label}</p>
                <p className="text-sm text-muted-foreground">{r.sub}</p>
              </div>
              <span
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors duration-200",
                  on ? "bg-[var(--m-blue)]" : "bg-muted"
                )}
              >
                <motion.span
                  className="absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm"
                  initial={false}
                  animate={{ x: on ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 32 }}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// A few made-up weeks. The rows re-sort as the numbers change
const frames = [
  [0.82, 0.74, 0.9, 0.61],
  [0.86, 0.79, 0.84, 0.66],
  [0.8, 0.88, 0.83, 0.7],
  [0.91, 0.85, 0.8, 0.77],
]

export function MiniStandings() {
  const ref = React.useRef<HTMLDivElement>(null)
  const step = useTicker(ref, frames.length, 2200)
  const scores = frames[step]!
  const ranked = demoMembers().map((m, i) => ({ m, s: scores[i]! })).sort((a, b) => b.s - a.s)

  return (
    <div ref={ref} className="rounded-3xl bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl font-semibold">This week</p>
        <p className="text-sm text-muted-foreground">Hit rate</p>
      </div>
      <LayoutGroup>
        <ol className="mt-3 grid">
          {ranked.map(({ m, s }, i) => (
            <motion.li key={m.id} layout className="grid grid-cols-[1.25rem_auto_minmax(0,1fr)_3rem] items-center gap-3 py-2">
              <span className="font-display text-xl font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
              <Avatar member={m} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{m.name}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: hueVar(m.hue) }}
                    initial={false}
                    animate={{ width: `${s * 100}%` }}
                    transition={{ type: "spring", stiffness: 160, damping: 26 }}
                  />
                </div>
              </div>
              <span className="text-end font-display text-xl font-semibold tabular-nums">{Math.round(s * 100)}%</span>
            </motion.li>
          ))}
        </ol>
      </LayoutGroup>
    </div>
  )
}
