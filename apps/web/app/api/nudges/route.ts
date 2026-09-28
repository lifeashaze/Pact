import { and, eq } from "drizzle-orm"

import { bad, memberOrError, readJson } from "@/lib/api"
import { db } from "@/lib/db"
import { nudges, squadMembers } from "@/lib/db/schema"
import { isoDay } from "@/lib/season"

// One nudge per friend per day. Delivery (push or email) comes later; for now it shows in the app
export async function POST(req: Request) {
  const auth = await memberOrError()
  if (auth.error) return auth.error
  const body = await readJson<{ to?: unknown }>(req)
  const to = typeof body?.to === "string" ? body.to : ""
  if (!to || to === auth.viewer.userId) return bad("Pick someone else to nudge")
  const [target] = await db
    .select({ userId: squadMembers.userId })
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, auth.squad.id), eq(squadMembers.userId, to)))
  if (!target) return bad("They're not in your squad", 404)
  if (auth.today < 0) return bad("Nudges start when the season does")
  await db
    .insert(nudges)
    .values({ squadId: auth.squad.id, fromUser: auth.viewer.userId, toUser: to, day: isoDay(auth.squad.startsOn, auth.today) })
    .onConflictDoNothing()
  return Response.json({ ok: true })
}
