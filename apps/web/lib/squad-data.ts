import "server-only"

import { redirect } from "next/navigation"
import { and, asc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "@/lib/db"
import { checkIns, comments, entries, goals, nudges, profiles, reactions, squadMembers, squads } from "@/lib/db/schema"
import { getModule } from "@/lib/modules"
import {
  type DayLog,
  type Goal,
  HUES,
  type Hue,
  type Member,
  type SeasonInfo,
  dayIndex,
  goalKey,
  initialsOf,
  isoDay,
} from "@/lib/season"
import { type Profile } from "@/lib/db/schema"
import { requireApproved } from "@/lib/viewer"

export type Membership = {
  squad: typeof squads.$inferSelect
  member: typeof squadMembers.$inferSelect
}

// Everyone approved belongs to the one season squad. Joining happens on approval,
// and here as a fallback (admins are approved without going through the portal)
export async function ensureMembership(profile: Pick<Profile, "userId" | "name">): Promise<Membership> {
  const [existing] = await db
    .select({ squad: squads, member: squadMembers })
    .from(squadMembers)
    .innerJoin(squads, eq(squads.id, squadMembers.squadId))
    .where(eq(squadMembers.userId, profile.userId))
    .limit(1)
  if (existing) return existing

  const [squad] = await db.select().from(squads).orderBy(asc(squads.createdAt)).limit(1)
  if (!squad) throw new Error("No squad exists. Run the migrations.")
  const taken = await db.select({ hue: squadMembers.hue }).from(squadMembers).where(eq(squadMembers.squadId, squad.id))
  const hue = HUES.find((h) => !taken.some((t) => t.hue === h)) ?? HUES[taken.length % HUES.length]!
  await db.insert(squadMembers).values({ squadId: squad.id, userId: profile.userId, hue }).onConflictDoNothing()
  const [member] = await db
    .select()
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, squad.id), eq(squadMembers.userId, profile.userId)))
  return { squad, member: member! }
}

// For app pages: approved, in the squad, and finished onboarding
export async function requireMember() {
  const viewer = await requireApproved()
  const membership = await ensureMembership(viewer)
  if (!membership.member.onboardedAt) redirect("/onboarding")
  return { viewer, ...membership }
}

// The viewer's today. In development PACT_TODAY=YYYY-MM-DD pins the date so
// mid-season screens can be checked before the season exists
export function todayIndex(startsOn: string, timeZone: string) {
  const pinned = process.env.NODE_ENV === "development" ? process.env.PACT_TODAY : undefined
  if (pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned)) {
    return Math.round((Date.parse(pinned) - Date.parse(startsOn)) / 86_400_000)
  }
  return dayIndex(startsOn, new Date(), timeZone)
}

export type SquadSnapshot = {
  squad: { id: string; name: string }
  season: SeasonInfo
  viewerId: string
  members: Member[]
  // null where nobody checked in; JSON has no undefined
  logs: Record<string, (DayLog | null)[]>
  reactions: { eventId: string; userId: string; emoji: string }[]
  comments: { id: string; eventId: string; userId: string; body: string; createdAt: string }[]
  // Nudges sent today, as [from, to]
  nudges: [string, string][]
}

type GoalRow = typeof goals.$inferSelect

function toGoal(row: GoalRow): Goal {
  const mod = getModule(row.module)
  return {
    id: goalKey(row.module, row.metric),
    dbId: row.id,
    module: row.module,
    label: row.label,
    category: mod?.name ?? row.module,
    kind: row.kind,
    unit: row.unit ?? undefined,
    target: row.target ?? undefined,
    compare: row.compare ?? undefined,
    step: row.step ?? undefined,
    weekly: row.weeklyTarget ?? undefined,
    startValue: row.startValue ?? undefined,
    scored: row.scored,
    visibility: row.visibility,
  }
}

const hitOf = (g: Goal, value: number | undefined) =>
  value !== undefined && g.target !== undefined && (g.compare === "max" ? value <= g.target : value >= g.target)

// What another member is allowed to see of one goal: private goals vanish,
// summary goals become hit-or-miss (weight becomes percent change)
function shareGoal(g: Goal): { goal: Goal; value: (v: number | undefined) => number | undefined; asCheck: boolean } | null {
  if (g.visibility === "private") return null
  if (g.visibility === "squad") return { goal: g, value: (v) => v, asCheck: false }
  if (g.id === "weight") {
    const start = g.startValue
    if (!start) return null
    const pct = (v: number | undefined) => (v === undefined ? undefined : Math.round(((v - start) / start) * 1000) / 10)
    return {
      goal: { ...g, unit: "%", startValue: 0, target: g.target === undefined ? undefined : pct(g.target), step: 0.1 },
      value: pct,
      asCheck: false,
    }
  }
  if (g.kind === "number") {
    return {
      goal: { ...g, kind: "check", unit: undefined, target: undefined, compare: undefined, step: undefined },
      value: (v) => v,
      asCheck: true,
    }
  }
  return { goal: g, value: (v) => v, asCheck: false }
}

export async function loadSquad(viewerId: string, squad: Membership["squad"], timeZone: string): Promise<SquadSnapshot> {
  const memberRows = await db
    .select({ member: squadMembers, profile: profiles })
    .from(squadMembers)
    .innerJoin(profiles, eq(profiles.userId, squadMembers.userId))
    .where(and(eq(squadMembers.squadId, squad.id), eq(profiles.status, "approved")))
    .orderBy(asc(squadMembers.joinedAt))
  const visible = memberRows.filter((r) => r.member.onboardedAt || r.profile.userId === viewerId)
  const ids = visible.map((r) => r.profile.userId)
  if (ids.length === 0) ids.push(viewerId)

  const today = todayIndex(squad.startsOn, timeZone)
  const [goalRows, entryRows, checkInRows, reactionRows, commentRows, nudgeRows] = await Promise.all([
    db.select().from(goals).where(and(eq(goals.squadId, squad.id), inArray(goals.userId, ids))).orderBy(asc(goals.position)),
    db
      .select({ entry: entries, module: goals.module, metric: goals.metric })
      .from(entries)
      .innerJoin(goals, eq(goals.id, entries.goalId))
      .where(and(eq(goals.squadId, squad.id), inArray(entries.userId, ids))),
    db.select().from(checkIns).where(and(eq(checkIns.squadId, squad.id), inArray(checkIns.userId, ids))),
    db.select().from(reactions).where(eq(reactions.squadId, squad.id)),
    db.select().from(comments).where(eq(comments.squadId, squad.id)).orderBy(asc(comments.createdAt)),
    db
      .select()
      .from(nudges)
      .where(and(eq(nudges.squadId, squad.id), eq(nudges.day, isoDay(squad.startsOn, today)))),
  ])

  const members: Member[] = []
  const logs: SquadSnapshot["logs"] = {}

  for (const { member, profile } of visible) {
    const isYou = profile.userId === viewerId
    const active = goalRows.filter((g) => g.userId === profile.userId && !g.archivedAt).map(toGoal)
    const shared = isYou
      ? active.map((g) => ({ goal: g, value: (v: number | undefined) => v, asCheck: false }))
      : active.map(shareGoal).filter((s) => s !== null)
    const byKey = new Map(shared.map((s) => [s.goal.id, s]))
    const originals = new Map(active.map((g) => [g.id, g]))

    const series: (DayLog | null)[] = Array.from({ length: squad.days }, () => null)
    for (const c of checkInRows) {
      if (c.userId !== profile.userId) continue
      const d = Math.round((Date.parse(c.day) - Date.parse(squad.startsOn)) / 86_400_000)
      if (d >= 0 && d < squad.days) series[d] = { checks: {}, numbers: {}, savedAt: c.savedAt.toISOString() }
    }
    for (const { entry, module, metric } of entryRows) {
      if (entry.userId !== profile.userId) continue
      const d = Math.round((Date.parse(entry.day) - Date.parse(squad.startsOn)) / 86_400_000)
      const log = series[d]
      if (!log) continue
      const key = goalKey(module, metric)
      const share = byKey.get(key)
      if (!share) continue
      if (share.goal.kind === "check" && !share.asCheck) log.checks[key] = !!entry.checked
      else if (share.asCheck) log.checks[key] = hitOf(originals.get(key)!, entry.value ?? undefined)
      else log.numbers[key] = share.value(entry.value ?? undefined)
      if (key === "workout" && entry.note && share.goal.visibility === "squad") log.workoutName = entry.note
    }

    const weight = byKey.get("weight")?.goal
    const name = member.displayName || profile.name
    members.push({
      id: profile.userId,
      name,
      initials: initialsOf(name),
      hue: (HUES.includes(member.hue as Hue) ? member.hue : "blue") as Hue,
      image: profile.image,
      isYou,
      goals: shared.map((s) => s.goal),
      startWeight: weight?.startValue,
      goalWeight: weight?.target,
    })
    logs[profile.userId] = series
  }

  return {
    squad: { id: squad.id, name: squad.name },
    season: { startsOn: squad.startsOn, days: squad.days, today },
    viewerId,
    members,
    logs,
    reactions: reactionRows.map((r) => ({ eventId: r.eventId, userId: r.userId, emoji: r.emoji })),
    comments: commentRows.map((c) => ({
      id: c.id,
      eventId: c.eventId,
      userId: c.userId,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
    nudges: nudgeRows.map((n) => [n.fromUser, n.toUser]),
  }
}

// Active goals for one member, for the onboarding editor
export async function activeGoals(userId: string, squadId: string) {
  return db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.squadId, squadId), isNull(goals.archivedAt)))
    .orderBy(asc(goals.position))
}
