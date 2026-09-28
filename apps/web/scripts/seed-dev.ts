// Fills the DEV branch with a few weeks of check-ins for the @example.com test
// accounts, so mid-season screens can be checked (pair with PACT_TODAY=2026-11-14).
// Refuses to run against anything but the dev branch.
//   bun run scripts/seed-dev.ts [--until 2026-11-14] [--reset]
import fs from "node:fs"
import path from "node:path"
import { neon } from "@neondatabase/serverless"

// Always read the dev branch file, whatever the shell has set
for (const line of fs.readFileSync(path.resolve(import.meta.dirname, "../../../.env.development.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]!] = m[2]!.replace(/^['"]|['"]$/g, "")
}
const PRODUCTION_BRANCH = "br-frosty-shadow-zatlgwrd"
// eslint-disable-next-line turbo/no-undeclared-env-vars
if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === PRODUCTION_BRANCH) {
  throw new Error("seed-dev only runs against the dev branch")
}
const sql = neon(process.env.DATABASE_URL!)
const args = process.argv.slice(2)
const until = args[args.indexOf("--until") + 1] ?? "2026-11-14"
const reset = args.includes("--reset")

type Plan = { email: string; name: string; hue: string; consistency: number; workoutDays: number[]; startWeight: number; goals: [string, string, string, string, number | null, number | null, string | null][] }
// [module, metric, label, kind, target, weekly, unit]
const plans: Plan[] = [
  {
    email: "alex@example.com", name: "Alex", hue: "orange", consistency: 0.85, workoutDays: [1, 2, 4, 5, 6], startWeight: 84.6,
    goals: [
      ["workouts", "workout", "Workout", "check", null, 4, null],
      ["weight", "weight", "Weight", "number", 80, null, "kg"],
      ["nutrition", "protein", "Protein", "number", 140, null, "g"],
      ["sleep", "bedtime", "In bed by 12", "check", null, null, null],
      ["habits", "custom-a1", "No alcohol", "check", null, null, null],
      ["habits", "custom-a2", "Stretch", "check", null, null, null],
    ],
  },
  {
    email: "blake@example.com", name: "Blake", hue: "aqua", consistency: 0.72, workoutDays: [1, 3, 5, 6], startWeight: 63.1,
    goals: [
      ["workouts", "workout", "Workout", "check", null, 4, null],
      ["water", "water", "Water", "number", 3, null, "L"],
      ["reading", "pages", "Reading", "number", 20, null, "pages"],
      ["budget", "spend", "Spending", "number", 25, null, "£"],
    ],
  },
  {
    email: "casey@example.com", name: "Casey", hue: "violet", consistency: 0.6, workoutDays: [2, 4, 6], startWeight: 92.4,
    goals: [
      ["weight", "weight", "Weight", "number", 85, null, "kg"],
      ["steps", "steps", "Steps", "number", 10000, null, "steps"],
      ["nutrition", "calories", "Calories", "number", 2500, null, "kcal"],
      ["nutrition", "no-junk", "No junk food", "check", null, null, null],
      ["screen", "minutes", "Screen time", "number", 180, null, "min"],
    ],
  },
]
const COMPARE: Record<string, "min" | "max"> = { protein: "min", water: "min", pages: "min", steps: "min", spend: "max", calories: "max", minutes: "max" }
const STEP: Record<string, number> = { protein: 5, water: 0.25, pages: 5, steps: 500, spend: 5, calories: 50, minutes: 15, weight: 0.1 }
const names = ["Push", "Pull", "Legs", "Run", "Full body", "Class"]

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const roundTo = (n: number, step: number) => Math.round(Math.round(n / step) * step * 100) / 100

const [squad] = await sql`select id, starts_on::text as starts_on from squads order by created_at limit 1`
const start = Date.parse(squad!.starts_on)
const lastDay = Math.round((Date.parse(until) - start) / 86_400_000)

for (const [pi, p] of plans.entries()) {
  const [user] = await sql`select user_id from profiles where email = ${p.email}`
  if (!user) {
    console.log("skip", p.email, "(no profile)")
    continue
  }
  const uid = user.user_id as string
  await sql`update profiles set status = 'approved', time_zone = 'Europe/London' where user_id = ${uid}`
  await sql`insert into squad_members (squad_id, user_id, hue, display_name, onboarded_at) values (${squad!.id}, ${uid}, ${p.hue}, ${p.name}, now())
            on conflict (squad_id, user_id) do update set hue = excluded.hue, display_name = excluded.display_name, onboarded_at = coalesce(squad_members.onboarded_at, now())`
  if (reset) {
    await sql`delete from check_ins where user_id = ${uid}`
    await sql`delete from goals where user_id = ${uid}`
  }
  const existing = await sql`select id, module, metric, kind, target from goals where user_id = ${uid} and archived_at is null`
  let goals = existing
  if (!existing.length) {
    goals = []
    for (const [i, [module, metric, label, kind, target, weekly, unit]] of p.goals.entries()) {
      const visibility = module === "weight" || module === "budget" ? "summary" : "squad"
      const compare = module === "weight" ? "max" : (COMPARE[metric] ?? null)
      const [g] = await sql`insert into goals (squad_id, user_id, module, metric, label, kind, target, weekly_target, unit, compare, step, start_value, scored, visibility, position)
        values (${squad!.id}, ${uid}, ${module}, ${metric}, ${label}, ${kind}, ${target}, ${weekly}, ${unit}, ${compare}, ${STEP[metric] ?? null},
                ${module === "weight" ? p.startWeight : null}, ${module !== "weight"}, ${visibility}, ${i})
        returning id, module, metric, kind, target`
      goals.push(g!)
    }
  }
  const rand = rng(pi * 7919 + 13)
  let rows = 0
  for (let d = 0; d <= lastDay; d++) {
    const progress = d / 92
    if (d > 0 && d < lastDay && rand() < 0.07) continue
    if (d === lastDay && pi !== 1) continue // leave today open for some
    const day = new Date(start + d * 86_400_000).toISOString().slice(0, 10)
    const weekday = new Date(start + d * 86_400_000).getUTCDay()
    const odds = Math.min(0.95, p.consistency + progress * 0.1)
    const saved = new Date(start + d * 86_400_000 + (7 + Math.floor(rand() * 15)) * 3_600_000 + Math.floor(rand() * 60) * 60_000).toISOString()
    await sql`insert into check_ins (squad_id, user_id, day, saved_at) values (${squad!.id}, ${uid}, ${day}, ${saved}) on conflict do nothing`
    for (const g of goals) {
      let checked: boolean | null = null
      let value: number | null = null
      let note: string | null = null
      if (g.module === "workouts") {
        checked = p.workoutDays.includes(weekday) ? rand() < odds + 0.05 : rand() < 0.08
        if (checked) note = names[Math.floor(rand() * names.length)]!
      } else if (g.module === "weight") {
        if (rand() < 0.85) value = roundTo(p.startWeight - 0.06 * d + (rand() - 0.5) * 0.9, 0.1)
      } else if (g.kind === "check") {
        checked = rand() < odds
      } else {
        const t = Number(g.target)
        const hit = rand() < odds
        const spread = t * (0.04 + rand() * 0.12)
        const side = COMPARE[g.metric as string] === "min" ? 1 : -1
        value = roundTo(hit ? t + side * spread * rand() : t - side * spread, STEP[g.metric as string] ?? 1)
      }
      await sql`insert into entries (goal_id, user_id, day, checked, value, note) values (${g.id}, ${uid}, ${day}, ${checked}, ${value}, ${note})
                on conflict (goal_id, day) do update set checked = excluded.checked, value = excluded.value, note = excluded.note`
      rows++
    }
  }
  console.log(p.email, "goals", goals.length, "entries", rows)
}
