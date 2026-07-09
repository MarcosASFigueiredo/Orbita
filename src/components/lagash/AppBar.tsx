import { useState } from 'react'
import { LogOut } from 'lucide-react'

// Top bar shared by player + GM views. Title on the left, sign-out on the right.
export function AppBar({ subtitle }: { subtitle?: string }) {
  const [busy, setBusy] = useState(false)

  const onSignOut = async () => {
    setBusy(true)
    // Sign out via the Auth.js endpoint (clears the session + cookie), then
    // full-reload to guarantee a clean, unauthenticated state.
    const { csrfToken } = await fetch('/api/auth/csrf').then((r) => r.json())
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, callbackUrl: '/login' }),
    })
    window.location.href = '/login'
  }

  return (
    <header className="mb-6 flex items-center justify-between gap-4 border-b border-[var(--color-line)] pb-4">
      <div>
        <p className="text-[0.6rem] uppercase tracking-[0.24em] text-[var(--color-mist)]">
          Crônica do Grande Eclipse
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold text-[var(--color-starlight)]">
            Lagash
          </span>
          {subtitle && (
            <span className="text-sm text-[var(--color-mist)]">· {subtitle}</span>
          )}
        </div>
      </div>
      <button type="button" className="btn" onClick={onSignOut} disabled={busy}>
        <LogOut size={16} /> Sair
      </button>
    </header>
  )
}
