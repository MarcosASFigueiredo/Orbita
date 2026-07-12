import { useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'

// Subscribe to live changes on the three shared surfaces (Insight lives on
// `characters`, plus `six_suns_state` and `legacy_entries`) via our SSE feed at
// /api/events. Any change re-runs the current route's loaders through
// router.invalidate(), so connected clients refresh within ~2s. The loaders go
// through the authorized server functions, so a player still only ever reads
// rows they may see (their own character + the shared tracks).
//
// The server stream is bounded (~50s); the browser's EventSource reconnects on
// its own. On each reconnect we invalidate once to catch anything that changed
// during the brief gap.
export function useRealtime() {
  const router = useRouter()

  useEffect(() => {
    const source = new EventSource('/api/events')
    let opened = false
    const invalidate = () => {
      void router.invalidate()
    }

    // A change signal arrived while the stream was open.
    source.onmessage = invalidate

    // First open primes the connection; every later (re)open means we may have
    // missed a change during the reconnect gap, so refetch to be safe.
    source.onopen = () => {
      if (opened) invalidate()
      opened = true
    }

    // onerror is left to the browser: on a normal end-of-stream it transparently
    // reconnects (using our `retry` hint); on a fatal error (e.g. 401 after
    // sign-out) it stops, and the app's own auth guards take over.

    return () => {
      source.close()
    }
  }, [router])
}
