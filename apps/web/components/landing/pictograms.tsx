"use client"

import { motion, useReducedMotion } from "motion/react"

import { hueVar } from "@/components/bits"
import type { Hue } from "@/lib/season"

// Sports-pictogram figures: one stroke weight, round caps, a solid head.
// Each loops a small motion so the hero feels alive without shouting.

const STROKE = 15

type Props = { hue: Hue }

function useLoop(duration: number, times?: number[]) {
  const still = useReducedMotion()
  return still
    ? { duration: 0 }
    : { duration, times, repeat: Infinity, ease: "easeInOut" as const }
}

// Blue: overhead press
export function Lifter({ hue }: Props) {
  const c = hueVar(hue)
  const times = [0, 0.3, 0.55, 0.85, 1]
  const t = useLoop(2.6, times)
  const down = "M70 78 L66 104 L100 76 L134 104 L130 78"
  const up = "M72 24 L74 56 L100 76 L126 56 L128 24"
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="size-full overflow-visible">
      <g stroke={c} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M100 74 L100 120" />
        <path d="M76 178 L100 120 L124 178" />
        <motion.path initial={{ d: down }} animate={{ d: [down, up, up, down, down] }} transition={t} />
      </g>
      <circle cx={100} cy={44} r={15} fill={c} />
      <motion.g initial={{ y: 54 }} animate={{ y: [54, 0, 0, 54, 54] }} transition={t}>
        <path d="M34 24 L166 24" stroke={c} strokeWidth={8} strokeLinecap="round" />
        <rect x={38} y={4} width={13} height={40} rx={4} fill={c} />
        <rect x={149} y={4} width={13} height={40} rx={4} fill={c} />
      </motion.g>
    </svg>
  )
}

// Orange: running, limbs swap each stride
export function Runner({ hue }: Props) {
  const c = hueVar(hue)
  const still = useReducedMotion()
  const stride = still
    ? { duration: 0 }
    : { duration: 0.68, times: [0, 0.25, 0.5, 0.75, 1], repeat: Infinity, ease: "linear" as const }
  const armFront = "M110 72 L130 90 L148 74"
  const armBack = "M110 72 L90 92 L72 96"
  const legFront = "M98 116 L130 130 L126 170"
  const legBack = "M98 116 L84 148 L54 150"
  // Passing poses: the swinging leg tucks up behind, the planted one is straight under the hip
  const legSwing = "M98 116 L120 136 L106 160"
  const legPlant = "M98 116 L98 146 L86 170"
  const armMidA = "M110 72 L114 96 L130 90"
  const armMidB = "M110 72 L98 94 L84 98"
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="size-full overflow-visible">
      <motion.g
        animate={still ? undefined : { y: [0, -5, 0] }}
        transition={still ? undefined : { duration: 0.34, repeat: Infinity, ease: "easeInOut" }}
      >
        <g stroke={c} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <motion.path initial={{ d: armBack }} animate={{ d: [armBack, armMidA, armFront, armMidB, armBack] }} transition={stride} />
          <motion.path initial={{ d: legBack }} animate={{ d: [legBack, legSwing, legFront, legPlant, legBack] }} transition={stride} />
          <path d="M114 64 L98 116" />
          <motion.path initial={{ d: legFront }} animate={{ d: [legFront, legPlant, legBack, legSwing, legFront] }} transition={stride} />
          <motion.path initial={{ d: armFront }} animate={{ d: [armFront, armMidB, armBack, armMidA, armFront] }} transition={stride} />
        </g>
        <circle cx={122} cy={40} r={15} fill={c} />
      </motion.g>
      {/* speed lines */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M${30 - i * 4} ${84 + i * 26} L${52 - i * 4} ${84 + i * 26}`}
          stroke={c}
          strokeWidth={6}
          strokeLinecap="round"
          initial={{ opacity: 0.5 }}
          animate={still ? undefined : { opacity: [0, 0.6, 0], x: [10, -8, -20] }}
          transition={still ? undefined : { duration: 0.9, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
        />
      ))}
    </svg>
  )
}

// Aqua: a protein shake, raised to drink then lowered
export function Shaker({ hue }: Props) {
  const c = hueVar(hue)
  const times = [0, 0.3, 0.62, 0.9, 1]
  const t = useLoop(3.2, times)
  const armDown = "M100 76 L122 100 L124 124"
  const armUp = "M100 76 L134 86 L122 56"
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="size-full overflow-visible">
      <g stroke={c} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M100 74 L100 120" />
        <path d="M82 178 L100 120 L118 178" />
        <path d="M100 76 L80 102 L78 128" />
        <motion.path initial={{ d: armDown }} animate={{ d: [armDown, armUp, armUp, armDown, armDown] }} transition={t} />
      </g>
      <circle cx={100} cy={44} r={15} fill={c} />
      {/* bottle: pivots from the hand */}
      <motion.g
        initial={{ x: 0, y: 0, rotate: 0 }}
        animate={{ x: [0, -4, -4, 0, 0], y: [0, -66, -66, 0, 0], rotate: [0, -128, -128, 0, 0] }}
        transition={t}
        style={{ originX: "130px", originY: "128px", transformBox: "view-box" }}
      >
        <rect x={118} y={112} width={24} height={44} rx={6} fill={c} />
        <rect x={121} y={102} width={18} height={12} rx={3} fill={c} />
        <path d="M118 126 H142" stroke="var(--tile)" strokeWidth={3} />
      </motion.g>
    </svg>
  )
}

// Violet: heads down at the desk, typing in short bursts
export function Worker({ hue }: Props) {
  const c = hueVar(hue)
  const t = useLoop(0.9, [0, 0.25, 0.5, 0.75, 1])
  const rest = "M90 84 L112 106 L140 94"
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="size-full overflow-visible">
      <g stroke={c} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M112 100 L184 100 M172 100 L172 178" />
        <path d="M46 92 L52 140 L94 140 M60 140 L60 178" />
        <path d="M92 72 L80 122 L120 124 L118 176" />
        <motion.path
          initial={{ d: rest }}
          animate={{ d: [rest, "M90 84 L112 105 L140 90", rest, "M90 84 L112 105 L140 92", rest] }}
          transition={t}
        />
      </g>
      <circle cx={98} cy={48} r={15} fill={c} />
      <path d="M130 93 H168" stroke={c} strokeWidth={8} strokeLinecap="round" />
      <path d="M166 93 L178 54" stroke={c} strokeWidth={10} strokeLinecap="round" />
    </svg>
  )
}
