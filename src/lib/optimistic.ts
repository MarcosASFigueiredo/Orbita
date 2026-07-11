import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'

// Optimistic view over route loader data.
//
// Components render `data` — a local copy of the loader result. A mutation
// applies its change to `data` *immediately* (so the edit feels instant), then
// runs the server call in the background. The SSE-driven router.invalidate()
// later refetches the loader and this hook reconciles to server truth.
//
// While any mutation is in flight we do NOT adopt incoming loader data, so a
// background refetch can't clobber an optimistic edit mid-action. On failure we
// revert to the last known server truth and force a fresh read.
//
// `mutate(apply, commit)` is fire-and-forget (safe to call from onClick):
//   - apply:  pure (prev) => next  — the optimistic transform
//   - commit: () => Promise         — the server call to persist it
export function useOptimisticData<T>(loaderData: T) {
  const router = useRouter()
  const [data, setData] = useState<T>(loaderData)
  const truth = useRef<T>(loaderData)
  const pending = useRef(0)

  useEffect(() => {
    truth.current = loaderData
    // Adopt server truth only when we're not mid-edit (see note above).
    if (pending.current === 0) setData(loaderData)
  }, [loaderData])

  const mutate = useCallback(
    (apply: (prev: T) => T, commit: () => Promise<unknown>) => {
      setData((prev) => apply(prev))
      pending.current += 1
      void commit()
        .catch(() => {
          // Roll back to the last server truth and refetch to resync.
          setData(truth.current)
          void router.invalidate()
        })
        .finally(() => {
          pending.current -= 1
        })
    },
    [router],
  )

  return [data, mutate] as const
}
