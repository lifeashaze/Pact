"use client"

import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { Wordmark } from "@/components/brand"
import { authClient } from "@/lib/auth/client"

export function LandingNav() {
  const { data: session, isPending } = authClient.useSession()
  return (
    <header>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Pact home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <Wordmark />
        </Link>
        <Link
          href={session?.user ? "/home" : "/sign-in"}
          className={cn(
            "inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold transition-[opacity,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            session?.user ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-card hover:bg-muted",
            isPending && "opacity-0"
          )}
        >
          {session?.user ? "Open Pact" : "Sign in"}
        </Link>
      </div>
    </header>
  )
}
