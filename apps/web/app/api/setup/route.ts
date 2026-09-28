import { and, eq, isNull, ne, sql } from "drizzle-orm"

import { bad, memberOrError, readJson } from "@/lib/api"
import { db } from "@/lib/db"
import { goals, profiles, squadMembers } from "@/lib/db/schema"
import { type SetupInput, buildGoals } from "@/lib/modules"
import { HUES } from "@/lib/season"

function validZone(zone: unknown): zone is string {
  if (typeof zone !== "string" || zone.length > 64) return false
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone })
    return true
  } catch {
    return false
  }
}

// Saves onboarding (and later goal edits): name, colour, time zone and goals.
// Before the season goals are edited in place. Once it has started, a changed
// target archives the old goal so past days keep the target they were logged against
export async function PUT(req: Request) {
  const auth = await memberOrError()
  if (auth.error) return auth.error
  const { viewer, squad, today } = auth

  const input = await readJson<SetupInput>(req)
  if (!input || !Array.isArray(input.modules) || !Array.isArray(input.goals)) return bad("Missing setup")
  const displayName = String(input.displayName ?? "").trim().slice(0, 40)
  if (!displayName) return bad("Add the name the squad will see")
  if (!HUES.includes(input.hue as never)) return bad("Pick a colour")
  if (!validZone(input.timeZone)) return bad("Unknown time zone")
  if (input.goals.length > 30) return bad("That's a lot of goals. Keep it under 30")

  const records = buildGoals(input)
  if (typeof records === "string") return bad(records)

  const [clash] = await db
    .select({ userId: squadMembers.userId })
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, squad.id), eq(squadMembers.hue, input.hue), ne(squadMembers.userId, viewer.userId)))
  if (clash) return bad("Someone else in the squad has that colour", 409)

  const existing = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, viewer.userId), eq(goals.squadId, squad.id), isNull(goals.archivedAt)))
  const key = (g: { module: string; metric: string }) => `${g.module}/${g.metric}`
  const current = new Map(existing.map((g) => [key(g), g]))
  const started = today >= 0

  // Archives and updates run before inserts so the one-active-goal-per-metric index never trips
  const updates = []
  const inserts = []
  const kept = new Set<string>()
  for (const r of records) {
    const old = current.get(key(r))
    const values = { ...r, squadId: squad.id, userId: viewer.userId }
    if (!old) {
      inserts.push(db.insert(goals).values(values))
      continue
    }
    kept.add(old.id)
    const reshaped =
      old.kind !== r.kind || old.target !== r.target || old.compare !== r.compare || old.weeklyTarget !== r.weeklyTarget
    if (started && reshaped) {
      updates.push(db.update(goals).set({ archivedAt: sql`now()` }).where(eq(goals.id, old.id)))
      inserts.push(db.insert(goals).values(values))
    } else {
      updates.push(db.update(goals).set(r).where(eq(goals.id, old.id)))
    }
  }
  for (const old of existing) {
    if (!kept.has(old.id)) updates.push(db.update(goals).set({ archivedAt: sql`now()` }).where(eq(goals.id, old.id)))
  }

  await db.batch([
    db.update(profiles).set({ timeZone: input.timeZone }).where(eq(profiles.userId, viewer.userId)),
    db
      .update(squadMembers)
      .set({ displayName, hue: input.hue, onboardedAt: sql`coalesce(${squadMembers.onboardedAt}, now())` })
      .where(and(eq(squadMembers.squadId, squad.id), eq(squadMembers.userId, viewer.userId))),
    ...updates,
    ...inserts,
  ] as never)

  return Response.json({ ok: true })
}
