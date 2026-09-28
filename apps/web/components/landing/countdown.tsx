"use client"

import * as React from "react"

// Local midnight, so the countdown hits zero when the season starts where you are
const START = new Date(2026, 9, 1).getTime()
const END = new Date(2027, 0, 1).getTime()
const DAY = 86_400_000

function subscribe(cb: () => void) {
  const id = setInterval(cb, 1000)
  return () => clearInterval(id)
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000
const getServerNow = () => null

// Current time, ticking every second. Null during server render so nothing mismatches
export function useNow() {
  return React.useSyncExternalStore(subscribe, getNow, getServerNow)
}

export type SeasonPhase =
  | { phase: "before"; days: number; hours: number; minutes: number; seconds: number }
  | { phase: "during"; day: number; left: number }
  | { phase: "after" }

export function seasonPhase(now: number): SeasonPhase {
  if (now < START) {
    const ms = START - now
    return {
      phase: "before",
      days: Math.floor(ms / DAY),
      hours: Math.floor((ms % DAY) / 3_600_000),
      minutes: Math.floor((ms % 3_600_000) / 60_000),
      seconds: Math.floor((ms % 60_000) / 1000),
    }
  }
  if (now < END) {
    const day = Math.floor((now - START) / DAY) + 1
    return { phase: "during", day, left: 92 - day }
  }
  return { phase: "after" }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

// One line of status for the hero
export function SeasonLine({ className }: { className?: string }) {
  const now = useNow()
  if (now === null) return <p className={className}>Season one runs 1 October to 31 December 2026.</p>
  const p = seasonPhase(now)
  return (
    <p className={className} aria-live="off">
      {p.phase === "before" &&
        `Season one starts Thursday 1 October, in ${plural(p.days, "day")} and ${plural(p.hours, "hour")}.`}
      {p.phase === "during" && `Season one is on: day ${p.day} of 92, ${plural(p.left, "day")} to go.`}
      {p.phase === "after" && "Season one is done. The next one starts soon."}
    </p>
  )
}

// Big ticking digits for the closing section
export function CountdownDigits() {
  const now = useNow()
  const p = now === null ? null : seasonPhase(now)
  const cells =
    p?.phase === "before"
      ? [
          { v: p.days, l: p.days === 1 ? "day" : "days" },
          { v: p.hours, l: p.hours === 1 ? "hour" : "hours" },
          { v: p.minutes, l: "min" },
          { v: p.seconds, l: "sec" },
        ]
      : p?.phase === "during"
        ? [
            { v: p.day, l: "day" },
            { v: p.left, l: "to go" },
          ]
        : null

  if (p?.phase === "after") return null
  return (
    <div className="flex gap-2 sm:gap-3" role="timer" aria-label="Time until the season starts">
      {(cells ?? [{ v: null, l: "days" }, { v: null, l: "hours" }, { v: null, l: "min" }, { v: null, l: "sec" }]).map((c) => (
        <div key={c.l} className="grid min-w-[4.25rem] justify-items-center rounded-2xl bg-card px-3 pt-3 pb-2.5 sm:min-w-24 sm:px-4">
          <span className="font-display text-5xl leading-none font-bold tabular-nums sm:text-7xl">
            {c.v === null ? "--" : String(c.v).padStart(2, "0")}
          </span>
          <span className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">{c.l}</span>
        </div>
      ))}
    </div>
  )
}
