import { EVENT_ID, bad, memberOrError, readJson } from "@/lib/api"
import { db } from "@/lib/db"
import { comments } from "@/lib/db/schema"

export async function POST(req: Request) {
  const auth = await memberOrError()
  if (auth.error) return auth.error
  const body = await readJson<{ eventId?: unknown; body?: unknown }>(req)
  const eventId = typeof body?.eventId === "string" ? body.eventId : ""
  const text = typeof body?.body === "string" ? body.body.trim() : ""
  if (!EVENT_ID.test(eventId)) return bad("Unknown feed item")
  if (!text || text.length > 280) return bad("Comments are 1 to 280 characters")
  const [comment] = await db
    .insert(comments)
    .values({ squadId: auth.squad.id, userId: auth.viewer.userId, eventId, body: text })
    .returning({ id: comments.id })
  return Response.json({ comment })
}
