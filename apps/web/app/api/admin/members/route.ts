import { listMembers } from "@/lib/members"
import { approvedOrError } from "@/lib/viewer"

export async function GET() {
  const { viewer, error } = await approvedOrError()
  if (error) return error
  if (!viewer.isAdmin) return Response.json({ error: "Admins only" }, { status: 403 })
  return Response.json({ members: await listMembers() })
}
