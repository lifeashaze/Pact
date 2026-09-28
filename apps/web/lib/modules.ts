// Modules are the tools a member picks during onboarding. Each module adds one
// or more goals ("metrics") to their daily check-in, with sensible defaults
// they can tune. Shared by the onboarding UI and the API that validates it.

export type ModuleId =
  | "workouts"
  | "weight"
  | "steps"
  | "nutrition"
  | "water"
  | "sleep"
  | "habits"
  | "reading"
  | "focus"
  | "screen"
  | "budget"
  | "mood"

export type Visibility = "squad" | "summary" | "private"

export type MetricDef = {
  key: string
  label: string
  kind: "check" | "number"
  unit?: string
  compare?: "min" | "max"
  target?: number
  step?: number
  min?: number
  max?: number
  // Counted per week instead of per day (e.g. 4 workouts a week)
  weekly?: { default: number; min: number; max: number }
  // Tracked and charted but not part of the hit rate
  scored: boolean
  // On when the module is first picked
  defaultOn: boolean
  hint?: string
}

export type ModuleDef = {
  id: ModuleId
  name: string
  group: "Body" | "Food" | "Mind" | "Money"
  blurb: string
  // What the squad sees by default
  visibility: Visibility
  // Which visibility choices make sense for this module
  visibilityOptions: Visibility[]
  metrics: MetricDef[]
  // Habits lets people add their own yes/no goals
  custom?: { presets: string[]; max: number }
  // Weight asks for a starting point
  askStart?: { label: string; unit: string; step: number; min: number; max: number; default: number }
}

export const MODULES: ModuleDef[] = [
  {
    id: "workouts",
    name: "Workouts",
    group: "Body",
    blurb: "Sessions per week, and what you trained.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      {
        key: "workout",
        label: "Workout",
        kind: "check",
        weekly: { default: 4, min: 1, max: 7 },
        scored: true,
        defaultOn: true,
        hint: "Any training counts: gym, a run, a class, a match.",
      },
    ],
  },
  {
    id: "weight",
    name: "Weight",
    group: "Body",
    blurb: "Daily weigh-ins, smoothed so the trend shows through the noise.",
    visibility: "summary",
    visibilityOptions: ["squad", "summary", "private"],
    askStart: { label: "Weight today", unit: "kg", step: 0.1, min: 30, max: 250, default: 75 },
    metrics: [
      {
        key: "weight",
        label: "Weight",
        kind: "number",
        unit: "kg",
        step: 0.1,
        min: 30,
        max: 250,
        scored: false,
        defaultOn: true,
        hint: "Your goal weight. Not scored: weight moves slowly and that's fine.",
      },
    ],
  },
  {
    id: "steps",
    name: "Steps",
    group: "Body",
    blurb: "A daily step count to hit.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      { key: "steps", label: "Steps", kind: "number", unit: "steps", compare: "min", target: 10000, step: 500, min: 1000, max: 40000, scored: true, defaultOn: true },
    ],
  },
  {
    id: "nutrition",
    name: "Food",
    group: "Food",
    blurb: "Calories, protein, and the rules you eat by.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      { key: "protein", label: "Protein", kind: "number", unit: "g", compare: "min", target: 140, step: 5, min: 30, max: 400, scored: true, defaultOn: true },
      { key: "calories", label: "Calories", kind: "number", unit: "kcal", compare: "max", target: 2200, step: 50, min: 1000, max: 6000, scored: true, defaultOn: false },
      { key: "no-junk", label: "No junk food", kind: "check", scored: true, defaultOn: false },
      { key: "no-sugar", label: "No added sugar", kind: "check", scored: true, defaultOn: false },
      { key: "home-cooked", label: "Home-cooked meals only", kind: "check", scored: true, defaultOn: false },
    ],
  },
  {
    id: "water",
    name: "Water",
    group: "Food",
    blurb: "Litres a day.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      { key: "water", label: "Water", kind: "number", unit: "L", compare: "min", target: 3, step: 0.25, min: 0.5, max: 8, scored: true, defaultOn: true },
    ],
  },
  {
    id: "sleep",
    name: "Sleep",
    group: "Body",
    blurb: "A bedtime to keep, hours to get, or both.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      { key: "bedtime", label: "In bed by 12", kind: "check", scored: true, defaultOn: true, hint: "Rename it to your own bedtime." },
      { key: "hours", label: "Sleep", kind: "number", unit: "h", compare: "min", target: 7, step: 0.5, min: 4, max: 12, scored: true, defaultOn: false },
    ],
  },
  {
    id: "habits",
    name: "Habits",
    group: "Mind",
    blurb: "Yes-or-no things you do, or don't, every day.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [],
    custom: {
      presets: ["No alcohol", "Meditate 10 minutes", "Journal", "Cold shower", "No smoking", "Stretch", "No social media before noon", "Skincare"],
      max: 6,
    },
  },
  {
    id: "reading",
    name: "Reading",
    group: "Mind",
    blurb: "Pages a day. Books add up fast.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      { key: "pages", label: "Reading", kind: "number", unit: "pages", compare: "min", target: 20, step: 5, min: 5, max: 200, scored: true, defaultOn: true },
    ],
  },
  {
    id: "focus",
    name: "Deep work",
    group: "Mind",
    blurb: "Hours of focused study or work.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      { key: "hours", label: "Deep work", kind: "number", unit: "h", compare: "min", target: 2, step: 0.5, min: 0.5, max: 12, scored: true, defaultOn: true },
    ],
  },
  {
    id: "screen",
    name: "Screen time",
    group: "Mind",
    blurb: "Phone time under a daily limit.",
    visibility: "squad",
    visibilityOptions: ["squad", "summary", "private"],
    metrics: [
      { key: "minutes", label: "Screen time", kind: "number", unit: "min", compare: "max", target: 180, step: 15, min: 15, max: 720, scored: true, defaultOn: true, hint: "Copy it from Screen Time or Digital Wellbeing at night." },
    ],
  },
  {
    id: "budget",
    name: "Spending",
    group: "Money",
    blurb: "A daily spending limit and no-spend days.",
    visibility: "summary",
    visibilityOptions: ["summary", "private"],
    metrics: [
      { key: "spend", label: "Spending", kind: "number", unit: "£", compare: "max", target: 30, step: 5, min: 0, max: 1000, scored: true, defaultOn: true, hint: "Everyday spending, not rent or bills." },
      { key: "no-spend", label: "No-spend day", kind: "check", scored: false, defaultOn: false, hint: "Tick on days you spent nothing at all." },
    ],
  },
  {
    id: "mood",
    name: "Mood",
    group: "Mind",
    blurb: "How the day felt, from 1 to 5. Just for you.",
    visibility: "private",
    visibilityOptions: ["private", "squad"],
    metrics: [{ key: "mood", label: "Mood", kind: "number", unit: "/5", step: 1, min: 1, max: 5, scored: false, defaultOn: true }],
  },
]

export const MODULE_GROUPS = ["Body", "Food", "Mind", "Money"] as const

export function getModule(id: string) {
  return MODULES.find((m) => m.id === id)
}

export const VISIBILITY_COPY: Record<Visibility, { label: string; detail: string }> = {
  squad: { label: "Everything", detail: "The squad sees your numbers." },
  summary: { label: "Hit or miss", detail: "The squad sees whether you hit it, not the numbers." },
  private: { label: "Just me", detail: "Only you see it. It doesn't count toward your hit rate." },
}

export const CURRENCIES = ["£", "$", "€", "₹"] as const

// ---------- the shape onboarding sends ----------

export type GoalInput = {
  module: ModuleId
  metric: string
  label: string
  target?: number
  weeklyTarget?: number
  startValue?: number
  unit?: string
}

export type SetupInput = {
  displayName: string
  hue: string
  timeZone: string
  modules: { id: ModuleId; visibility: Visibility }[]
  goals: GoalInput[]
}

export type GoalRecord = {
  module: ModuleId
  metric: string
  label: string
  kind: "check" | "number"
  unit: string | null
  target: number | null
  compare: "min" | "max" | null
  step: number | null
  weeklyTarget: number | null
  startValue: number | null
  scored: boolean
  visibility: Visibility
  position: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// Turns what the client sent into goal rows, trusting nothing but module ids,
// metric keys and numbers inside each metric's range. Returns an error string on bad input.
export function buildGoals(input: SetupInput): GoalRecord[] | string {
  const chosen = new Map(input.modules.map((m) => [m.id, m.visibility]))
  const out: GoalRecord[] = []
  let position = 0
  const customCount = new Map<string, number>()

  for (const g of input.goals) {
    const mod = getModule(g.module)
    if (!mod || !chosen.has(mod.id)) return `Unknown module ${g.module}`
    let visibility = chosen.get(mod.id)!
    if (!mod.visibilityOptions.includes(visibility)) visibility = mod.visibility
    const label = String(g.label ?? "").trim().slice(0, 60)

    if (g.metric.startsWith("custom-")) {
      if (!mod.custom) return `${mod.name} doesn't take custom goals`
      const n = (customCount.get(mod.id) ?? 0) + 1
      if (n > mod.custom.max) return `Up to ${mod.custom.max} ${mod.name.toLowerCase()}`
      customCount.set(mod.id, n)
      if (!label) return "Give each habit a name"
      out.push({
        module: mod.id,
        metric: g.metric.slice(0, 40),
        label,
        kind: "check",
        unit: null,
        target: null,
        compare: null,
        step: null,
        weeklyTarget: null,
        startValue: null,
        scored: visibility !== "private",
        visibility,
        position: position++,
      })
      continue
    }

    const def = mod.metrics.find((m) => m.key === g.metric)
    if (!def) return `Unknown goal ${g.metric}`
    const lo = def.min ?? -Infinity
    const hi = def.max ?? Infinity
    const target =
      def.kind === "number" && typeof g.target === "number" && Number.isFinite(g.target)
        ? clamp(g.target, lo, hi)
        : (def.target ?? null)
    const weeklyTarget = def.weekly
      ? clamp(Math.round(Number(g.weeklyTarget ?? def.weekly.default)), def.weekly.min, def.weekly.max)
      : null
    const start = mod.askStart
    const startValue =
      start && typeof g.startValue === "number" && Number.isFinite(g.startValue)
        ? clamp(g.startValue, start.min, start.max)
        : null
    const unit = mod.id === "budget" && def.unit === "£" && CURRENCIES.includes(g.unit as never) ? g.unit! : (def.unit ?? null)

    out.push({
      module: mod.id,
      metric: def.key,
      label: label || def.label,
      kind: def.kind,
      unit,
      target,
      // Weight: lower is the goal when the target is under the start, higher otherwise
      compare: mod.id === "weight" && target !== null && startValue !== null ? (target < startValue ? "max" : "min") : (def.compare ?? null),
      step: def.step ?? null,
      weeklyTarget,
      startValue,
      scored: def.scored && visibility !== "private",
      visibility,
      position: position++,
    })
  }

  if (out.filter((g) => g.scored).length === 0) return "Pick at least one goal that counts toward your score"
  return out
}
