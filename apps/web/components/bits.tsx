"use client"

import * as React from "react"
import { animate, useInView, useReducedMotion } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"
import type { Hue, Member } from "@/lib/season"

export const hueVar = (hue: Hue) => `var(--m-${hue})`

// A tint of the member's colour mixed into the card surface
export const hueTint = (hue: Hue, pct: number) =>
  `color-mix(in oklab, var(--m-${hue}) ${pct}%, var(--card))`

// Identity comes from the coloured ring and tint; initials stay in text ink
export function Avatar({
  member,
  size = 40,
  className,
}: {
  member: Member
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-display font-semibold text-foreground",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: hueTint(member.hue, 22),
        boxShadow: `inset 0 0 0 2px ${hueVar(member.hue)}`,
      }}
    >
      {member.initials}
    </span>
  )
}

// Counts up to a value the first time it scrolls into view, and animates between values after
export function CountUp({
  value,
  format = (n) => Math.round(n).toString(),
  className,
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const from = React.useRef(0)

  React.useEffect(() => {
    const node = ref.current
    if (!node || !inView) return
    if (reduce) {
      node.textContent = format(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => {
        node.textContent = format(n)
      },
    })
    from.current = value
    return () => controls.stop()
  }, [value, inView, reduce, format])

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : 0)}
    </span>
  )
}

export const pct = (n: number) => `${Math.round(n * 100)}%`

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  )
}
