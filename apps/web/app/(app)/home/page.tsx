"use client"

import { motion } from "motion/react"

import { headline } from "@/components/home/derive"
import { Latest } from "@/components/home/latest"
import { RecapLink } from "@/components/home/recap-link"
import { SquadToday } from "@/components/home/squad-today"
import { YourDay } from "@/components/home/your-day"
import { SeasonTrack } from "@/components/season-track"
import { useSeason } from "@/components/squad-store"

// Up to xl it reads top to bottom: you, everyone today, the season, then extras.
// Wide screens put the squad and season on the left and your own day on the right.
// "Your day" is rendered once per layout so the tab order always follows what's on screen.
export default function HomePage() {
  const season = useSeason()
  const { date, title } = headline(season)

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pt-6 sm:gap-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_340px] lg:px-10 lg:pt-10">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        // Leaves room for the account photo pinned top-right on small screens
        className="min-w-0 ps-1 pe-14 pb-2 sm:pb-4 lg:pe-1 xl:col-span-2"
      >
        <p className="leading-6 text-muted-foreground">{date}</p>
        <h1 className="mt-1 font-display text-5xl leading-none font-semibold tracking-tight text-balance sm:text-6xl">
          {title}
        </h1>
      </motion.header>

      <YourDay id="your-day-title-sm" index={1} className="xl:hidden" />

      <div className="grid min-w-0 grid-cols-1 content-start gap-4 sm:gap-6">
        <SquadToday index={2} />
        <SeasonTrack index={3} />
      </div>

      <div className="grid min-w-0 grid-cols-1 content-start gap-4 sm:gap-6">
        <YourDay id="your-day-title" index={1} className="max-xl:hidden" />
        <RecapLink index={4} />
        <Latest index={5} />
      </div>
    </div>
  )
}
