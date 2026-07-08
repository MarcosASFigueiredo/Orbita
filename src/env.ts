// Typed, client-safe access to the deploy environment.
//
// `VITE_APP_ENV` is set per Vercel environment (see `.env.example` and
// `DEPLOYMENT.md`). Only `VITE_`-prefixed vars are inlined into the client
// bundle by Vite, so this value is safe to read on both server and client and
// stays identical across SSR + hydration (no mismatch).
//
// Server-only secrets must NOT use the `VITE_` prefix — read those via
// `process.env` inside server functions / middleware. See the Intent skill
// `@tanstack/start-client-core#start-core/execution-model`.

export type AppEnv = 'development' | 'staging' | 'production'

const raw = import.meta.env.VITE_APP_ENV

// Fall back to the Vite build mode when VITE_APP_ENV is unset: a production
// `vite build` (PROD) defaults to 'production', otherwise 'development'.
export const appEnv: AppEnv = raw ?? (import.meta.env.PROD ? 'production' : 'development')

export const isProduction = appEnv === 'production'
export const isStaging = appEnv === 'staging'
export const isDevelopment = appEnv === 'development'
