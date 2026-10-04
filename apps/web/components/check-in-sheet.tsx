"use client"

import * as React from "react"
import { AnimatePresence, LayoutGroup, motion, useDragControls } from "motion/react"
import { RiAddLine, RiCheckLine, RiCloseLine, RiLockLine, RiSubtractLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { Kbd, hueTint, hueVar, useMediaQuery } from "@/components/bits"
import { useSeason, useSquad } from "@/components/squad-store"
import { type DayLog, type Goal, type Hue, dailyGoals, formatNumber, isHit, latestAverage, workoutGoal } from "@/lib/season"

const workoutTypes = ["Push", "Pull", "Legs", "Upper body", "Full body", "Run", "Cardio", "Class", "Sport", "Yoga"]

// Below sm it's a bottom sheet you can drag away; from sm up it's a centred dialog,
// and from lg it opens out into two columns: the day on the left, the goals on the right
export function CheckInSheet() {
  const { checkInOpen, closeCheckIn } = useSquad()
  const drag = useDragControls()
  const dialog = React.useRef<HTMLDivElement>(null)
  const sheet = !useMediaQuery("(min-width: 40rem)")

  const onKey = React.useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") closeCheckIn()
    else if (e.key === "Tab") trapFocus(e, dialog.current)
  })

  React.useEffect(() => {
    if (!checkInOpen) return
    // Hand focus back to whatever opened it
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const listener = (e: KeyboardEvent) => onKey(e)
    document.addEventListener("keydown", listener)
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", listener)
      document.body.style.overflow = overflow
      opener?.focus()
    }
  }, [checkInOpen])

  return (
    <AnimatePresence>
      {checkInOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6 lg:p-10">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCheckIn}
          />
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="check-in-title"
            className="relative flex max-h-[92svh] w-full flex-col rounded-t-3xl bg-card shadow-2xl sm:max-h-[88svh] sm:max-w-lg sm:rounded-3xl lg:max-h-[min(88svh,52rem)] lg:max-w-4xl"
            initial={sheet ? { y: "100%" } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={sheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={sheet ? { y: "100%" } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={sheet ? { type: "spring", stiffness: 340, damping: 34 } : { type: "spring", stiffness: 420, damping: 34 }}
            drag={sheet ? "y" : false}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) closeCheckIn()
            }}
          >
            <CheckInForm onGrab={(e) => sheet && drag.start(e)} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Keeps Tab and Shift+Tab cycling inside the dialog
function trapFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (!root) return
  const items = [...root.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")]
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  const inside = root.contains(document.activeElement)
  if (e.shiftKey && (!inside || document.activeElement === first)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
    e.preventDefault()
    first.focus()
  }
}

const noSubscribe = () => () => {}
const useIsMac = () =>
  React.useSyncExternalStore(noSubscribe, () => /Mac|iPhone|iPad/.test(navigator.userAgent), () => false)

function blankLog(goals: Goal[], logs: (DayLog | undefined)[]): DayLog {
  const log: DayLog = { checks: {}, numbers: {} }
  // Start the scale from the recent average so it's a nudge, not typing from zero
  if (goals.some((g) => g.id === "weight")) {
    const avg = latestAverage(logs)
    if (avg !== undefined) log.numbers.weight = Math.round(avg * 10) / 10
  }
  return log
}

function CheckInForm({ onGrab }: { onGrab: (e: React.PointerEvent) => void }) {
  const { TODAY, longDate, weekOf, workoutsInWeek } = useSeason()
  const { logs, saveCheckIn, closeCheckIn, you, checkInDay } = useSquad()
  const mine = logs[you.id] ?? []
  const [day, setDay] = React.useState(checkInDay)
  const [drafts, setDrafts] = React.useState<Record<number, DayLog>>({})
  const existing = mine[day]
  const log = drafts[day] ?? (existing ? structuredClone(existing) : blankLog(you.goals, mine.slice(0, day)))
  const setLog = (update: (l: DayLog) => DayLog) => setDrafts((d) => ({ ...d, [day]: update(log) }))
  const [saving, setSaving] = React.useState(false)
  const firstControl = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => firstControl.current?.focus(), [])

  const goals = dailyGoals(you)
  const hitCount = goals.filter((g) => isHit(g, log)).length
  const allDone = goals.length > 0 && hitCount === goals.length
  const wGoal = workoutGoal(you)
  const workoutsBefore = workoutsInWeek(
    mine.map((l, i) => (i === day ? undefined : l)),
    weekOf(day)
  )

  // Group goals by the module they came from, in the member's own order
  const groups: { title: string; goals: Goal[] }[] = []
  for (const g of you.goals) {
    if (g.weekly) continue
    const group = groups.find((x) => x.title === g.category)
    if (group) group.goals.push(g)
    else groups.push({ title: g.category, goals: [g] })
  }

  const setCheck = (id: string, on: boolean) => setLog((l) => ({ ...l, checks: { ...l.checks, [id]: on } }))
  const setNumber = (id: string, n: number | undefined) => setLog((l) => ({ ...l, numbers: { ...l.numbers, [id]: n } }))

  async function save() {
    setSaving(true)
    const ok = await saveCheckIn(log, day)
    if (!ok) setSaving(false)
  }

  // Cmd/Ctrl+Enter saves from anywhere in the form
  const isMac = useIsMac()
  const onSaveKey = React.useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey) || saving) return
    e.preventDefault()
    save()
  })
  React.useEffect(() => {
    const listener = (e: KeyboardEvent) => onSaveKey(e)
    document.addEventListener("keydown", listener)
    return () => document.removeEventListener("keydown", listener)
  }, [])

  const canYesterday = TODAY > 0
  const dayLabel = day === TODAY ? "Today" : "Yesterday"

  return (
    <>
      {/* Only the handle and header start a drag, so the list inside still scrolls */}
      <div onPointerDown={onGrab} className="shrink-0 touch-none pt-3 sm:hidden">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />
      </div>
      <header
        onPointerDown={onGrab}
        className="flex touch-none items-start justify-between gap-4 px-6 pt-4 pb-2 sm:pt-6 lg:border-b lg:border-border lg:px-8 lg:pt-7 lg:pb-5"
      >
        <div>
          <p className="text-sm text-muted-foreground">{longDate(day)}</p>
          <h2 id="check-in-title" className="font-display text-3xl font-semibold tracking-tight lg:text-4xl">
            {existing ? `Edit ${dayLabel.toLowerCase()}` : day === TODAY ? "Check in" : "Log yesterday"}
          </h2>
        </div>
        <button
          onClick={closeCheckIn}
          aria-label="Close"
          aria-keyshortcuts="Escape"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RiCloseLine className="size-5" />
        </button>
      </header>

      {/* One column on phones and tablets. On desktop the day, progress and save sit on the left and the goals scroll on the right */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:min-h-[min(28rem,60svh)] lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto]">
        <div className="shrink-0 px-6 lg:col-start-1 lg:row-start-1 lg:border-e lg:border-border lg:px-8 lg:pt-6">
          {canYesterday && (
            <div className="pb-3 lg:pb-6">
              <LayoutGroup id="check-in-day">
                <div role="tablist" aria-label="Day" className="flex w-fit gap-1 rounded-full bg-muted p-1">
                  {[TODAY - 1, TODAY].map((d) => (
                    <button
                      key={d}
                      role="tab"
                      aria-selected={day === d}
                      onClick={() => setDay(d)}
                      className="relative h-8 rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors aria-selected:text-foreground"
                    >
                      {day === d && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-full bg-card shadow-sm" />}
                      <span className="relative">
                        {d === TODAY ? "Today" : "Yesterday"}
                        {mine[d] && <span className="sr-only"> (saved)</span>}
                      </span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
            </div>
          )}

          {/* Live progress: one segment per daily goal */}
          {goals.length > 0 && (
            <div className="pb-4">
              <p className="mb-3 hidden font-display text-5xl leading-none font-semibold tabular-nums lg:block" aria-hidden>
                {hitCount}
                <span className="text-muted-foreground">/{goals.length}</span>
              </p>
              <div className="flex gap-1.5">
                {goals.map((g) => (
                  <motion.span
                    key={g.id}
                    className="h-2 flex-1 rounded-full"
                    animate={{
                      backgroundColor: isHit(g, log) ? hueVar(you.hue) : "var(--muted)",
                      scaleY: allDone ? [1, 1.8, 1] : 1,
                    }}
                    transition={{ duration: 0.35 }}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
                {allDone ? "Every daily goal done" : `${hitCount} of ${goals.length} daily goals done`}
              </p>
            </div>
          )}
        </div>

        <div className="grid content-start gap-6 overflow-y-auto overscroll-contain px-6 pb-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:px-8 lg:py-6">
          {wGoal && (
            <Group title="Workouts" visibility={wGoal.visibility}>
              <ToggleRow
                ref={firstControl}
                hue={you.hue}
                label={day === TODAY ? "Worked out today" : "Worked out yesterday"}
                sub={`${workoutsBefore + (log.checks.workout ? 1 : 0)} of ${wGoal.weekly} this week`}
                on={!!log.checks.workout}
                onChange={(on) => {
                  setCheck("workout", on)
                  if (!on) setLog((l) => ({ ...l, workoutName: undefined }))
                }}
              />
              <AnimatePresence initial={false}>
                {log.checks.workout && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 pt-1 pb-1" role="group" aria-label="What did you train?">
                      {workoutTypes.map((t) => {
                        const selected = log.workoutName === t
                        return (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setLog((l) => ({ ...l, workoutName: selected ? undefined : t }))}
                            className={cn(
                              "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                              selected ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Group>
          )}

          {groups.map((group) => (
            <Group key={group.title} title={group.title} visibility={group.goals[0]!.visibility}>
              {group.goals.map((g, i) =>
                g.kind === "check" ? (
                  <ToggleRow
                    key={g.id}
                    ref={!wGoal && groups[0] === group && i === 0 ? firstControl : undefined}
                    hue={you.hue}
                    label={g.label}
                    on={!!log.checks[g.id]}
                    onChange={(on) => setCheck(g.id, on)}
                  />
                ) : (
                  <NumberRow key={g.id} hue={you.hue} goal={g} value={log.numbers[g.id]} onChange={(n) => setNumber(g.id, n)} />
                )
              )}
            </Group>
          ))}
        </div>

        <footer className="border-t border-border px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:col-start-1 lg:row-start-2 lg:border-e lg:px-8 lg:pb-6">
          <button
            onClick={save}
            disabled={saving}
            aria-keyshortcuts={isMac ? "Meta+Enter" : "Control+Enter"}
            className="h-13 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground transition-[transform,background-color] hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {saving ? "Saving" : existing ? "Save changes" : "Save check-in"}
          </button>
          <p className="mt-3 hidden items-center justify-center gap-1 text-xs text-muted-foreground lg:flex" aria-hidden>
            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>Enter</Kbd>
            <span className="me-2">to save</span>
            <Kbd>Esc</Kbd>
            <span>to close</span>
          </p>
        </footer>
      </div>
    </>
  )
}

function Group({ title, visibility, children }: { title: string; visibility: Goal["visibility"]; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {title}
        {visibility === "private" && (
          <span className="inline-flex items-center gap-1 text-xs">
            <RiLockLine className="size-3.5" aria-hidden />
            Only you
          </span>
        )}
        {visibility === "summary" && <span className="text-xs">(squad sees hit or miss)</span>}
      </h3>
      <div className="grid gap-2">{children}</div>
    </section>
  )
}

const ToggleRow = React.forwardRef<
  HTMLButtonElement,
  { hue: Hue; label: string; sub?: string; on: boolean; onChange: (on: boolean) => void }
>(function ToggleRow({ hue, label, sub, on, onChange }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-14 items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-ring"
      style={on ? { background: hueTint(hue, 10), borderColor: "transparent" } : undefined}
    >
      <span className="grid">
        <span className="font-medium">{label}</span>
        {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      </span>
      <motion.span
        className="grid size-8 shrink-0 place-items-center rounded-full border-2"
        animate={{
          backgroundColor: on ? hueVar(hue) : "rgba(0,0,0,0)",
          borderColor: on ? hueVar(hue) : "var(--input)",
          scale: on ? [1, 1.18, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {on && (
            <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="text-white">
              <RiCheckLine className="size-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  )
})

function NumberRow({
  hue,
  goal,
  value,
  onChange,
}: {
  hue: Hue
  goal: Goal
  value: number | undefined
  onChange: (n: number | undefined) => void
}) {
  const step = goal.step ?? 1
  const hit = goal.target !== undefined && isHit(goal, { checks: {}, numbers: { [goal.id]: value } })
  const scored = goal.scored && goal.target !== undefined
  const bump = (dir: 1 | -1) => {
    const base = value ?? (goal.compare === "max" ? (goal.target ?? 0) : goal.id === "weight" ? (goal.startValue ?? 0) : 0)
    onChange(Math.max(0, Math.round((base + dir * step) * 100) / 100))
  }
  const id = `num-${goal.id}`

  let status: string | null = null
  if (scored && value !== undefined) {
    const diff = roundTo(Math.abs(goal.target! - value), step)
    if (goal.compare === "min") status = hit ? "Goal hit" : `${formatNumber(diff, goal.unit)} to go`
    else status = hit ? `${formatNumber(diff, goal.unit)} under` : `${formatNumber(diff, goal.unit)} over`
  }
  const progress = scored && value !== undefined ? Math.min(1, value / goal.target!) : 0
  const prefix = goal.unit && ["£", "$", "€", "₹"].includes(goal.unit)

  return (
    <div className="grid gap-2.5 rounded-2xl border border-border px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="grid">
          <span className="font-medium">{goal.label}</span>
          <span className="text-sm text-muted-foreground">
            {goal.id === "weight"
              ? "Morning weigh-in"
              : goal.target !== undefined
                ? `${goal.compare === "max" ? "At most" : "At least"} ${formatNumber(goal.target, goal.unit)}`
                : "Tracked"}
          </span>
        </label>
        <div className="flex items-center gap-1">
          <StepButton label={`Less ${goal.label.toLowerCase()}`} onClick={() => bump(-1)}>
            <RiSubtractLine className="size-4" />
          </StepButton>
          <div className="flex items-baseline gap-1">
            {prefix && <span className="text-sm text-muted-foreground">{goal.unit}</span>}
            <input
              id={id}
              inputMode="decimal"
              value={value ?? ""}
              placeholder="0"
              onChange={(e) => {
                const raw = e.target.value.replace(",", ".")
                if (raw === "") return onChange(undefined)
                const n = Number(raw)
                if (!Number.isNaN(n)) onChange(n)
              }}
              className="w-20 bg-transparent text-end font-display text-2xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50"
            />
            <span className="w-10 text-sm text-muted-foreground">{prefix || goal.unit === "steps" ? "" : goal.unit}</span>
          </div>
          <StepButton label={`More ${goal.label.toLowerCase()}`} onClick={() => bump(1)}>
            <RiAddLine className="size-4" />
          </StepButton>
        </div>
      </div>
      {scored && (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: hueVar(hue) }}
              initial={false}
              animate={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className={cn("w-24 text-end text-sm", hit ? "font-medium text-foreground" : "text-muted-foreground")}>
            {status ?? "Not logged"}
          </span>
        </div>
      )}
    </div>
  )
}

const roundTo = (n: number, step: number) => Math.round(Math.round(n / step) * step * 100) / 100

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      className="grid size-9 place-items-center rounded-full bg-muted text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </motion.button>
  )
}
