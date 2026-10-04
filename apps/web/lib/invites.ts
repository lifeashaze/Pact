import "server-only"

import { and, desc, eq, inArray, ne, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { type Invite, invites, profiles } from "@/lib/db/schema"
import { sendEmail } from "@/lib/email"

export type InviteRow = {
  email: string
  createdAt: string
  emailedAt: string | null
  acceptedAt: string | null
}

const toRow = (i: Invite): InviteRow => ({
  email: i.email,
  createdAt: i.createdAt.toISOString(),
  emailedAt: i.emailedAt?.toISOString() ?? null,
  acceptedAt: i.acceptedAt?.toISOString() ?? null,
})

// Loose on purpose: Google accounts can be Gmail or any Workspace domain
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

// Split pasted text on commas, semicolons and whitespace. Returns the good ones and the rest
export function parseEmails(input: string) {
  const parts = input
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
  const unique = [...new Set(parts)]
  return { valid: unique.filter((e) => EMAIL.test(e)), invalid: unique.filter((e) => !EMAIL.test(e)) }
}

export async function listInvites(): Promise<InviteRow[]> {
  const rows = await db.select().from(invites).orderBy(desc(invites.createdAt))
  return rows.map(toRow)
}

export async function isInvited(email: string) {
  const [row] = await db.select({ email: invites.email }).from(invites).where(eq(invites.email, email.toLowerCase()))
  return Boolean(row)
}

export async function markAccepted(email: string) {
  await db
    .update(invites)
    .set({ acceptedAt: sql`coalesce(${invites.acceptedAt}, now())` })
    .where(eq(invites.email, email.toLowerCase()))
}

const lowerEmail = sql<string>`lower(${profiles.email})`

// Save invites, let in anyone already waiting with that email, then email the rest.
// Replies go to the admin who sent them, since the sending address has no inbox
export async function createInvites(emails: string[], inviter: { userId: string; email: string }, origin: string) {
  const invitedBy = inviter.userId
  const failed: { email: string; reason: string }[] = []
  const emailed: string[] = []
  if (!emails.length) return { invites: [] as InviteRow[], failed, emailed, approved: [] as string[] }
  await db
    .insert(invites)
    .values(emails.map((email) => ({ email, invitedBy })))
    .onConflictDoNothing()

  // Someone who signed in before being invited is already in the waiting room
  const waiting = await db
    .update(profiles)
    .set({ status: "approved", reviewedAt: new Date(), reviewedBy: invitedBy })
    .where(and(inArray(lowerEmail, emails), ne(profiles.status, "approved")))
    .returning({ email: profiles.email })
  const joined = await db
    .select({ email: profiles.email })
    .from(profiles)
    .where(inArray(lowerEmail, emails))
  for (const p of joined) await markAccepted(p.email)

  const already = new Set(joined.map((p) => p.email.toLowerCase()))
  for (const email of emails) {
    // People who already have an account don't need a "come join" email
    if (already.has(email)) continue
    const result = await sendInviteEmail(email, origin, inviter.email)
    if (result.sent) {
      emailed.push(email)
      await db.update(invites).set({ emailedAt: new Date() }).where(eq(invites.email, email))
    } else failed.push({ email, reason: result.reason })
  }

  const rows = await db.select().from(invites).where(inArray(invites.email, emails))
  return { invites: rows.map(toRow), failed, emailed, approved: waiting.map((w) => w.email.toLowerCase()) }
}

export async function resendInvite(email: string, origin: string, replyTo: string) {
  if (!(await isInvited(email))) return { invite: null }
  const result = await sendInviteEmail(email, origin, replyTo)
  if (!result.sent) return { error: result.reason }
  const [row] = await db.update(invites).set({ emailedAt: new Date() }).where(eq(invites.email, email)).returning()
  return { invite: row ? toRow(row) : null }
}

export async function deleteInvite(email: string) {
  const [row] = await db.delete(invites).where(eq(invites.email, email)).returning()
  return Boolean(row)
}

// Links in the email must point at the public site, not whatever host the admin is on
// (a localhost link is useless to the friend and reads as spam). APP_URL wins, then Vercel's production domain
function publicUrl(origin: string) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "")
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return origin
}

function sendInviteEmail(email: string, origin: string, replyTo: string) {
  const link = `${publicUrl(origin)}/sign-in`
  return sendEmail({
    to: email,
    replyTo,
    subject: "You're invited to Pact",
    text: [
      "You've been invited to Pact, a shared scoreboard for you and your friends until 31 December.",
      "",
      `Sign in with Google as ${email} to join: ${link}`,
    ].join("\n"),
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:24px;padding:36px">
          <tr><td>
            <p style="margin:0 0 24px;font-size:20px;font-weight:700">Pact</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15">You're in.</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.5;color:#555">
              You've been invited to Pact, a shared scoreboard for you and your friends until 31 December.
              Set your own goals, check in once a day, see who's keeping up.
            </p>
            <a href="${link}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:999px">Join with Google</a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#888">
              Sign in with the Google account for ${escapeHtml(email)}, otherwise you'll land in the waiting room.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`,
  })
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
