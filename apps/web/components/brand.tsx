import { cn } from "@workspace/ui/lib/utils"

// Four friends, one circle: a ring split into the four member colours
const ARCS = ["var(--m-blue)", "var(--m-orange)", "var(--m-aqua)", "var(--m-violet)"]

function arc(i: number, r: number, gapDeg: number) {
  const start = ((i * 90 + gapDeg / 2 - 90) * Math.PI) / 180
  const end = (((i + 1) * 90 - gapDeg / 2 - 90) * Math.PI) / 180
  const x1 = 16 + r * Math.cos(start)
  const y1 = 16 + r * Math.sin(start)
  const x2 = 16 + r * Math.cos(end)
  const y2 = 16 + r * Math.sin(end)
  return `M${x1.toFixed(3)} ${y1.toFixed(3)}A${r} ${r} 0 0 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`
}

export const markArcs = ARCS.map((_, i) => arc(i, 10.5, 26))

export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className={cn("shrink-0", className)}>
      {markArcs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={ARCS[i]} strokeWidth={5.5} strokeLinecap="round" />
      ))}
    </svg>
  )
}

export function Wordmark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark size={size} />
      <span className="font-display text-2xl leading-none font-bold tracking-tight">Pact90</span>
    </span>
  )
}
