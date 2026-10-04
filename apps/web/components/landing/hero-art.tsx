"use client"

import * as React from "react"
import { animate, motion, useInView, useReducedMotion } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"
import { hueTint, hueVar } from "@/components/bits"
import { Lifter, Runner, Shaker, Worker } from "@/components/landing/pictograms"
import type { Hue } from "@/lib/season"

const tiles: { hue: Hue; Figure: (p: { hue: Hue }) => React.JSX.Element; goal: string; week: number }[] = [
  { hue: "blue", Figure: Lifter, goal: "5 workouts a week", week: 4 },
  { hue: "orange", Figure: Runner, goal: "10,000 steps", week: 6 },
  { hue: "aqua", Figure: Shaker, goal: "Protein, 110 g", week: 5 },
  { hue: "violet", Figure: Worker, goal: "2 h deep work", week: 3 },
]

const figurePad = ["pe-[30%] pt-2", "ps-[30%] pt-2", "pe-[30%] pb-2", "ps-[30%] pb-2"]

// The four quadrants of the logo, opened up: one friend per tile, the season in the middle
export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <div className="grid size-full grid-cols-2 grid-rows-2 gap-2.5 sm:gap-3">
        {tiles.map((t, i) => (
          <motion.div
            key={t.hue}
            data-bottom={i >= 2}
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.15 + i * 0.08 }}
            className="relative flex flex-col overflow-hidden data-[bottom=true]:flex-col-reverse rounded-[1.75rem] p-4 sm:rounded-[2.25rem] sm:p-5"
            style={{ background: hueTint(t.hue, 16), ["--tile" as string]: hueTint(t.hue, 16) }}
          >
            {/* Labels sit on the outer edge, figures lean away from the centre dial */}
            <div className={i % 2 === 0 ? "" : "text-end"}>
              <p className="text-xs font-semibold sm:text-sm">{t.goal}</p>
              <WeekDots hue={t.hue} hit={t.week} align={i % 2 === 0 ? "start" : "end"} delay={0.6 + i * 0.1} />
            </div>
            <div className={cn("min-h-0 flex-1", figurePad[i])}>
              <t.Figure hue={t.hue} />
            </div>
          </motion.div>
        ))}
      </div>
      <SeasonDial />
    </div>
  )
}

function WeekDots({ hue, hit, align, delay }: { hue: Hue; hit: number; align: "start" | "end"; delay: number }) {
  return (
    <div className={`mt-1.5 flex gap-1 ${align === "end" ? "justify-end" : ""}`} aria-hidden>
      {Array.from({ length: 7 }, (_, d) => (
        <motion.span
          key={d}
          className="size-2 rounded-full sm:size-2.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 20, delay: delay + d * 0.05 }}
          style={{ background: d < hit ? hueVar(hue) : `color-mix(in oklab, ${hueVar(hue)} 22%, var(--card))` }}
        />
      ))}
    </div>
  )
}

// 1 October to 31 December
const DAYS = 92

// Server and browser trig can differ in the last digits, which breaks hydration
const round = (v: number) => Math.round(v * 100) / 100

// One tick per day of the season, drawn in around the end date
function SeasonDial() {
  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const still = useReducedMotion()
  const [n, setN] = React.useState(0)

  React.useEffect(() => {
    if (!inView) return
    if (still) {
      const id = requestAnimationFrame(() => setN(DAYS))
      return () => cancelAnimationFrame(id)
    }
    const controls = animate(0, DAYS, {
      duration: 1.6,
      delay: 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, still])

  const months = [
    { at: 0, label: "Oct" },
    { at: 31, label: "Nov" },
    { at: 61, label: "Dec" },
  ]

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 18, delay: 0.35 }}
      className="absolute top-1/2 left-1/2 aspect-square w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow-[0_0_0_10px_var(--background),0_24px_48px_-20px_rgb(0_0_0/0.25)] sm:shadow-[0_0_0_12px_var(--background),0_24px_48px_-20px_rgb(0_0_0/0.25)]"
    >
      <svg viewBox="0 0 200 200" className="size-full" role="img" aria-label="Season one, 1 October to 31 December">
        {Array.from({ length: DAYS }, (_, d) => {
          const a = (d / DAYS) * Math.PI * 2 - Math.PI / 2
          const month = months.some((m) => m.at === d)
          const r1 = month ? 76 : 80
          const r2 = 90
          return (
            <line
              key={d}
              x1={round(100 + r1 * Math.cos(a))}
              y1={round(100 + r1 * Math.sin(a))}
              x2={round(100 + r2 * Math.cos(a))}
              y2={round(100 + r2 * Math.sin(a))}
              stroke={d < n ? "var(--foreground)" : "var(--border)"}
              strokeWidth={month ? 3 : 2}
              strokeLinecap="round"
            />
          )
        })}
        {months.map((m) => {
          const a = ((m.at + 4) / DAYS) * Math.PI * 2 - Math.PI / 2
          return (
            <text
              key={m.label}
              x={round(100 + 64 * Math.cos(a))}
              y={round(100 + 64 * Math.sin(a))}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={600}
              fill="var(--muted-foreground)"
            >
              {m.label}
            </text>
          )
        })}
        <text x={100} y={74} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--muted-foreground)">
          Ends
        </text>
        <text
          x={100}
          y={108}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={56}
          fontWeight={700}
          fill="var(--foreground)"
          style={{ fontFamily: "var(--font-display)", fontVariantNumeric: "tabular-nums" }}
        >
          31
        </text>
      </svg>
    </motion.div>
  )
}
