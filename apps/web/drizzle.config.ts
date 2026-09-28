import path from "node:path"
import { defineConfig } from "drizzle-kit"

// drizzle-kit runs from apps/web. Migrations go to the dev branch unless
// DB_ENV=production is set (bun run db:migrate:prod)
const file = process.env.DB_ENV === "production" ? ".env.local" : ".env.development.local"
process.loadEnvFile(path.resolve(process.cwd(), "../..", file))

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL! },
})
