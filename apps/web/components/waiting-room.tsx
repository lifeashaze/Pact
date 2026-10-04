"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import { RiCheckLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { type ShellViewer, ViewerPhoto, useSignOut } from "@/components/account-menu"
import { markArcs } from "@/components/brand"

const ARC_COLOURS = ["var(--m-blue)", "var(--m-orange)", "var(--m-aqua)", "var(--m-violet)"]

// Pending people see this until an admin lets them in. It re-checks when the tab regains focus
export function WaitingRoom({ viewer, rejected }: { viewer: ShellViewer; rejected: boolean }) {
  const router = useRouter()
  const still = useReducedMotion()
  const { signOut, pending } = useSignOut()
  const [checking, startCheck] = React.useTransition()
  const first = viewer.name.split(/\s+/)[0]

  React.useEffect(() => {
    if (rejected) return
    const onFocus = () => router.refresh()
    window.addEventListener("focus", onFocus)
    const id = setInterval(onFocus, 30_000)
    return () => {
      window.removeEventListener("focus", onFocus)
      clearInterval(id)
    }
  }, [rejected, router])

  return (
    <div
      className={cn(
        "flex flex-1 flex-col lg:grid lg:items-center lg:gap-16 xl:gap-24",
        !rejected && "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
      )}
    >
      <div className="flex flex-1 flex-col lg:max-w-xl lg:flex-none">
        <div className="flex flex-1 flex-col justify-center py-12 lg:flex-none">
          <div className="relative size-32">
            <motion.svg
              viewBox="0 0 32 32"
              className="absolute inset-0 size-full"
              aria-hidden
              animate={rejected || still ? undefined : { rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            >
              {markArcs.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={rejected ? "var(--border)" : ARC_COLOURS[i]}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              ))}
            </motion.svg>
            <div className="absolute inset-[18%]">
              <ViewerPhoto viewer={viewer} size={83} className="size-full" />
            </div>
          </div>

          {rejected ? (
            <>
              <h1 className="mt-8 font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance lg:text-6xl">
                This pact is closed for now.
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Sorry, {first}. Season one is limited to a small group that already knows each other. If you think
                that&apos;s a mistake, ask the person who sent you the link.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-8 font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance lg:text-6xl">
                You&apos;re on the list, {first}.
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Your profile is set up. Someone lets new people in by hand, usually the same day. This page opens the app
                by itself once you&apos;re approved.
              </p>
            </>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{viewer.email}</span>
          </p>
        </div>

        {/* Full-width at the thumb on phones, inline under the copy on desktop */}
        <div className="grid gap-2 lg:mt-10 lg:flex lg:items-center lg:gap-3">
          {!rejected && (
            <button
              type="button"
              onClick={() => startCheck(() => router.refresh())}
              disabled={checking}
              className="h-13 rounded-full bg-primary font-semibold text-primary-foreground transition-[transform,background-color] enabled:hover:bg-primary/90 active:scale-[0.98] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:px-8"
            >
              {checking ? "Checking" : "Check again"}
            </button>
          )}
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="h-12 rounded-full font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-ring lg:px-6 lg:hover:bg-muted"
          >
            {pending ? "Signing out" : "Sign out"}
          </button>
        </div>
      </div>

      {!rejected && <NextSteps />}
    </div>
  )
}

// Desktop only: what the rest of the way in looks like
function NextSteps() {
  const steps = [
    { title: "Signed in with Google", detail: "Your profile is ready.", state: "done" },
    { title: "Someone lets you in", detail: "Usually the same day. Nothing to do but wait.", state: "now" },
    { title: "Pick your goals", detail: "About two minutes, then you're on the scoreboard.", state: "next" },
  ] as const
  return (
    <section aria-labelledby="next-steps" className="hidden rounded-3xl bg-card p-7 lg:block xl:p-8">
      <h2 id="next-steps" className="font-display text-2xl font-semibold tracking-tight">
        What happens next
      </h2>
      <ol className="mt-6 grid gap-6">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span
              className={cn(
                "relative grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums",
                s.state === "done" && "bg-primary text-primary-foreground",
                s.state === "now" && "bg-muted text-foreground",
                s.state === "next" && "border border-border text-muted-foreground"
              )}
            >
              {s.state === "done" ? <RiCheckLine className="size-4" aria-label="Done" /> : i + 1}
              {s.state === "now" && (
                <span aria-hidden className="absolute -inset-1 animate-pulse rounded-full border-2 border-[var(--m-orange)] motion-reduce:animate-none" />
              )}
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn("font-semibold leading-tight", s.state === "next" && "text-muted-foreground")}>{s.title}</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
        This page checks every 30 seconds, and again whenever you come back to the tab.
      </p>
    </section>
  )
}
