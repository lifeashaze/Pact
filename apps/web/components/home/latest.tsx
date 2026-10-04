"use client"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar } from "@/components/bits"
import { useDayName } from "@/components/feed-item"
import { CardHeader, CardLink, HomeCard } from "@/components/home/card"
import { seasonPhase } from "@/components/home/derive"
import { useSquad, useSeason } from "@/components/squad-store"
import type { FeedItem } from "@/lib/feed"

// Three on phones, four on bigger screens (two by two when the card is wide)
const LIMIT = 4

// Today's items just show the time; older ones say which day
const when = (item: FeedItem, today: number, dayName: (d: number) => string) =>
  item.day === today ? item.time : `${dayName(item.day)}, ${item.time}`

// The last few things that happened, in a compact list. The full feed has reactions and comments
export function Latest({ index }: { index?: number }) {
  const season = useSeason()
  const { feed } = useSquad()
  const items = feed.slice(0, LIMIT)
  const phase = seasonPhase(season)

  return (
    <HomeCard labelledBy="latest-title" index={index}>
      <CardHeader id="latest-title" title="Latest" action={items.length > 0 && <CardLink href="/feed">See all</CardLink>} />
      {items.length > 0 ? (
        // Rows pad themselves top and bottom; the negative margin takes that back off the ends
        <ul className="mt-1 -mb-3 grid grid-cols-1 @xl:grid-cols-2 @xl:gap-x-8">
          {items.map((item, i) => (
            <LatestRow key={item.id} item={item} className={cn(i >= 3 && "max-sm:hidden")} />
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {phase === "before"
            ? "Workouts, perfect days and streaks will show up here once things kick off."
            : "Nothing yet today. Workouts, perfect days and streaks show up here."}
        </p>
      )}
    </HomeCard>
  )
}

function LatestRow({ item, className }: { item: FeedItem; className?: string }) {
  const { getMember } = useSquad()
  const { TODAY } = useSeason()
  const dayName = useDayName()
  const member = getMember(item.memberId)
  if (!member) return null
  return (
    <li className={cn("flex gap-3 border-t border-border py-3 first:border-t-0 @xl:nth-2:border-t-0", className)}>
      <Avatar member={member} size={36} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="truncate font-semibold">{member.isYou ? "You" : member.name}</span>
          <time className="shrink-0 text-muted-foreground tabular-nums">{when(item, TODAY, dayName)}</time>
        </div>
        <p className="font-display text-lg leading-6 font-semibold text-balance">{item.title}</p>
        {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
      </div>
    </li>
  )
}
