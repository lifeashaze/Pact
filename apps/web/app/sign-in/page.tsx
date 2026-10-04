import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Mark, Wordmark } from "@/components/brand"
import { GoogleButton } from "@/components/google-button"
import { HeroArt } from "@/components/landing/hero-art"
import { getViewer } from "@/lib/viewer"

export const metadata: Metadata = { title: "Sign in, Pact" }

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const viewer = await getViewer()
  if (viewer) redirect(viewer.status === "approved" ? "/home" : "/waiting")
  const { error } = await searchParams

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-w-6xl lg:px-8 lg:py-8">
      <Link href="/" aria-label="Pact home" className="w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        <Wordmark />
      </Link>

      {/* One column on phones; the landing page's hero art sits alongside on desktop */}
      <div className="flex flex-1 flex-col justify-center py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
        <div className="flex flex-col lg:max-w-md">
          <Mark size={72} />
          <h1 className="mt-8 font-display text-6xl leading-[0.95] font-bold tracking-tight lg:text-7xl">Sign in</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Pact uses your Google account, nothing else. First time here? You&apos;ll get a profile straight away, and
            you&apos;re let into the squad once you&apos;re approved.
          </p>
          {error && (
            <p role="alert" className="mt-6 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Google sign-in didn&apos;t finish. Give it another go.
            </p>
          )}
          <GoogleButton className="mt-8 lg:justify-items-start" />
        </div>
        {/* Capped by height too, so it never pushes the page into a scroll on short laptop screens */}
        <div className="hidden w-full max-w-[min(100%,68svh)] justify-self-center lg:block">
          <HeroArt />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Season one ends 31 December 2026.{" "}
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          What is Pact?
        </Link>
      </p>
    </main>
  )
}
