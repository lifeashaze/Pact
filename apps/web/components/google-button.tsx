"use client"

import * as React from "react"
import { motion } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"
import { authClient } from "@/lib/auth/client"

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

// Sends people through Google. Neon Auth brings them back to /home, where the proxy
// finishes the handshake and the app decides between the squad and the waiting room
export function GoogleButton({
  className,
  label = "Continue with Google",
  size = "lg",
}: {
  className?: string
  label?: string
  size?: "md" | "lg"
}) {
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function go() {
    setPending(true)
    setError(null)
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/home",
        errorCallbackURL: "/sign-in?error=google",
      })
      if (error) throw new Error(error.message)
    } catch (e) {
      setPending(false)
      setError(e instanceof Error && e.message ? e.message : "Google sign-in didn't start. Try again.")
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <motion.button
        type="button"
        onClick={go}
        disabled={pending}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "inline-flex items-center justify-center gap-3 rounded-full bg-primary font-semibold text-primary-foreground shadow-lg shadow-black/10 transition-[background-color,opacity] hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70",
          size === "lg" ? "h-14 px-7 text-base" : "h-11 px-5 text-sm"
        )}
      >
        <span className={cn("grid place-items-center rounded-full bg-white", size === "lg" ? "size-7" : "size-6")}>
          <GoogleG className={size === "lg" ? "size-4.5" : "size-4"} />
        </span>
        {pending ? "Opening Google" : label}
      </motion.button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
