import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit reads this for `generate` (schema -> SQL, no DB needed) and for
// `migrate`/`push`/`studio` (which do need a live DATABASE_URL in .env).
export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://placeholder',
  },
  casing: 'snake_case',
})
