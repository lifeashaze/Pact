"use client"

import { CardHeader, CardLink, HomeCard } from "@/components/home/card"
import { getSeasonView } from "@/components/season-views"
import { useSquad, useSeason } from "@/components/squad-store"

// The home card. Which view it shows is picked on /season
export function SeasonTrack({ index }: { index?: number }) {
  const season = useSeason()
  const { SEASON_DAYS, TODAY } = season
  const { seasonView } = useSquad()
  const view = getSeasonView(seasonView)

  return (
    <HomeCard labelledBy="season-title" index={index}>
      <CardHeader
        id="season-title"
        title="The season"
        description={view.aside}
        action={<CardLink href="/season">Change view</CardLink>}
      />
      <div className="mt-5">
        <view.View />
      </div>
      <p className="sr-only">
        Today is day {TODAY + 1} of {SEASON_DAYS}.
      </p>
    </HomeCard>
  )
}
