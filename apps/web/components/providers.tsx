"use client"

import { MotionConfig } from "motion/react"

import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Honour the OS reduced-motion setting everywhere */}
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 32 }}>
        {children}
      </MotionConfig>
    </ThemeProvider>
  )
}
