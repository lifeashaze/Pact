"use client"

import { createAuthClient } from "@neondatabase/auth/next"

// Annotated so TypeScript doesn't try to spell out Better Auth's huge inferred type
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient()
