import type { NextRequest } from "next/server"

import { bad, readJson } from "@/lib/api"
import { createInvites, deleteInvite, listInvites, parseEmails, resendInvite } from "@/lib/invites"
import { approvedOrError } from "@/lib/viewer"

async function adminOrError() {
  const { viewer, error } = await approvedOrError()
  if (error) return { error }
  if (!viewer.isAdmin) return { error: bad("Admins only", 403) }
  return { viewer }
}

export async function GET() {
  const { error } = await adminOrError()
  if (error) return error
  return Response.json({ invites: await listInvites() })
}

// Invite one or more Google emails, pasted however (commas, spaces, new lines)
export async function POST(req: NextRequest) {
  const { viewer, error } = await adminOrError()
  if (error) return error
  const body = await readJson<{ emails?: unknown }>(req)
  if (typeof body?.emails !== "string") return bad("emails must be a string")

  const { valid, invalid } = parseEmails(body.emails)
  if (!valid.length) return bad(invalid.length ? `Not an email: ${invalid.join(", ")}` : "Add at least one email")
  if (valid.length > 50) return bad("Up to 50 at a time")

  const result = await createInvites(valid, viewer, req.nextUrl.origin)
  return Response.json({ ...result, invalid })
}

// Send the email again
export async function PATCH(req: NextRequest) {
  const { viewer, error } = await adminOrError()
  if (error) return error
  const body = await readJson<{ email?: unknown }>(req)
  if (typeof body?.email !== "string") return bad("email must be a string")

  const result = await resendInvite(body.email.toLowerCase(), req.nextUrl.origin, viewer.email)
  if ("error" in result) return bad(result.error ?? "Couldn't send", 502)
  if (!result.invite) return bad("No such invite", 404)
  return Response.json({ invite: result.invite })
}

// Take an invite back. Anyone who already joined stays in
export async function DELETE(req: NextRequest) {
  const { error } = await adminOrError()
  if (error) return error
  const body = await readJson<{ email?: unknown }>(req)
  if (typeof body?.email !== "string") return bad("email must be a string")
  if (!(await deleteInvite(body.email.toLowerCase()))) return bad("No such invite", 404)
  return Response.json({ ok: true })
}
