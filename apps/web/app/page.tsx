import { Wordmark } from "@/components/brand"
import { GoogleButton } from "@/components/google-button"
import { CountdownDigits, SeasonLine } from "@/components/landing/countdown"
import { HeroArt } from "@/components/landing/hero-art"
import { LandingNav } from "@/components/landing/nav"
import { FeedPreview, Showcase } from "@/components/landing/showcase"
import {
  GoalPicker,
  MiniCheckIn,
  MiniStandings,
} from "@/components/landing/steps"
import { Reveal } from "@/components/landing/reveal"
import { DemoSquad } from "@/components/landing/demo-squad"

const steps = [
  {
    title: "Pick goals that are yours",
    body: "Diet, training, sleep, anything you can count or tick off. Everyone sets their own targets, so nobody has to copy anybody.",
    Visual: GoalPicker,
  },
  {
    title: "Check in once a day",
    body: "Flip the switches, type the numbers, done. It takes about twenty seconds and shows up for the squad straight away.",
    Visual: MiniCheckIn,
  },
  {
    title: "See where everyone stands",
    body: "Standings re-sort as the week goes. You're ranked on the share of your own goals you hit, so a four-workout plan and a six-workout plan compete fairly.",
    Visual: MiniStandings,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-svh overflow-x-clip">
      <LandingNav />

      <DemoSquad>
        <main>
          {/* Hero */}
          <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-28">
            <div className="max-w-xl">
              <Reveal>
                <h1 className="font-display text-[clamp(3.25rem,9vw,5.75rem)] leading-[0.9] font-bold tracking-tight text-balance">
                  Lock in for the last 92 days of the year.
                </h1>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  Pact90 is a shared scoreboard for you and your friends. Pick
                  your own goals for diet, training and habits, check in once a
                  day, and watch everyone&apos;s numbers from 1 October to 31
                  December.
                </p>
              </Reveal>
              <Reveal
                delay={0.16}
                className="mt-9 grid justify-items-start gap-4"
              >
                <GoogleButton label="Start with Google" />
                <SeasonLine className="text-sm text-muted-foreground" />
              </Reveal>
            </div>
            <HeroArt />
          </section>

          {/* How it works */}
          <section aria-labelledby="how" className="border-t border-border">
            <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
              <Reveal>
                <h2
                  id="how"
                  className="max-w-[18ch] font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance sm:text-6xl"
                >
                  A minute a day, for three months, with everyone watching.
                </h2>
              </Reveal>
              <ol className="mt-14 grid gap-16 lg:mt-20 lg:gap-24">
                {steps.map((s, i) => (
                  <li
                    key={s.title}
                    className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16"
                  >
                    <Reveal className={i % 2 === 1 ? "lg:order-2" : ""}>
                      <span className="font-display text-7xl leading-none font-bold text-muted-foreground/40 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="mt-3 font-display text-4xl leading-none font-semibold tracking-tight">
                        {s.title}
                      </h3>
                      <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    </Reveal>
                    <Reveal delay={0.1} className="mx-auto w-full max-w-md">
                      <s.Visual />
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Real charts */}
          <section aria-labelledby="charts" className="bg-muted/60">
            <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
              <Reveal className="mb-10 grid gap-4 lg:mb-14 lg:grid-cols-2 lg:items-end">
                <h2
                  id="charts"
                  className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl"
                >
                  Every number, charted.
                </h2>
                <p className="max-w-[46ch] text-lg leading-relaxed text-muted-foreground lg:justify-self-end">
                  These are the real app screens, running on a made-up squad of
                  four. Hover the charts to read any day.
                </p>
              </Reveal>
              <Showcase />
            </div>
          </section>

          {/* The squad */}
          <section aria-labelledby="squad">
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
              <Reveal>
                <h2
                  id="squad"
                  className="font-display text-5xl leading-[0.95] font-bold tracking-tight sm:text-6xl"
                >
                  Made for a handful of friends.
                </h2>
                <ul className="mt-8 grid gap-5 text-lg leading-relaxed">
                  <li>
                    <strong className="font-semibold">
                      Every check-in lands in the feed.
                    </strong>{" "}
                    <span className="text-muted-foreground">
                      React, leave a comment, keep each other honest.
                    </span>
                  </li>
                  <li>
                    <strong className="font-semibold">
                      A nudge, not a nag.
                    </strong>{" "}
                    <span className="text-muted-foreground">
                      One tap tells a friend the squad noticed they haven&apos;t
                      checked in.
                    </span>
                  </li>
                  <li>
                    <strong className="font-semibold">
                      A recap every Monday.
                    </strong>{" "}
                    <span className="text-muted-foreground">
                      Who won the week, who dropped the most, and who&apos;s
                      buying coffee.
                    </span>
                  </li>
                </ul>
              </Reveal>
              <Reveal delay={0.1} className="rounded-3xl bg-card p-5 sm:p-7">
                <FeedPreview />
              </Reveal>
            </div>
          </section>

          {/* Countdown */}
          <section aria-labelledby="start" className="border-t border-border">
            <div className="mx-auto grid max-w-6xl justify-items-center px-5 py-20 text-center sm:px-8 lg:py-28">
              <Reveal className="grid justify-items-center">
                <h2
                  id="start"
                  className="max-w-[16ch] font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance sm:text-7xl"
                >
                  Season one starts Thursday.
                </h2>
                <p className="mt-5 max-w-[48ch] text-lg text-muted-foreground">
                  Sign in now and your spot is saved. While season one runs, new
                  people are let in by hand.
                </p>
              </Reveal>
              <Reveal delay={0.08} className="mt-10">
                <CountdownDigits />
              </Reveal>
              <Reveal delay={0.16} className="mt-10">
                <GoogleButton label="Join with Google" />
              </Reveal>
            </div>
          </section>
        </main>
      </DemoSquad>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:px-8">
          <Wordmark size={22} className="text-foreground" />
          <p>1 October to 31 December 2026</p>
        </div>
      </footer>
    </div>
  )
}
