import "server-only"

import { ensureMembership, todayIndex } from "@/lib/squad-data"
import { approvedOrError } from "@/lib/viewer"

export const bad = (error: string, status = 400) => Response.json({ error }, { status })

// For route handlers: signed in, approved, and in the squad
export async function memberOrError() {
  const { viewer, error } = await approvedOrError()
  if (error) return { error }
  const { squad, member } = await ensureMembership(viewer)
  const today = todayIndex(squad.startsOn, viewer.timeZone)
  return { viewer, squad, member, today }
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

// Feed event ids look like "<userId>:<day>:<kind>"
export const EVENT_ID = /^[0-9a-f-]{36}:\d{1,3}:(day|streak|weight)$/
