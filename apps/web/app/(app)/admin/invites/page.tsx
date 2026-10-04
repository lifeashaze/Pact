import type { Metadata } from "next"

import { AdminNav } from "@/components/admin-nav"
import { InviteBoard } from "@/components/invite-board"
import { emailConfigured } from "@/lib/email"
import { listInvites } from "@/lib/invites"
import { requireAdmin } from "@/lib/viewer"

export const metadata: Metadata = { title: "Invites, Pact" }

export default async function InvitesPage() {
  await requireAdmin()
  const invites = await listInvites()

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <header className="px-1 pe-14 lg:pe-1">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">Invites</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          Add a friend&apos;s Google email. When they sign in with that account they skip the waiting room and go
          straight to setting up their season.
        </p>
        <AdminNav />
      </header>
      <InviteBoard initial={invites} emailReady={emailConfigured()} />
    </div>
  )
}
