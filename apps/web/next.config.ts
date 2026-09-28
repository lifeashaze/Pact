import path from "node:path"
import type { NextConfig } from "next"

// Neon writes branch credentials to the repo root: .env.local points at the
// production branch, .env.development.local at the dev branch. Next only reads
// env files from apps/web, so load them here. The first file to set a value
// wins, so `next dev` talks to the dev branch. On Vercel neither file exists
// and the values come from project settings.
const root = path.resolve(import.meta.dirname, "../..")
const files = process.env.NODE_ENV === "production" ? [".env.local"] : [".env.development.local", ".env.local"]
for (const file of files) {
  try {
    process.loadEnvFile(path.join(root, file))
  } catch {
    // File not present
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
}

export default nextConfig
