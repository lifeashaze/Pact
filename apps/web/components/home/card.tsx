"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "motion/react"

import { cn } from "@workspace/ui/lib/utils"

// One card shell for every block on home, so padding, radius and entrance match.
// Each card is a container, so what's inside can densify by the card's own width, not the screen's
export function HomeCard({
  labelledBy,
  index = 0,
  className,
  children,
}: {
  labelledBy?: string
  index?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      aria-labelledby={labelledBy}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.04 + index * 0.05 }}
      className={cn("@container min-w-0 rounded-3xl bg-card p-5 sm:p-6", className)}
    >
      {children}
    </motion.section>
  )
}

// Title on the left, one quiet link on the right; an optional second line underneath
export function CardHeader({
  id,
  title,
  description,
  action,
  meta,
  live = false,
}: {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  // Right side of the description line, e.g. a column label
  meta?: React.ReactNode
  // Announce description changes, for status lines that update in place
  live?: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 id={id} className="min-w-0 truncate font-display text-2xl leading-8 font-semibold tracking-tight">
          {title}
        </h2>
        {action}
      </div>
      {(description || meta) && (
        <div className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground">
          <p className="min-w-0" aria-live={live ? "polite" : undefined}>
            {description}
          </p>
          {meta && <span className="shrink-0">{meta}</span>}
        </div>
      )}
    </div>
  )
}

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative shrink-0 rounded-md text-sm font-medium text-muted-foreground underline-offset-4 transition-colors before:absolute before:-inset-x-2 before:-inset-y-3 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      {children}
    </Link>
  )
}
