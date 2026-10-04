import { and, eq, inArray, isNull, sql } from "drizzle-orm"

import { bad, memberOrError, readJson } from "@/lib/api"
import { db } from "@/lib/db"
import { checkIns, entries, goals } from "@/lib/db/schema"
import { firstEditableDay } from "@/lib/season"

type Body = { entries?: { goalId?: unknown; checked?: unknown; value?: unknown; note?: unknown }[] }

// Save one day's check-in: every goal's value, and that the day was logged.
// Today and yesterday can be written; older days are locked, except during the
// late-joiner backfill window when every day since the start is open
export async function PUT(req: Request, ctx: RouteContext<"/api/check-ins/[day]">) {
  const auth = await memberOrError()
  if (auth.error) return auth.error
  const { viewer, squad, member, today } = auth
  if (!member.onboardedAt) return bad("Finish setting up first", 403)

  const { day } = await ctx.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad("Day must be YYYY-MM-DD")
  const index = Math.round((Date.parse(day) - Date.parse(squad.startsOn)) / 86_400_000)
  if (Number.isNaN(index) || index < 0 || index >= squad.days) return bad("That day isn't part of the season")
  if (index > today) return bad("That day hasn't happened yet")
  if (index < firstEditableDay(squad.startsOn, today)) return bad("Only today and yesterday can be changed")

  const body = await readJson<Body>(req)
  if (!body || !Array.isArray(body.entries) || body.entries.length > 50) return bad("Send an entries array")

  const mine = await db
    .select({ id: goals.id, kind: goals.kind })
    .from(goals)
    .where(and(eq(goals.userId, viewer.userId), eq(goals.squadId, squad.id), isNull(goals.archivedAt)))
  const kinds = new Map(mine.map((g) => [g.id, g.kind]))

  const rows: (typeof entries.$inferInsert)[] = []
  for (const e of body.entries) {
    if (typeof e.goalId !== "string" || !kinds.has(e.goalId)) return bad("Unknown goal")
    const kind = kinds.get(e.goalId)
    const value = e.value === null || e.value === undefined ? null : Number(e.value)
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 1_000_000)) return bad("Numbers must be positive")
    const note = typeof e.note === "string" ? e.note.trim().slice(0, 60) || null : null
    rows.push({
      goalId: e.goalId,
      userId: viewer.userId,
      day,
      checked: kind === "check" ? e.checked === true : null,
      value: kind === "number" ? value : null,
      note,
    })
  }

  const saved = sql`now()`
  await db.batch([
    db
      .insert(checkIns)
      .values({ squadId: squad.id, userId: viewer.userId, day })
      .onConflictDoUpdate({ target: [checkIns.userId, checkIns.squadId, checkIns.day], set: { savedAt: saved } }),
    // Goals left out of the payload are cleared for the day
    db.delete(entries).where(
      and(
        eq(entries.userId, viewer.userId),
        eq(entries.day, day),
        inArray(entries.goalId, mine.map((g) => g.id))
      )
    ),
    ...(rows.length ? [db.insert(entries).values(rows)] : []),
  ] as const)

  return Response.json({ ok: true })
}
