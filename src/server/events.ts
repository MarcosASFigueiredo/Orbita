// Server-only SSE change feed. Replaces Supabase Realtime.
//
// Vercel serverless can't host a persistent WebSocket, and Neon's HTTP driver
// can't do LISTEN/NOTIFY, so we detect change by polling max(updated_at) across
// the three shared surfaces (Insight lives on `characters`, plus
// `six_suns_state` and `legacy_entries`). The `set_updated_at` trigger
// (drizzle/0001) keeps those timestamps fresh on every write.
//
// The stream is *bounded* (~50s, under the serverless timeout) and emits a
// tiny `{changed:true}` signal — never row data — so the browser's EventSource
// reconnects on its own and the client re-runs its (authorized) loaders. This
// module stays out of the client bundle: it is imported dynamically inside the
// server middleware in src/start.ts.
import '@tanstack/react-start/server-only'

import { max } from 'drizzle-orm'
import { db } from '#/server/db/client'
import { characters, legacyEntries, sixSunsState } from '#/server/db/schema'
import { authSession } from '#/server/auth/config'

const STREAM_MS = 50_000 // bounded window; EventSource reconnects after this
const POLL_MS = 2_000 // how often we check for a change
const HEARTBEAT_MS = 15_000 // comment ping to keep proxies from closing us

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// The most recent write across all shared tracks, as epoch millis (0 if empty).
async function latestChange(): Promise<number> {
  const [c, l, s] = await Promise.all([
    db.select({ ts: max(characters.updatedAt) }).from(characters),
    db.select({ ts: max(legacyEntries.updatedAt) }).from(legacyEntries),
    db.select({ ts: max(sixSunsState.updatedAt) }).from(sixSunsState),
  ])
  const times = [c[0]?.ts, l[0]?.ts, s[0]?.ts].map((t) =>
    t ? new Date(t).getTime() : 0,
  )
  return Math.max(0, ...times)
}

// Open a bounded text/event-stream that pings on every change. Any signed-in
// user may listen: the feed carries no row data (only a "refetch" nudge), and
// the actual reads remain gated by the authz cores in data.core.ts.
export async function handleEventStream(request: Request): Promise<Response> {
  const session = await authSession(request)
  if (!session?.user?.id) {
    return new Response('unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
      // The client navigated away / lost the connection: stop polling.
      request.signal.addEventListener('abort', close)

      const send = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          close()
        }
      }

      // Nudge EventSource to reconnect ~2s after we close the bounded window.
      send('retry: 2000\n\n')

      let baseline = await latestChange()
      const deadline = Date.now() + STREAM_MS
      let lastBeat = Date.now()

      while (!closed && Date.now() < deadline) {
        await sleep(POLL_MS)
        if (closed) break
        try {
          const latest = await latestChange()
          if (latest > baseline) {
            baseline = latest
            send(`data: ${JSON.stringify({ changed: true, ts: latest })}\n\n`)
            lastBeat = Date.now()
          } else if (Date.now() - lastBeat >= HEARTBEAT_MS) {
            send(': keep-alive\n\n')
            lastBeat = Date.now()
          }
        } catch {
          // Transient DB hiccup — keep the stream open and retry next tick.
        }
      }
      close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (nginx/Vercel) so events flush immediately.
      'X-Accel-Buffering': 'no',
    },
  })
}
