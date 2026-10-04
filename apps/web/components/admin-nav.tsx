"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/admin", label: "Members" },
  { href: "/admin/invites", label: "Invites" },
]

export function AdminNav() {
  const path = usePathname()
  return (
    <nav aria-label="Admin" className="mt-5 flex gap-1">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={path === l.href ? "page" : undefined}
          className="flex h-9 items-center rounded-full px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:bg-foreground aria-[current=page]:text-background"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
