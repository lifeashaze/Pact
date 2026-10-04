"use client"

import Link from "next/link"
import { RiArrowLeftLine, RiCheckLine } from "@remixicon/react"

import { cn } from "@workspace/ui/lib/utils"
import { seasonViews } from "@/components/season-views"
import { useSquad } from "@/components/squad-store"

// Every way of drawing "The season", stacked for comparison; two side by side on wide screens
export default function SeasonViewsPage() {
  const { seasonView, setSeasonView } = useSquad()

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-4 sm:px-6 lg:px-10 lg:pt-10 xl:grid-cols-2">
      <Link
        href="/home"
        className="inline-flex h-10 w-fit items-center gap-2 rounded-full pe-3 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring xl:col-span-2"
      >
        <RiArrowLeftLine className="size-5" /> Home
      </Link>
      <header className="px-1 xl:col-span-2">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">Ways to see the season</h1>
        <p className="mt-3 max-w-[60ch] text-muted-foreground">
          Same data, six views. Pick one to put it on the home screen.
        </p>
      </header>

      {seasonViews.map((v, i) => {
        const active = v.id === seasonView
        return (
          <section
            key={v.id}
            aria-labelledby={`view-${v.id}`}
            className={cn("flex min-w-0 flex-col rounded-3xl bg-card p-5 sm:p-6", active && "ring-2 ring-foreground")}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={`view-${v.id}`} className="font-display text-2xl font-semibold tracking-tight">
                  <span className="text-muted-foreground">{i + 1}.</span> {v.name}
                </h2>
                <p className="mt-1 max-w-[56ch] text-sm text-muted-foreground">{v.blurb}</p>
              </div>
              <button
                onClick={() => setSeasonView(v.id)}
                disabled={active}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "bg-muted text-foreground" : "bg-primary text-primary-foreground hover:opacity-90"
                )}
              >
                {active ? (
                  <>
                    <RiCheckLine className="size-4" /> On home
                  </>
                ) : (
                  "Show on home"
                )}
              </button>
            </div>
            <div className="mt-6 xl:my-auto xl:pt-6">
              <v.View />
            </div>
          </section>
        )
      })}
    </div>
  )
}
