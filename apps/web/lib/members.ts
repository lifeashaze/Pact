import "server-only"

import { asc, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { type ProfileStatus, profiles } from "@/lib/db/schema"

export type MemberRow = {
  userId: string
  email: string
  name: string
  image: string | null
  status: ProfileStatus
  isAdmin: boolean
  createdAt: string
  reviewedAt: string | null
}

export async function listMembers(): Promise<MemberRow[]> {
  const rows = await db.select().from(profiles).orderBy(asc(profiles.status), desc(profiles.createdAt))
  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    name: r.name,
    image: r.image,
    status: r.status,
    isAdmin: r.isAdmin,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
  }))
}

export async function setMemberStatus(userId: string, status: ProfileStatus, reviewerId: string) {
  const [row] = await db
    .update(profiles)
    .set({ status, reviewedAt: new Date(), reviewedBy: reviewerId })
    .where(eq(profiles.userId, userId))
    .returning()
  return row ?? null
}
