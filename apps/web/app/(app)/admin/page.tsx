import type { Metadata } from "next"

import { AdminBoard } from "@/components/admin-board"
import { AdminNav } from "@/components/admin-nav"
import { listMembers } from "@/lib/members"
import { requireAdmin } from "@/lib/viewer"

export const metadata: Metadata = { title: "Admin, Pact" }

export default async function AdminPage() {
  const viewer = await requireAdmin()
  const members = await listMembers()

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">
      <header className="px-1 pe-14 lg:pe-1">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-tight">Admin</h1>
        <p className="mt-2 max-w-[60ch] text-muted-foreground">
          Everyone who signs in with Google lands here first. Nobody sees the squad&apos;s numbers until you let them in.
        </p>
        <AdminNav />
      </header>
      <AdminBoard initial={members} viewerId={viewer.userId} />
    </div>
  )
}
