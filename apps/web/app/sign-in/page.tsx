import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Mark, Wordmark } from "@/components/brand"
import { GoogleButton } from "@/components/google-button"
import { getViewer } from "@/lib/viewer"

export const metadata: Metadata = { title: "Sign in, Pact90" }

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const viewer = await getViewer()
  if (viewer) redirect(viewer.status === "approved" ? "/home" : "/waiting")
  const { error } = await searchParams

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link href="/" aria-label="Pact90 home" className="w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        <Wordmark />
      </Link>

      <div className="flex flex-1 flex-col justify-center py-12">
        <Mark size={72} />
        <h1 className="mt-8 font-display text-6xl leading-[0.95] font-bold tracking-tight">Sign in</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Pact90 uses your Google account, nothing else. First time here? You&apos;ll get a profile straight away, and
          you&apos;re let into the squad once you&apos;re approved.
        </p>
        {error && (
          <p role="alert" className="mt-6 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Google sign-in didn&apos;t finish. Give it another go.
          </p>
        )}
        <GoogleButton className="mt-8" />
      </div>

      <p className="text-sm text-muted-foreground">
        Season one runs 1 October to 31 December 2026.{" "}
        <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">
          What is Pact90?
        </Link>
      </p>
    </main>
  )
}
