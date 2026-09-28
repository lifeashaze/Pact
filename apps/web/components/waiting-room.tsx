"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"

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
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center py-12">
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
            <h1 className="mt-8 font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance">
              This pact is closed for now.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Sorry, {first}. Season one is limited to a small group that already knows each other. If you think
              that&apos;s a mistake, ask the person who sent you the link.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-8 font-display text-5xl leading-[0.95] font-bold tracking-tight text-balance">
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

      <div className="grid gap-2">
        {!rejected && (
          <button
            type="button"
            onClick={() => startCheck(() => router.refresh())}
            disabled={checking}
            className="h-13 rounded-full bg-primary font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {checking ? "Checking" : "Check again"}
          </button>
        )}
        <button
          type="button"
          onClick={signOut}
          disabled={pending}
          className="h-12 rounded-full font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {pending ? "Signing out" : "Sign out"}
        </button>
      </div>
    </div>
  )
}
