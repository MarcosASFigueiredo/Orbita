import { neonConfig } from '@neondatabase/serverless'

// Local-development bridge for the Neon HTTP driver.
//
// In production DATABASE_URL points at real Neon and the driver talks HTTPS to
// Neon's SQL-over-HTTP endpoint. For local `docker compose` dev there is no
// Neon — just a Postgres container fronted by `local-neon-http-proxy` on :4444.
// When (and only when) DATABASE_URL points at that local host, redirect the
// driver's fetch endpoint to the proxy over plain HTTP. Everywhere else this is
// a no-op, so the production code path is completely unchanged.
//
// Only the app runtime and the tsx seed scripts use the HTTP driver, so they go
// through the proxy. drizzle-kit (migrate/push/studio) speaks the raw Postgres
// wire protocol and connects straight to Postgres on the URL's :5432 — it never
// touches this. The single local DATABASE_URL therefore serves both drivers.
const LOCAL_DB_HOST = 'db.localtest.me'
const LOCAL_PROXY_PORT = 4444

export function configureNeonForLocalDev(connectionString: string): void {
  if (!connectionString.includes(LOCAL_DB_HOST)) return
  neonConfig.fetchEndpoint = (host) => `http://${host}:${LOCAL_PROXY_PORT}/sql`
}
