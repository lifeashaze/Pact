import { and, eq } from "drizzle-orm"

import { EVENT_ID, bad, memberOrError, readJson } from "@/lib/api"
import { db } from "@/lib/db"
import { reactions } from "@/lib/db/schema"
import { REACTIONS } from "@/lib/feed"

async function parse(req: Request) {
  const body = await readJson<{ eventId?: unknown; emoji?: unknown }>(req)
  const eventId = typeof body?.eventId === "string" ? body.eventId : ""
  const emoji = typeof body?.emoji === "string" ? body.emoji : ""
  if (!EVENT_ID.test(eventId)) return null
  if (!(REACTIONS as readonly string[]).includes(emoji)) return null
  return { eventId, emoji }
}

export async function POST(req: Request) {
  const auth = await memberOrError()
  if (auth.error) return auth.error
  const input = await parse(req)
  if (!input) return bad("Unknown reaction")
  await db
    .insert(reactions)
    .values({ squadId: auth.squad.id, userId: auth.viewer.userId, ...input })
    .onConflictDoNothing()
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await memberOrError()
  if (auth.error) return auth.error
  const input = await parse(req)
  if (!input) return bad("Unknown reaction")
  await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.eventId, input.eventId),
        eq(reactions.userId, auth.viewer.userId),
        eq(reactions.emoji, input.emoji),
        eq(reactions.squadId, auth.squad.id)
      )
    )
  return Response.json({ ok: true })
}
