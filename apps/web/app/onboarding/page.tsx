import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { and, eq, ne } from "drizzle-orm"

import { Onboarding, type OnboardingGoal } from "@/components/onboarding/onboarding"
import { db } from "@/lib/db"
import { profiles, squadMembers } from "@/lib/db/schema"
import { activeGoals, ensureMembership, todayIndex } from "@/lib/squad-data"
import { requireApproved } from "@/lib/viewer"

export const metadata: Metadata = { title: "Set up, Pact90" }

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const viewer = await requireApproved()
  const { squad, member } = await ensureMembership(viewer)
  const { edit } = await searchParams
  if (member.onboardedAt && !edit) redirect("/home")

  const [goals, others] = await Promise.all([
    activeGoals(viewer.userId, squad.id),
    db
      .select({ hue: squadMembers.hue, name: squadMembers.displayName, fallback: profiles.name })
      .from(squadMembers)
      .innerJoin(profiles, eq(profiles.userId, squadMembers.userId))
      .where(and(eq(squadMembers.squadId, squad.id), ne(squadMembers.userId, viewer.userId), eq(profiles.status, "approved"))),
  ])

  const initialGoals: OnboardingGoal[] = goals.map((g) => ({
    module: g.module,
    metric: g.metric,
    label: g.label,
    target: g.target,
    weeklyTarget: g.weeklyTarget,
    startValue: g.startValue,
    unit: g.unit,
    visibility: g.visibility,
  }))

  return (
    <Onboarding
      editing={!!member.onboardedAt}
      name={member.displayName || viewer.name}
      image={viewer.image}
      hue={member.hue}
      taken={others.map((o) => ({ hue: o.hue, name: o.name || o.fallback }))}
      goals={initialGoals}
      startsOn={squad.startsOn}
      started={todayIndex(squad.startsOn, viewer.timeZone) >= 0}
    />
  )
}
