import { SquadProvider } from "@/components/squad-store"
import { loadSquad, requireMember } from "@/lib/squad-data"

export default async function RecapLayout({ children }: { children: React.ReactNode }) {
  const { viewer, squad } = await requireMember()
  const snapshot = await loadSquad(viewer.userId, squad, viewer.timeZone)
  return (
    <SquadProvider initial={snapshot} timeZone={viewer.timeZone}>
      {children}
    </SquadProvider>
  )
}
