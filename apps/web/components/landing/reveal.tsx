"use client"

import { motion } from "motion/react"

// Fades and lifts content in the first time it scrolls into view
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 220, damping: 28, delay }}
    >
      {children}
    </motion.div>
  )
}
