"use client"

import * as React from "react"
import { motion } from "motion/react"

import { Avatar, hueTint } from "@/components/bits"
import { SquadLines, WeightChart } from "@/components/charts"
import { getSeasonView } from "@/components/season-views"
import { useSeason, useSquad } from "@/components/squad-store"
import { demoMembers } from "@/lib/demo"

// The real app components, running on the sample squad. Links inside are
// disabled here so a stray click doesn't bounce people to sign-in
function Preview({ children }: { children: React.ReactNode }) {
  return (
    <div
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a")) e.preventDefault()
      }}
    >
      {children}
    </div>
  )
}

function Panel({
  title,
  note,
  children,
  className,
}: {
  title: string
  note: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className={`min-w-0 rounded-3xl bg-card p-5 sm:p-6 ${className ?? ""}`}
    >
      <h3 className="font-display text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mb-5 text-sm text-muted-foreground">{note}</p>
      <Preview>{children}</Preview>
    </motion.section>
  )
}

export function Showcase() {
  const { TODAY, weekOf, weekScore } = useSeason()
  const { logs, members, you } = useSquad()
  const week = weekOf(TODAY)
  const Race = getSeasonView("race").View
  const hitRate = members.map((m) => ({
    member: m,
    values: Array.from({ length: week + 1 }, (_, w) => weekScore(m, logs[m.id]!, w) * 100),
  }))

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel
        className="lg:col-span-2"
        title="The race to 31 December"
        note="A perfect day moves you one step. The line is the most anyone could have by today."
      >
        <Race />
      </Panel>
      <Panel title="Weekly hit rate" note="Everyone's goals are different, so you're ranked on the share of your own goals you hit.">
        <SquadLines
          series={hitRate}
          label="Each person's weekly hit rate"
          xLabel={(i) => `Week ${i + 1}`}
          xTicks={Array.from({ length: week + 1 }, (_, i) => i).filter((i) => i % 2 === 0 || i === week)}
          format={(v) => `${Math.round(v)}%`}
          height={220}
        />
      </Panel>
      <Panel title="Weight, smoothed" note="Daily weigh-ins as dots, the 7-day average as the line. You choose whether the squad sees kilos.">
        <WeightChart member={you} logs={logs[you.id]!} />
      </Panel>
    </div>
  )
}

const feed = [
  { who: 1, when: "6:48 am", title: "Leg day, 5 of 5 goals", reactions: ["🔥 3", "💪 1"], comment: { who: 0, text: "Early. Respect." } },
  { who: 2, when: "9:12 pm", title: "14-day check-in streak", reactions: ["👏 3"] },
  { who: 3, when: "10:05 pm", title: "Down 2 kg since 1 October", reactions: ["🔥 2", "😤 1"] },
]

// A static slice of the feed, since the real one links into the app
export function FeedPreview() {
  const members = demoMembers()
  return (
    <ul className="grid gap-5">
      {feed.map((f, i) => {
        const m = members[f.who]!
        const c = f.comment ? members[f.comment.who]! : null
        return (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ type: "spring", stiffness: 260, damping: 26, delay: i * 0.08 }}
            className="flex gap-3"
          >
            <Avatar member={m} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{m.name}</span> today at {f.when}
              </p>
              <p className="mt-0.5 font-display text-xl leading-snug font-semibold">{f.title}</p>
              {c && f.comment && (
                <p className="mt-2 w-fit rounded-2xl rounded-tl-md px-3 py-1.5 text-sm" style={{ background: hueTint(c.hue, 12) }}>
                  <span className="font-semibold">{c.name}</span> {f.comment.text}
                </p>
              )}
              <div className="mt-2 flex gap-1.5">
                {f.reactions.map((r) => (
                  <span key={r} className="rounded-full bg-muted px-2.5 py-1 text-sm tabular-nums">
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </motion.li>
        )
      })}
    </ul>
  )
}
