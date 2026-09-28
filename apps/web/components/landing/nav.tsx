"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { Wordmark } from "@/components/brand"
import { authClient } from "@/lib/auth/client"

export function LandingNav() {
  const { data: session, isPending } = authClient.useSession()
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled ? "border-border bg-background/85 backdrop-blur-lg" : "border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="Pact90 home" className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
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
          {session?.user ? "Open Pact90" : "Sign in"}
        </Link>
      </div>
    </header>
  )
}
