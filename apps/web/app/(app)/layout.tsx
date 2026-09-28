import { AppShell } from "@/components/app-shell"
import { SquadProvider } from "@/components/squad-store"
import { loadSquad, requireMember } from "@/lib/squad-data"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { viewer, squad } = await requireMember()
  const snapshot = await loadSquad(viewer.userId, squad, viewer.timeZone)
  return (
    <SquadProvider initial={snapshot} timeZone={viewer.timeZone}>
      <AppShell viewer={{ name: viewer.name, email: viewer.email, image: viewer.image, isAdmin: viewer.isAdmin }}>
        {children}
      </AppShell>
    </SquadProvider>
  )
}
