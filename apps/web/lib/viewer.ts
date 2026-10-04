import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth/server"
import { db } from "@/lib/db"
import { type Profile, profiles } from "@/lib/db/schema"
import { isInvited, markAccepted } from "@/lib/invites"

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.toLowerCase())
}

// The signed-in person and their profile, created on first visit.
// Admins listed in ADMIN_EMAILS, and anyone an admin invited, are approved automatically.
export const getViewer = cache(async (): Promise<Profile | null> => {
  // Session lives in cookies, so anything that asks for the viewer renders per request.
  // Saying so up front stops the auth SDK from logging Next's prerender bailout as an error
  await connection()
  const { data: session } = await auth.getSession()
  const user = session?.user
  if (!user) return null

  const admin = isAdminEmail(user.email)
  const name = user.name || user.email.split("@")[0]!
  const image = user.image ?? null

  const existing = await getProfile(user.id)
  if (!existing) {
    const invited = !admin && (await isInvited(user.email))
    const [created] = await db
      .insert(profiles)
      .values({
        userId: user.id,
        email: user.email,
        name,
        image,
        isAdmin: admin,
        status: admin || invited ? "approved" : "pending",
      })
      .onConflictDoNothing()
      .returning()
    if (created && invited) await markAccepted(user.email)
    return created ?? getProfile(user.id)
  }

  // Keep Google's name and photo fresh, and let the env list promote admins
  const promote = admin && (!existing.isAdmin || existing.status !== "approved")
  if (existing.email !== user.email || existing.name !== name || existing.image !== image || promote) {
    const [updated] = await db
      .update(profiles)
      .set({ email: user.email, name, image, ...(promote ? { isAdmin: true, status: "approved" as const } : {}) })
      .where(eq(profiles.userId, user.id))
      .returning()
    return updated ?? existing
  }
  return existing
})

export async function getProfile(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId))
  return profile ?? null
}

// For pages: send people to sign in, or to the waiting room until approved
export async function requireApproved() {
  const viewer = await getViewer()
  if (!viewer) redirect("/sign-in")
  if (viewer.status !== "approved") redirect("/waiting")
  return viewer
}

export async function requireAdmin() {
  const viewer = await requireApproved()
  if (!viewer.isAdmin) redirect("/home")
  return viewer
}

// For route handlers: a JSON error instead of a redirect
export async function approvedOrError() {
  const viewer = await getViewer()
  if (!viewer) return { error: Response.json({ error: "Not signed in" }, { status: 401 }) }
  if (viewer.status !== "approved")
    return { error: Response.json({ error: "Waiting for approval" }, { status: 403 }) }
  return { viewer }
}
