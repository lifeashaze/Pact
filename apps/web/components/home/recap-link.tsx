"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { RiArrowRightSLine } from "@remixicon/react"

import { Avatar } from "@/components/bits"
import { recapWeek } from "@/components/home/derive"
import { useSeason, useSquad } from "@/components/squad-store"

const MAX_FACES = 4

// A way into last week's story. Doesn't give away the winner
export function RecapLink({ index = 0 }: { index?: number }) {
  const { members } = useSquad()
  const season = useSeason()
  const week = recapWeek(season)
  if (!week) return null
  const faces = members.slice(0, MAX_FACES)
  const extra = members.length - faces.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.04 + index * 0.05 }}
    >
      <Link
        href="/recap"
        className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-3xl bg-card p-5 transition-colors hover:bg-card/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-6"
      >
        <span className="min-w-0 truncate font-display text-2xl leading-8 font-semibold tracking-tight">
          Week {week.number} recap
        </span>
        <span className="flex items-center gap-2">
          <span className="flex" aria-hidden>
            {faces.map((m, i) => (
              <span key={m.id} className="rounded-full ring-2 ring-card" style={{ marginInlineStart: i ? -6 : 0 }}>
                <Avatar member={m} size={28} />
              </span>
            ))}
            {extra > 0 && (
              <span className="-ms-1.5 grid size-7 place-items-center rounded-full bg-muted text-xs font-semibold ring-2 ring-card tabular-nums">
                +{extra}
              </span>
            )}
          </span>
          <RiArrowRightSLine
            aria-hidden
            className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </span>
        <span className="col-span-2 text-sm text-muted-foreground">Who won {week.label}, and by how much</span>
      </Link>
    </motion.div>
  )
}
