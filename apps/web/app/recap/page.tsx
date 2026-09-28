"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { RiCloseLine } from "@remixicon/react"

import { Avatar, CountUp, hueTint, hueVar, pct } from "@/components/bits"
import { useSquad, useSeason } from "@/components/squad-store"
import { type Member, weightSeries } from "@/lib/season"

const SLIDE_MS = 5000

export default function RecapPage() {
  const { TODAY, weekDays, weekOf, weekLabel, workoutsInWeek, weekScore } = useSeason()
  const { logs, members } = useSquad()
  const router = useRouter()
  const reduce = useReducedMotion()
  const week = weekOf(TODAY) - 1
  const { start, end } = weekDays(week)

  const scores = members
    .map((m) => ({ m, score: weekScore(m, logs[m.id]!, week) }))
    .sort((a, b) => b.score - a.score)
  const squad = scores.reduce((s, x) => s + x.score, 0) / scores.length
  const workouts = members
    .filter((m) => m.goals.some((g) => g.weekly))
    .map((m) => ({ m, n: workoutsInWeek(logs[m.id] ?? [], week) }))
    .filter((w) => w.n > 0)
    .sort((a, b) => b.n - a.n)
  // Members sharing change only arrive in percent; everyone else in kilos
  const drops = members
    .filter((m) => m.startWeight !== undefined)
    .map((m) => {
      const s = weightSeries(logs[m.id] ?? [])
      const before = s[Math.max(0, start - 1)]?.avg
      const after = s[end]?.avg
      const unit = m.goals.find((g) => g.id === "weight")?.unit === "%" ? "%" : "kg"
      return { m, unit, drop: before !== undefined && after !== undefined ? before - after : 0 }
    })
    .filter((d) => d.drop > 0.05)
    .sort((a, b) => b.drop - a.drop)
  const winner = scores[0]!
  const second = scores[1]
  // Margin in percentage points; a near-tie gets its own wording
  const margin = second ? (winner.score - second.score) * 100 : 0
  const runnerUp = second ? (second.m.isYou ? "you" : second.m.name) : ""

  type Slide = { hue?: Member["hue"]; body: React.ReactNode }
  const slides = ([
    {
      body: (
        <>
          <Kicker>Week {week + 1} recap</Kicker>
          <Big>{weekLabel(week)}</Big>
          <p className="mt-10 text-lg text-muted-foreground">As a squad you hit</p>
          <p className="font-display text-8xl leading-none font-semibold">
            <CountUp value={squad} format={pct} />
          </p>
          <p className="text-lg text-muted-foreground">of your goals</p>
        </>
      ),
    },
    second && {
      hue: winner.m.hue,
      body: (
        <>
          <Kicker>Won the week</Kicker>
          <Hero member={winner.m} />
          <Big>{winner.m.isYou ? "You" : winner.m.name}</Big>
          <p className="mt-2 text-xl">
            <CountUp value={winner.score} format={pct} /> hit rate,{" "}
            {margin < 1
              ? `just edging out ${runnerUp}`
              : `${Math.round(margin)} ${Math.round(margin) === 1 ? "point" : "points"} ahead of ${runnerUp}`}
          </p>
        </>
      ),
    },
    workouts[0] && {
      hue: workouts[0]!.m.hue,
      body: (
        <>
          <Kicker>Most workouts</Kicker>
          <Hero member={workouts[0]!.m} />
          <Big>{workouts[0]!.m.isYou ? "You" : workouts[0]!.m.name}</Big>
          <p className="mt-2 text-xl">
            <CountUp value={workouts[0]!.n} /> sessions in 7 days
          </p>
        </>
      ),
    },
    drops[0] && {
      hue: drops[0]!.m.hue,
      body: (
        <>
          <Kicker>Biggest drop</Kicker>
          <Hero member={drops[0]!.m} />
          <Big>{drops[0]!.m.isYou ? "You" : drops[0]!.m.name}</Big>
          <p className="mt-2 text-xl">
            <CountUp value={drops[0]!.drop} format={(n) => `−${n.toFixed(1)} ${drops[0]!.unit}`} /> on the 7-day average
          </p>
        </>
      ),
    },
    {
      body: (
        <>
          <Kicker>Final table</Kicker>
          <ol className="mt-6 grid w-full max-w-sm gap-3">
            {scores.map((s, i) => (
              <motion.li
                key={s.m.id}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.12 }}
                className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-start"
              >
                <span className="w-5 font-display text-2xl font-semibold text-muted-foreground">{i + 1}</span>
                <Avatar member={s.m} size={36} />
                <span className="flex-1 font-semibold">{s.m.isYou ? "You" : s.m.name}</span>
                <span className="font-display text-2xl font-semibold">{pct(s.score)}</span>
              </motion.li>
            ))}
          </ol>
        </>
      ),
    },
    {
      body: (
        <>
          <Kicker>Week {week + 2} is underway</Kicker>
          <Big>Same again. Better.</Big>
          <Link
            href="/home"
            className="mt-10 inline-flex h-13 items-center rounded-full bg-primary px-7 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Back to the squad
          </Link>
        </>
      ),
    },
  ] as (Slide | false | undefined)[]).filter((x): x is Slide => !!x)

  const [index, setIndex] = React.useState(0)
  const [dir, setDir] = React.useState(1)
  const go = React.useCallback(
    (n: number) => {
      if (n < 0) return
      if (n >= slides.length) return router.push("/home")
      setDir(n > index ? 1 : -1)
      setIndex(n)
    },
    [index, slides.length, router]
  )

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1)
      if (e.key === "ArrowLeft") go(index - 1)
      if (e.key === "Escape") router.push("/home")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, index, router])

  const slide = slides[index]!
  const lastSlide = index === slides.length - 1

  if (week < 0) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 text-center">
        <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight">No recap yet</h1>
        <p className="mt-4 text-lg text-muted-foreground">The first one lands when week 1 wraps up.</p>
        <Link href="/home" className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">
          Back to the squad
        </Link>
      </main>
    )
  }

  return (
    <motion.div
      className="relative flex min-h-svh flex-col overflow-hidden"
      animate={{ backgroundColor: slide.hue ? hueTint(slide.hue, 18) : "var(--background)" }}
      transition={{ duration: 0.5 }}
    >
      {/* Progress segments; the current one fills over five seconds and advances */}
      <div className="relative z-10 flex gap-1.5 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/15">
            {i < index && <div className="h-full w-full bg-foreground" />}
            {i === index && (
              <motion.div
                key={index}
                className="h-full bg-foreground"
                initial={{ width: reduce || lastSlide ? "100%" : "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: reduce || lastSlide ? 0 : SLIDE_MS / 1000, ease: "linear" }}
                onAnimationComplete={() => !reduce && !lastSlide && go(index + 1)}
              />
            )}
          </div>
        ))}
      </div>
      <div className="relative z-10 flex items-center justify-between px-4 pt-3">
        <span className="font-display text-lg font-semibold">Pact90</span>
        <Link
          href="/home"
          aria-label="Close recap"
          className="grid size-10 place-items-center rounded-full bg-foreground/10 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RiCloseLine className="size-5" />
        </Link>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 pb-16">
        {/* Tap zones: left half goes back, right half goes forward */}
        {!lastSlide && (
          <>
            <button aria-label="Previous" className="absolute inset-y-0 start-0 w-1/3" onClick={() => go(index - 1)} />
            <button aria-label="Next" className="absolute inset-y-0 end-0 w-2/3" onClick={() => go(index + 1)} />
          </>
        )}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 60, scale: 0.97 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (d: number) => ({ opacity: 0, x: d * -60, scale: 0.97 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="pointer-events-none flex w-full max-w-lg flex-col items-center text-center [&_a]:pointer-events-auto"
            aria-live="polite"
          >
            {slide.body}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-lg font-medium text-muted-foreground">{children}</p>
}

function Big({ children }: { children: React.ReactNode }) {
  return <h1 className="mt-2 font-display text-6xl leading-none font-semibold tracking-tight text-balance sm:text-7xl">{children}</h1>
}

function Hero({ member }: { member: Member }) {
  return (
    <motion.div
      initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
      className="mt-8 mb-4 rounded-full p-2"
      style={{ boxShadow: `0 0 0 6px ${hueVar(member.hue)}` }}
    >
      <Avatar member={member} size={120} />
    </motion.div>
  )
}
