import { GoogleButton } from "@/components/google-button"
import { SeasonLine } from "@/components/landing/countdown"
import { HeroArt } from "@/components/landing/hero-art"
import { LandingNav } from "@/components/landing/nav"

// One screen, no scroll: the pitch on one side, the art on the other
export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip lg:h-svh lg:overflow-hidden">
      <LandingNav />

      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-6 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-12">
        <div className="max-w-xl">
          <h1 className="font-display text-[clamp(3.25rem,9vw,5.75rem)] leading-[0.9] font-bold tracking-tight text-balance">
            Lock in until New Year.
          </h1>
          <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
            A shared scoreboard for you and your friends. Set your own goals, check in once a day, see who&apos;s keeping up.
          </p>
          <div className="mt-8 grid justify-items-start gap-4">
            <GoogleButton label="Start with Google" />
            <SeasonLine className="text-sm text-muted-foreground" />
          </div>
        </div>
        {/* Capped by height so the page never scrolls, on short laptops or phones */}
        <div className="w-full max-w-[min(100%,32svh)] justify-self-center lg:max-w-[min(100%,68svh)]">
          <HeroArt />
        </div>
      </main>
    </div>
  )
}
