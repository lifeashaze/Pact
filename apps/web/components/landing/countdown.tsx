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
  | { phase: "during" }
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
    return { phase: "during" }
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
      {p.phase === "during" && "Season one is on. It ends 31 December."}
      {p.phase === "after" && "Season one is done. The next one starts soon."}
    </p>
  )
}
