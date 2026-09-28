import type { NextRequest } from "next/server"

import { profileStatus, type ProfileStatus } from "@/lib/db/schema"
import { setMemberStatus } from "@/lib/members"
import { ensureMembership } from "@/lib/squad-data"
import { approvedOrError, getProfile } from "@/lib/viewer"

const statuses: readonly string[] = profileStatus.enumValues

// Approve, reject, or move someone back to pending
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/members/[id]">) {
  const { viewer, error } = await approvedOrError()
  if (error) return error
  if (!viewer.isAdmin) return Response.json({ error: "Admins only" }, { status: 403 })

  const { id } = await ctx.params
  const body = (await req.json().catch(() => null)) as { status?: unknown } | null
  const status = body?.status
  if (typeof status !== "string" || !statuses.includes(status)) {
    return Response.json({ error: "status must be pending, approved or rejected" }, { status: 400 })
  }

  const target = await getProfile(id)
  if (!target) return Response.json({ error: "No such member" }, { status: 404 })
  if (target.isAdmin) return Response.json({ error: "Admins can't be changed here" }, { status: 400 })

  const updated = await setMemberStatus(id, status as ProfileStatus, viewer.userId)
  // Approval puts them in the season squad; they'll see onboarding next time they open the app
  if (updated?.status === "approved") await ensureMembership(updated)
  return Response.json({ member: { userId: updated!.userId, status: updated!.status } })
}
