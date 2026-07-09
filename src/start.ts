// TanStack Start global entry. Registers request middleware that runs on every
// HTTP request before route/server-fn handling.
//
// Auth.js has no TanStack adapter, so we mount its HTTP handler here: any
// /api/auth/* request is delegated to @auth/core's Auth(), which owns sign-in,
// the magic-link callback, session and sign-out. The SSE change feed
// (/api/events, our Supabase Realtime replacement) is mounted the same way.
// Both handlers + the DB config are imported dynamically *inside* the server
// handler so they never enter the client bundle (the import-protection plugin
// would otherwise fail the build).
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from '@tanstack/react-start'

const authHandlerMiddleware = createMiddleware().server(async (ctx) => {
  const url = new URL(ctx.request.url)
  if (!url.pathname.startsWith('/api/auth/')) return ctx.next()
  const [{ Auth }, { authConfig }] = await Promise.all([
    import('@auth/core'),
    import('#/server/auth/config'),
  ])
  return Auth(ctx.request, authConfig)
})

// Live realtime feed: a bounded SSE stream that nudges clients to refetch when
// any shared track changes. See src/server/events.ts.
const eventStreamMiddleware = createMiddleware().server(async (ctx) => {
  const url = new URL(ctx.request.url)
  if (url.pathname !== '/api/events') return ctx.next()
  const { handleEventStream } = await import('#/server/events')
  return handleEventStream(ctx.request)
})

// Protect the same-origin server-fn RPC endpoints from cross-site requests.
// (Auth.js runs its own CSRF protection for /api/auth/*.)
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    authHandlerMiddleware,
    eventStreamMiddleware,
    csrfMiddleware,
  ],
}))
