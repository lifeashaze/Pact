"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { RiAddLine, RiArrowLeftLine, RiCloseLine, RiLockLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { hueTint, hueVar } from "@/components/bits"
import { Mark } from "@/components/brand"
import { MODULE_ICONS } from "@/components/onboarding/module-icons"
import { Segmented, Stepper, Tick } from "@/components/onboarding/controls"
import {
  CURRENCIES,
  MODULES,
  MODULE_GROUPS,
  type ModuleDef,
  type ModuleId,
  type SetupInput,
  VISIBILITY_COPY,
  type Visibility,
} from "@/lib/modules"
import { HUES, type Hue, formatNumber, initialsOf } from "@/lib/season"

export type OnboardingGoal = {
  module: string
  metric: string
  label: string
  target: number | null
  weeklyTarget: number | null
  startValue: number | null
  unit: string | null
  visibility: Visibility
}

type MetricState = { on: boolean; label: string; target?: number; weekly?: number }
type ModState = {
  on: boolean
  visibility: Visibility
  metrics: Record<string, MetricState>
  custom: { key: string; label: string }[]
  start?: number
  currency: string
}
type State = Record<ModuleId, ModState>

const STEPS = ["you", "modules", "targets", "privacy", "review"] as const
type Step = (typeof STEPS)[number]

function initialState(goals: OnboardingGoal[]): State {
  const out = {} as State
  for (const mod of MODULES) {
    const mine = goals.filter((g) => g.module === mod.id)
    const metrics: Record<string, MetricState> = {}
    for (const def of mod.metrics) {
      const g = mine.find((x) => x.metric === def.key)
      metrics[def.key] = {
        on: mine.length ? !!g : def.defaultOn,
        label: g?.label ?? def.label,
        target: g?.target ?? def.target ?? (mod.id === "weight" ? undefined : undefined),
        weekly: g?.weeklyTarget ?? def.weekly?.default,
      }
    }
    const weight = mine.find((g) => g.metric === "weight")
    out[mod.id] = {
      on: mine.length > 0,
      visibility: mine[0]?.visibility ?? mod.visibility,
      metrics,
      custom: mine.filter((g) => g.metric.startsWith("custom-")).map((g) => ({ key: g.metric, label: g.label })),
      start: weight?.startValue ?? undefined,
      currency: mine.find((g) => g.metric === "spend")?.unit ?? "£",
    }
    if (mod.id === "weight" && weight) out.weight.metrics.weight!.target = weight.target ?? undefined
  }
  return out
}

// Weight's goal defaults to 3 kg under the starting point until they change it
const weightTarget = (s: ModState, mod: ModuleDef) =>
  s.metrics.weight?.target ?? Math.round(((s.start ?? mod.askStart!.default) - 3) * 10) / 10

function toInput(state: State, displayName: string, hue: Hue): SetupInput {
  const modules = MODULES.filter((m) => state[m.id].on)
  const goals: SetupInput["goals"] = []
  for (const mod of modules) {
    const s = state[mod.id]
    for (const def of mod.metrics) {
      const m = s.metrics[def.key]!
      if (!m.on) continue
      goals.push({
        module: mod.id,
        metric: def.key,
        label: m.label,
        target: mod.id === "weight" ? weightTarget(s, mod) : m.target,
        weeklyTarget: m.weekly,
        startValue: mod.askStart ? (s.start ?? mod.askStart.default) : undefined,
        unit: mod.id === "budget" && def.key === "spend" ? s.currency : undefined,
      })
    }
    for (const c of s.custom) goals.push({ module: mod.id, metric: c.key, label: c.label })
  }
  return {
    displayName,
    hue,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    modules: modules.map((m) => ({ id: m.id, visibility: state[m.id].visibility })),
    goals,
  }
}

// Why a module can't be saved yet, if anything
function moduleProblem(mod: ModuleDef, s: ModState) {
  if (mod.custom) return s.custom.length ? null : `Add at least one habit`
  if (mod.metrics.length > 1 && !mod.metrics.some((d) => s.metrics[d.key]!.on)) return `Pick at least one thing to track`
  return null
}

export function Onboarding(props: {
  editing: boolean
  name: string
  image: string | null
  hue: string
  taken: { hue: string; name: string }[]
  goals: OnboardingGoal[]
  startsOn: string
  started: boolean
}) {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>(props.editing ? "modules" : "you")
  const [dir, setDir] = React.useState(1)
  const [displayName, setDisplayName] = React.useState(props.name)
  const takenHues = new Map(props.taken.map((t) => [t.hue, t.name]))
  const [hue, setHue] = React.useState<Hue>(() => {
    const own = props.hue as Hue
    return HUES.includes(own) && !takenHues.has(own) ? own : (HUES.find((h) => !takenHues.has(h)) ?? "blue")
  })
  const [state, setState] = React.useState<State>(() => initialState(props.goals))
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)
  const scroller = React.useRef<HTMLDivElement>(null)

  const chosen = MODULES.filter((m) => state[m.id].on)
  const input = toInput(state, displayName.trim(), hue)
  const scoredCount = input.goals.filter((g) => {
    const mod = MODULES.find((m) => m.id === g.module)!
    const def = mod.metrics.find((d) => d.key === g.metric)
    const vis = state[mod.id].visibility
    return vis !== "private" && (def ? def.scored : true)
  }).length
  const startDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(props.startsOn)
  )

  const blocker: string | null = (() => {
    if (step === "you") return displayName.trim() ? null : "Add your name"
    if (step === "modules") return chosen.length ? null : "Pick at least one"
    if (step === "targets") {
      for (const m of chosen) {
        const p = moduleProblem(m, state[m.id])
        if (p) return `${m.name}: ${p.toLowerCase()}`
      }
      return null
    }
    if (step === "privacy" || step === "review") return scoredCount ? null : "At least one goal has to count toward your score"
    return null
  })()

  const index = STEPS.indexOf(step)
  const go = (to: number) => {
    setDir(to > index ? 1 : -1)
    setStep(STEPS[to]!)
    setError(null)
    scroller.current?.scrollTo({ top: 0 })
  }

  const update = (id: ModuleId, fn: (s: ModState) => ModState) => setState((all) => ({ ...all, [id]: fn(all[id]) }))

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/setup", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Couldn't save")
      if (props.editing) {
        router.replace("/home")
        router.refresh()
      } else setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save")
      setSaving(false)
    }
  }

  if (done) return <Done name={displayName} hue={hue} startDate={startDate} started={props.started} />

  return (
    <div className="flex h-svh flex-col">
      {/* Top bar: back, progress, step count */}
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-6">
        <button
          type="button"
          onClick={() => (index === 0 || (props.editing && index === 1) ? props.editing && router.back() : go(index - 1))}
          aria-label={props.editing && index <= 1 ? "Cancel" : "Back"}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full bg-card text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
            index === 0 && !props.editing && "invisible"
          )}
        >
          {props.editing && index <= 1 ? <RiCloseLine className="size-5" /> : <RiArrowLeftLine className="size-5" />}
        </button>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ background: hueVar(hue) }}
                initial={false}
                animate={{ width: i <= index ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
              />
            </div>
          ))}
        </div>
        <span className="w-12 shrink-0 text-end text-sm text-muted-foreground tabular-nums">
          {index + 1} of {STEPS.length}
        </span>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overflow-x-clip">
        <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-10 sm:px-6 sm:pt-10">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -32 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              {step === "you" && (
                <YouStep
                  name={displayName}
                  setName={setDisplayName}
                  image={props.image}
                  hue={hue}
                  setHue={setHue}
                  taken={takenHues}
                  startDate={startDate}
                />
              )}
              {step === "modules" && <ModulesStep state={state} hue={hue} toggle={(id) => update(id, (s) => ({ ...s, on: !s.on }))} />}
              {step === "targets" && <TargetsStep chosen={chosen} state={state} update={update} hue={hue} />}
              {step === "privacy" && <PrivacyStep chosen={chosen} state={state} update={update} />}
              {step === "review" && <ReviewStep chosen={chosen} state={state} hue={hue} startDate={startDate} started={props.started} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="border-t border-border bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <p className={cn("min-w-0 flex-1 text-sm", error ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
            {error ?? blocker ?? (step === "modules" ? `${chosen.length} picked` : step === "review" ? `${scoredCount} goals count toward your score` : "")}
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={!!blocker || saving}
            onClick={() => (step === "review" ? save() : go(index + 1))}
            className="h-12 shrink-0 rounded-full bg-primary px-7 font-semibold text-primary-foreground transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {step === "review" ? (saving ? "Saving" : props.editing ? "Save changes" : "Start my season") : "Continue"}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ---------- steps ----------

function StepTitle({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance sm:text-6xl">{title}</h1>
      {sub && <p className="mt-3 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">{sub}</p>}
    </header>
  )
}

function YouStep({
  name,
  setName,
  image,
  hue,
  setHue,
  taken,
  startDate,
}: {
  name: string
  setName: (s: string) => void
  image: string | null
  hue: Hue
  setHue: (h: Hue) => void
  taken: Map<string, string>
  startDate: string
}) {
  const first = name.trim().split(/\s+/)[0] || "there"
  return (
    <>
      <StepTitle title={`Hey ${first}. Let's set up your 92 days.`} sub={`It takes about two minutes. The season starts ${startDate}.`} />
      <div className="grid gap-8">
        <label className="grid gap-2">
          <span className="font-semibold">The name your squad sees</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="nickname"
            className="h-13 rounded-2xl border border-border bg-card px-4 text-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>
        <fieldset className="grid gap-3">
          <legend className="mb-1 font-semibold">Your colour</legend>
          <p className="-mt-1 mb-1 text-sm text-muted-foreground">It marks you on every chart, so each person gets their own.</p>
          <div className="grid grid-cols-4 gap-3" role="radiogroup" aria-label="Colour">
            {HUES.map((h) => {
              const owner = taken.get(h)
              const on = hue === h
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!!owner}
                  onClick={() => setHue(h)}
                  className={cn(
                    "grid justify-items-center gap-2 rounded-2xl border bg-card px-2 pt-4 pb-3 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed",
                    on ? "border-transparent" : "border-border"
                  )}
                  style={on ? { background: hueTint(h, 12), boxShadow: `inset 0 0 0 2px ${hueVar(h)}` } : undefined}
                >
                  <motion.span
                    animate={{ scale: on ? 1.08 : 1, opacity: owner ? 0.35 : 1 }}
                    className="grid size-14 place-items-center rounded-full font-display text-xl font-semibold"
                    style={{ background: hueTint(h, 22), boxShadow: `inset 0 0 0 2.5px ${hueVar(h)}` }}
                  >
                    {image && on ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" referrerPolicy="no-referrer" className="size-11 rounded-full object-cover" />
                    ) : (
                      initialsOf(name || "?")
                    )}
                  </motion.span>
                  <span className="max-w-full truncate text-xs text-muted-foreground">{owner ? owner : on ? "You" : " "}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>
    </>
  )
}

function ModulesStep({ state, hue, toggle }: { state: State; hue: Hue; toggle: (id: ModuleId) => void }) {
  return (
    <>
      <StepTitle title="What are you working on?" sub="Pick the tools you want. Each one adds a line or two to your daily check-in. You can change this later." />
      <div className="grid gap-8">
        {MODULE_GROUPS.map((group) => (
          <section key={group} className="grid gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{group}</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {MODULES.filter((m) => m.group === group).map((m) => {
                const on = state[m.id].on
                const Icon = MODULE_ICONS[m.id]
                return (
                  <motion.button
                    key={m.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(m.id)}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-start gap-3.5 rounded-2xl border bg-card p-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring"
                    style={on ? { background: hueTint(hue, 10), borderColor: "transparent", boxShadow: `inset 0 0 0 2px ${hueVar(hue)}` } : { borderColor: "var(--border)" }}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        {m.name}
                        {m.visibility === "private" && <RiLockLine className="size-3.5 text-muted-foreground" aria-label="Private by default" />}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{m.blurb}</span>
                    </span>
                    <Tick on={on} color={hueVar(hue)} />
                  </motion.button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}

function TargetsStep({
  chosen,
  state,
  update,
  hue,
}: {
  chosen: ModuleDef[]
  state: State
  update: (id: ModuleId, fn: (s: ModState) => ModState) => void
  hue: Hue
}) {
  return (
    <>
      <StepTitle title="Set your targets" sub="Aim for something you can hit most days. A target you hit 80% of the time beats a heroic one you miss." />
      <div className="grid gap-4">
        {chosen.map((mod) => (
          <ModuleCard key={mod.id} mod={mod}>
            <ModuleTargets mod={mod} s={state[mod.id]} set={(fn) => update(mod.id, fn)} hue={hue} />
          </ModuleCard>
        ))}
      </div>
    </>
  )
}

function ModuleCard({ mod, children, aside }: { mod: ModuleDef; children: React.ReactNode; aside?: React.ReactNode }) {
  const Icon = MODULE_ICONS[mod.id]
  return (
    <section className="rounded-3xl bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-muted">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <h2 className="flex-1 font-display text-2xl font-semibold tracking-tight">{mod.name}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Row({ label, hint, children }: { label: React.ReactNode; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 basis-48">
        <div className="font-medium">{label}</div>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ModuleTargets({ mod, s, set, hue }: { mod: ModuleDef; s: ModState; set: (fn: (s: ModState) => ModState) => void; hue: Hue }) {
  const setMetric = (key: string, patch: Partial<MetricState>) =>
    set((x) => ({ ...x, metrics: { ...x.metrics, [key]: { ...x.metrics[key]!, ...patch } } }))
  const [draft, setDraft] = React.useState("")

  if (mod.id === "habits") {
    const add = (label: string) => {
      const clean = label.trim().slice(0, 60)
      if (!clean || s.custom.some((c) => c.label.toLowerCase() === clean.toLowerCase()) || s.custom.length >= mod.custom!.max) return
      set((x) => ({ ...x, custom: [...x.custom, { key: `custom-${Math.random().toString(36).slice(2, 8)}`, label: clean }] }))
    }
    const remove = (key: string) => set((x) => ({ ...x, custom: x.custom.filter((c) => c.key !== key) }))
    const suggestions = mod.custom!.presets.filter((p) => !s.custom.some((c) => c.label === p))
    return (
      <div className="grid gap-4">
        <ul className="grid gap-2">
          <AnimatePresence initial={false}>
            {s.custom.map((c) => (
              <motion.li
                key={c.key}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex h-12 items-center gap-3 rounded-2xl px-4" style={{ background: hueTint(hue, 10) }}>
                  <Tick on color={hueVar(hue)} />
                  <span className="flex-1 font-medium">{c.label}</span>
                  <button
                    type="button"
                    onClick={() => remove(c.key)}
                    aria-label={`Remove ${c.label}`}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {s.custom.length < mod.custom!.max && (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                add(draft)
                setDraft("")
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add your own, like “Call mum”"
                maxLength={60}
                aria-label="New habit"
                className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
              <button type="submit" disabled={!draft.trim()} className="flex h-11 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                <RiAddLine className="size-4" /> Add
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => add(p)}
                  className="flex h-9 items-center gap-1 rounded-full border border-dashed border-border px-3.5 text-sm text-muted-foreground hover:border-solid hover:text-foreground"
                >
                  <RiAddLine className="size-3.5" /> {p}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="text-sm text-muted-foreground">
          {s.custom.length} of {mod.custom!.max}
        </p>
      </div>
    )
  }

  if (mod.id === "mood") {
    return <p className="text-muted-foreground">One tap at check-in, from rough to great. Only you see it, and it never affects your score.</p>
  }

  const optional = mod.metrics.length > 1
  return (
    <div className="grid">
      {mod.askStart && (
        <Row label={mod.askStart.label} hint="Where you're starting from.">
          <Stepper
            label={mod.askStart.label}
            value={s.start ?? mod.askStart.default}
            onChange={(n) => set((x) => ({ ...x, start: n }))}
            step={mod.askStart.step}
            min={mod.askStart.min}
            max={mod.askStart.max}
            unit={mod.askStart.unit}
            format={(n) => n.toFixed(1)}
          />
        </Row>
      )}
      {mod.id === "budget" && (
        <Row label="Currency">
          <div className="w-52">
            <Segmented
              id="currency"
              label="Currency"
              size="sm"
              value={s.currency}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
              onChange={(c) => set((x) => ({ ...x, currency: c }))}
            />
          </div>
        </Row>
      )}
      {mod.metrics.map((def) => {
        const m = s.metrics[def.key]!
        const unit = mod.id === "budget" && def.unit === "£" ? s.currency : def.unit
        const label = (
          <span className="flex items-center gap-3">
            {optional && (
              <button
                type="button"
                role="checkbox"
                aria-checked={m.on}
                aria-label={`Track ${m.label}`}
                onClick={() => setMetric(def.key, { on: !m.on })}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Tick on={m.on} color={hueVar(hue)} />
              </button>
            )}
            {def.key === "bedtime" ? (
              <input
                value={m.label}
                onChange={(e) => setMetric(def.key, { label: e.target.value })}
                aria-label="Bedtime goal"
                maxLength={40}
                className="w-40 rounded-lg border border-transparent bg-transparent px-1 font-medium outline-none hover:border-border focus-visible:border-ring"
              />
            ) : (
              <span className={cn(!m.on && "text-muted-foreground")}>{mod.id === "weight" ? "Goal weight" : m.label}</span>
            )}
          </span>
        )
        const control =
          !m.on ? null : def.weekly ? (
            <Stepper
              label="Workouts a week"
              value={m.weekly ?? def.weekly.default}
              onChange={(n) => setMetric(def.key, { weekly: n })}
              step={1}
              min={def.weekly.min}
              max={def.weekly.max}
              unit="a week"
            />
          ) : def.kind === "number" && (def.target !== undefined || mod.id === "weight") ? (
            <Stepper
              label={m.label}
              value={mod.id === "weight" ? weightTarget(s, mod) : (m.target ?? def.target!)}
              onChange={(n) => setMetric(def.key, { target: n })}
              step={def.step ?? 1}
              min={def.min ?? 0}
              max={def.max ?? 100000}
              unit={unit}
              format={(n) => (mod.id === "weight" ? n.toFixed(1) : n.toLocaleString("en-GB"))}
            />
          ) : null
        return (
          <Row
            key={def.key}
            label={label}
            hint={m.on ? (def.kind === "number" && def.compare ? `${def.compare === "max" ? "At most" : "At least"} this much a day. ` : "") + (def.hint ?? "") || undefined : undefined}
          >
            {control}
          </Row>
        )
      })}
    </div>
  )
}

function PrivacyStep({ chosen, state, update }: { chosen: ModuleDef[]; state: State; update: (id: ModuleId, fn: (s: ModState) => ModState) => void }) {
  return (
    <>
      <StepTitle title="What does the squad see?" sub="Your hit rate is always shared. You decide how much detail goes with it." />
      <dl className="mb-6 grid gap-2 sm:grid-cols-3">
        {(Object.keys(VISIBILITY_COPY) as Visibility[]).map((v) => (
          <div key={v} className="rounded-2xl bg-card p-4">
            <dt className="font-semibold">{VISIBILITY_COPY[v].label}</dt>
            <dd className="mt-1 text-sm leading-snug text-muted-foreground">{VISIBILITY_COPY[v].detail}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-3xl bg-card p-2 sm:p-3">
        {chosen.map((mod) => {
          const Icon = MODULE_ICONS[mod.id]
          return (
            <div key={mod.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-3 first:border-t-0">
              <span className="flex min-w-0 flex-1 basis-40 items-center gap-3">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="font-medium">{mod.name}</span>
              </span>
              <div className="w-full sm:w-auto sm:min-w-80">
                <Segmented
                  id={`vis-${mod.id}`}
                  label={`Who sees ${mod.name}`}
                  size="sm"
                  value={state[mod.id].visibility}
                  options={mod.visibilityOptions.map((v) => ({ value: v, label: VISIBILITY_COPY[v].label }))}
                  onChange={(v) => update(mod.id, (s) => ({ ...s, visibility: v }))}
                />
              </div>
            </div>
          )
        })}
      </div>
      {state.weight.on && state.weight.visibility === "summary" && (
        <p className="mt-4 text-sm text-muted-foreground">
          With weight on hit or miss, the squad sees your change as a percentage, never your kilos.
        </p>
      )}
    </>
  )
}

function ReviewStep({ chosen, state, hue, startDate, started }: { chosen: ModuleDef[]; state: State; hue: Hue; startDate: string; started: boolean }) {
  return (
    <>
      <StepTitle
        title="Your daily check-in"
        sub={started ? "This is what you'll fill in each day. It takes under a minute." : `This is what you'll fill in each day from ${startDate}. It takes under a minute.`}
      />
      <div className="grid gap-3">
        {chosen.map((mod) => {
          const s = state[mod.id]
          const lines: { label: string; value: string }[] = []
          for (const def of mod.metrics) {
            const m = s.metrics[def.key]!
            if (!m.on) continue
            const unit = mod.id === "budget" && def.unit === "£" ? s.currency : def.unit
            if (def.weekly) lines.push({ label: m.label, value: `${m.weekly} a week` })
            else if (mod.id === "weight")
              lines.push({ label: "Morning weigh-in", value: `Goal ${weightTarget(s, mod).toFixed(1)} kg` })
            else if (mod.id === "mood") lines.push({ label: "How the day felt", value: "1 to 5" })
            else if (def.kind === "number" && m.target !== undefined)
              lines.push({ label: m.label, value: `${def.compare === "max" ? "At most" : "At least"} ${formatNumber(m.target, unit)}` })
            else lines.push({ label: m.label, value: "Yes or no" })
          }
          for (const c of s.custom) lines.push({ label: c.label, value: "Yes or no" })
          return (
            <ModuleCard
              key={mod.id}
              mod={mod}
              aside={<span className="text-sm text-muted-foreground">{VISIBILITY_COPY[s.visibility].label}</span>}
            >
              <ul className="grid gap-2">
                {lines.map((l) => (
                  <li key={l.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
                    <span className="flex items-center gap-3 font-medium">
                      <span className="size-2.5 rounded-full" style={{ background: hueVar(hue) }} aria-hidden />
                      {l.label}
                    </span>
                    <span className="text-sm text-muted-foreground">{l.value}</span>
                  </li>
                ))}
              </ul>
            </ModuleCard>
          )
        })}
      </div>
    </>
  )
}

function Done({ name, hue, startDate, started }: { name: string; hue: Hue; startDate: string; started: boolean }) {
  const router = useRouter()
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 py-12">
      <motion.div initial={{ scale: 0.4, rotate: -90, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14 }}>
        <Mark size={96} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-8 font-display text-6xl leading-[0.95] font-bold tracking-tight text-balance"
      >
        You&apos;re in, {name.trim().split(/\s+/)[0]}.
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4 text-lg leading-relaxed text-muted-foreground">
        {started ? "Your first check-in is waiting." : `Check-ins open ${startDate}. Until then, have a look around and see who else is in.`}
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          router.replace("/home")
          router.refresh()
        }}
        className="mt-10 h-13 rounded-full font-semibold text-white"
        style={{ background: hueVar(hue) }}
      >
        Go to the squad
      </motion.button>
    </main>
  )
}
