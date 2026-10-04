import type { Metadata, Viewport } from "next"
import { Barlow, Barlow_Condensed } from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { cn } from "@workspace/ui/lib/utils"

// Barlow's plain, DIN-like shapes read like gym signage and scoreboards
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
})

// The condensed cut carries the numbers
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "Pact",
  description:
    "A shared scoreboard for you and your friends until 31 December. Pick your own goals for diet, training and habits, check in once a day, and see everyone's numbers.",
  openGraph: { title: "Pact", siteName: "Pact" },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#111319" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", "font-sans", barlow.variable, barlowCondensed.variable)}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
