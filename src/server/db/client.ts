// Server-only Drizzle client over Neon's serverless HTTP driver — the right
// fit for Vercel's per-request serverless functions (no persistent socket to
// keep warm). Never import this into anything that reaches the client bundle.
import '@tanstack/react-start/server-only'

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import { configureNeonForLocalDev } from './neon-local'

// process.env is read at import time, but neon() only opens a connection on the
// first query — so a placeholder DATABASE_URL is fine until real credentials
// are wired in (the app just can't hit the DB yet).
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// No-op against real Neon; redirects to the local docker proxy in dev.
configureNeonForLocalDev(connectionString)

export const db = drizzle(neon(connectionString), { schema })
export { schema }
