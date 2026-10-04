"use client"

import * as React from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { RiAddLine, RiCheckLine, RiSubtractLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"

const round = (n: number) => Math.round(n * 100) / 100

// − value + with a typeable number in the middle
export function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  unit,
  format = (n) => n.toLocaleString("en-GB"),
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step: number
  min: number
  max: number
  unit?: string
  format?: (n: number) => string
}) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const clamp = (n: number) => Math.min(max, Math.max(min, round(n)))
  const prefix = unit && ["£", "$", "€", "₹"].includes(unit)
  return (
    <div className="flex items-center gap-1.5">
      <StepButton label={`Less ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
        <RiSubtractLine className="size-4" />
      </StepButton>
      <label className="flex min-w-24 items-baseline justify-center gap-1">
        <span className="sr-only">{label}</span>
        {prefix && <span className="text-sm text-muted-foreground">{unit}</span>}
        <input
          inputMode="decimal"
          value={draft ?? format(value)}
          onFocus={(e) => {
            setDraft(String(value))
            requestAnimationFrame(() => e.target.select())
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number((draft ?? "").replace(/,/g, "").replace(/[^\d.]/g, ""))
            if (draft !== null && Number.isFinite(n) && draft.trim() !== "") onChange(clamp(n))
            setDraft(null)
          }}
          onKeyDown={(e) => {
            // Enter commits the number; preventDefault stops it also moving onboarding to the next step
            if (e.key !== "Enter") return
            e.preventDefault()
            e.currentTarget.blur()
          }}
          className="w-[5.5ch] bg-transparent text-center font-display text-2xl font-semibold tabular-nums outline-none"
        />
        {unit && !prefix && <span className="text-sm text-muted-foreground">{unit}</span>}
      </label>
      <StepButton label={`More ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
        <RiAddLine className="size-4" />
      </StepButton>
    </div>
  )
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.88 }}
      className="grid size-10 place-items-center rounded-full bg-muted text-foreground transition-[opacity,background-color] enabled:hover:bg-foreground/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {children}
    </motion.button>
  )
}

const ARROWS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

export function Segmented<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  id: string
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  size?: "sm" | "md"
}) {
  return (
    <LayoutGroup id={id}>
      {/* Arrow keys move the choice, like native radios; only the chosen one is in the tab order */}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-1 rounded-full bg-muted p-1"
        onKeyDown={(e) => {
          const d = ARROWS[e.key]
          if (!d) return
          e.preventDefault()
          const i = (options.findIndex((o) => o.value === value) + d + options.length) % options.length
          const target = e.currentTarget.children[i] as HTMLElement | undefined
          onChange(options[i]!.value)
          target?.focus()
        }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            tabIndex={value === o.value ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex-1 rounded-full px-3 font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-checked:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              size === "sm" ? "h-8 text-xs" : "h-10 text-sm"
            )}
          >
            {value === o.value && <motion.span layoutId="pill" className="absolute inset-0 rounded-full bg-card shadow-sm" />}
            <span className="relative">{o.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  )
}

// A round tick that pops when switched on
export function Tick({ on, color }: { on: boolean; color: string }) {
  return (
    <motion.span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-full border-2"
      animate={{ backgroundColor: on ? color : "rgba(0,0,0,0)", borderColor: on ? color : "var(--input)", scale: on ? [1, 1.15, 1] : 1 }}
      transition={{ duration: 0.25 }}
    >
      <AnimatePresence>
        {on && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="text-white">
            <RiCheckLine className="size-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.span>
  )
}
