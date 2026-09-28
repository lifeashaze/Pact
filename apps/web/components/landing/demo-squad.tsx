"use client"

import { SquadProvider } from "@/components/squad-store"
import { demoSquad } from "@/lib/demo"

// The landing page previews run the real components on a made-up squad
export function DemoSquad({ children }: { children: React.ReactNode }) {
  return (
    <SquadProvider initial={demoSquad()} timeZone="UTC" demo>
      {children}
    </SquadProvider>
  )
}
