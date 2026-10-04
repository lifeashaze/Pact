import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Wordmark } from "@/components/brand"
import { WaitingRoom } from "@/components/waiting-room"
import { getViewer } from "@/lib/viewer"

export const metadata: Metadata = { title: "On the list, Pact" }

export default async function WaitingPage() {
  const viewer = await getViewer()
  if (!viewer) redirect("/sign-in")
  if (viewer.status === "approved") redirect("/home")

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-w-6xl lg:px-8 lg:py-8">
      <Wordmark />
      <WaitingRoom
        viewer={{ name: viewer.name, email: viewer.email, image: viewer.image, isAdmin: viewer.isAdmin }}
        rejected={viewer.status === "rejected"}
      />
    </main>
  )
}
