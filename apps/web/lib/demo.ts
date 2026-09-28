// A made-up squad for the landing page's product previews. Never used inside the app.

import { type DayLog, type Goal, type Member, goalKey } from "@/lib/season"
import type { SquadSnapshot } from "@/lib/squad-data"

const STARTS_ON = "2026-10-01"
const DAYS = 92
const TODAY = 44

const g = (module: string, metric: string, rest: Omit<Goal, "id" | "dbId" | "module" | "visibility" | "category"> & { category?: string }): Goal => ({
  id: goalKey(module, metric),
  dbId: `${module}-${metric}`,
  module,
  category: rest.category ?? module,
  visibility: "squad",
  ...rest,
})
const workout = (weekly: number) => g("workouts", "workout", { label: "Workout", kind: "check", weekly, scored: true })
const weight = (start: number, goal: number) =>
  g("weight", "weight", { label: "Weight", kind: "number", unit: "kg", step: 0.1, startValue: start, target: goal, compare: "max", scored: false })

const people: (Omit<Member, "isYou" | "image"> & { profile: Profile })[] = [
  {
    id: "maya",
    name: "Maya",
    initials: "MA",
    hue: "blue",
    startWeight: 80.2,
    goalWeight: 75,
    goals: [
      workout(5),
      g("nutrition", "protein", { label: "Protein", kind: "number", unit: "g", target: 160, compare: "min", step: 5, scored: true }),
      weight(80.2, 75),
      g("nutrition", "no-sugar", { label: "No added sugar", kind: "check", scored: true }),
      g("sleep", "bedtime", { label: "In bed by 12", kind: "check", scored: true }),
    ],
    profile: { consistency: 0.84, improves: 0.06, loss: 0.058, skips: 0.04, workoutDays: [1, 2, 3, 4, 5, 6], names: ["Push day", "Pull day", "Leg day", "5 km run"] },
  },
  {
    id: "jonah",
    name: "Jonah",
    initials: "JO",
    hue: "orange",
    startWeight: 84.6,
    goalWeight: 78,
    goals: [
      workout(4),
      g("nutrition", "calories", { label: "Calories", kind: "number", unit: "kcal", target: 2200, compare: "max", step: 50, scored: true }),
      weight(84.6, 78),
      g("steps", "steps", { label: "Steps", kind: "number", unit: "steps", target: 10000, compare: "min", step: 500, scored: true }),
      g("habits", "custom-1", { label: "No alcohol", kind: "check", scored: true }),
    ],
    profile: { consistency: 0.9, improves: 0.02, loss: 0.062, skips: 0.02, workoutDays: [1, 2, 4, 5, 6], names: ["Chest and triceps", "Back day", "Legs", "Football"] },
  },
  {
    id: "priya",
    name: "Priya",
    initials: "PR",
    hue: "aqua",
    startWeight: 63.1,
    goalWeight: 59,
    goals: [
      workout(4),
      g("nutrition", "protein", { label: "Protein", kind: "number", unit: "g", target: 110, compare: "min", step: 5, scored: true }),
      weight(63.1, 59),
      g("water", "water", { label: "Water", kind: "number", unit: "L", target: 3, compare: "min", step: 0.25, scored: true }),
      g("reading", "pages", { label: "Reading", kind: "number", unit: "pages", target: 20, compare: "min", step: 5, scored: true }),
    ],
    profile: { consistency: 0.7, improves: 0.08, loss: 0.036, skips: 0.09, workoutDays: [1, 3, 5, 6], names: ["Pilates", "Lower body", "Spin class"] },
  },
  {
    id: "sam",
    name: "Sam",
    initials: "SA",
    hue: "violet",
    startWeight: 92.4,
    goalWeight: 85,
    goals: [
      workout(3),
      g("nutrition", "calories", { label: "Calories", kind: "number", unit: "kcal", target: 2500, compare: "max", step: 50, scored: true }),
      weight(92.4, 85),
      g("nutrition", "no-junk", { label: "No junk food", kind: "check", scored: true }),
      g("sleep", "hours", { label: "Sleep", kind: "number", unit: "h", target: 7, compare: "min", step: 0.5, scored: true }),
    ],
    profile: { consistency: 0.55, improves: 0.26, loss: 0.085, skips: 0.16, workoutDays: [2, 4, 6], names: ["Full body", "Basketball", "Incline walk"] },
  },
]

type Profile = { consistency: number; improves: number; loss: number; skips: number; workoutDays: number[]; names: string[] }

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const roundTo = (n: number, step: number) => Math.round(Math.round(n / step) * step * 100) / 100

// Deterministic history, so server and browser render the same thing
function generate(m: (typeof people)[number]): (DayLog | null)[] {
  const p = m.profile
  const rand = rng(m.id.split("").reduce((h, c) => h * 31 + c.charCodeAt(0), 7))
  const logs: (DayLog | null)[] = Array.from({ length: DAYS }, () => null)
  for (let day = 0; day <= TODAY; day++) {
    const progress = day / DAYS
    if (day > 0 && day < TODAY && rand() < p.skips * (1 - progress * p.improves * 2.5)) continue
    const odds = Math.min(0.97, p.consistency + p.improves * progress)
    const weekday = new Date(Date.parse(STARTS_ON) + day * 86_400_000).getUTCDay()
    const hour = 7 + Math.floor(rand() * 15)
    const log: DayLog = {
      checks: {},
      numbers: {},
      savedAt: new Date(Date.parse(STARTS_ON) + day * 86_400_000 + hour * 3_600_000 + Math.floor(rand() * 60) * 60_000).toISOString(),
    }
    for (const goal of m.goals) {
      if (goal.id === "workout") {
        const trains = p.workoutDays.includes(weekday) ? rand() < odds + 0.05 : rand() < 0.08
        log.checks.workout = trains
        if (trains) log.workoutName = p.names[Math.floor(rand() * p.names.length)]
      } else if (goal.id === "weight") {
        const trend = m.startWeight! - p.loss * day * (1 - progress * 0.25)
        log.numbers.weight = rand() < 0.88 ? roundTo(trend + (rand() - 0.5) * 0.9, 0.1) : undefined
      } else if (goal.kind === "check") {
        log.checks[goal.id] = rand() < odds
      } else {
        const hit = rand() < odds
        const t = goal.target!
        const spread = t * (0.04 + rand() * 0.12)
        const side = goal.compare === "min" ? 1 : -1
        log.numbers[goal.id] = roundTo(hit ? t + side * spread * rand() : t - side * spread, goal.step ?? 1)
      }
    }
    logs[day] = log
  }
  return logs
}

let cached: SquadSnapshot | null = null

export function demoSquad(): SquadSnapshot {
  if (cached) return cached
  const logs: SquadSnapshot["logs"] = {}
  for (const p of people) logs[p.id] = generate(p)
  cached = {
    squad: { id: "demo", name: "Demo squad" },
    season: { startsOn: STARTS_ON, days: DAYS, today: TODAY },
    viewerId: "maya",
    members: people.map((p) => ({ id: p.id, name: p.name, initials: p.initials, hue: p.hue, goals: p.goals, startWeight: p.startWeight, goalWeight: p.goalWeight, image: null, isYou: p.id === "maya" })),
    logs,
    reactions: [],
    comments: [],
    nudges: [],
  }
  return cached
}

export const demoMembers = () => demoSquad().members
