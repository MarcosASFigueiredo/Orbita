import { useState } from 'react'
import { Mail, RotateCw, UserPlus, X } from 'lucide-react'
import type { InviteRow } from '#/lib/game'

// GM-only panel: invite players (fires the same magic-link flow as /login) and
// manage the resulting invites. Status is derived by the server (pending until
// the account exists). Invites aren't in the SSE feed, so the parent refetches
// (router.invalidate) after each action rather than relying on live sync.
export function InvitePanel({
  invites,
  onInvite,
  onResend,
  onRevoke,
}: {
  invites: InviteRow[]
  onInvite: (email: string, displayName: string) => Promise<void>
  onResend: (email: string) => Promise<void>
  onRevoke: (email: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSentTo(null)
    try {
      await onInvite(email.trim(), nome.trim())
      setSentTo(email.trim())
      setEmail('')
      setNome('')
    } catch (err) {
      setError(inviteError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="plate reveal tiltable p-6">
      <p className="plate-title">
        <span className="glyph">✦</span>Convidar jogador
      </p>

      <form onSubmit={submit} className="mb-5 flex flex-col gap-3">
        <label className="block">
          <span className="field-label">E-mail</span>
          <input
            type="email"
            required
            autoComplete="off"
            className="field-input"
            placeholder="jogador@exemplo.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
              setSentTo(null)
            }}
          />
        </label>
        <label className="block">
          <span className="field-label">Nome de exibição (opcional)</span>
          <input
            type="text"
            className="field-input"
            placeholder="Como aparece na mesa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !email.trim()}
        >
          <UserPlus size={15} />
          {busy ? 'Enviando…' : 'Enviar convite'}
        </button>
        {error && (
          <p className="text-sm text-[var(--color-crimson)]">{error}</p>
        )}
        {sentTo && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--color-verdigris)]">
            <Mail size={14} />
            Link enviado para {sentTo}.
          </p>
        )}
      </form>

      {invites.length === 0 ? (
        <p className="py-4 text-center font-serif text-sm italic text-[var(--color-text-3)]">
          Nenhum convite ainda. Chame o primeiro jogador acima.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {invites.map((inv) => (
            <InviteRowItem
              key={inv.email}
              invite={inv}
              onResend={onResend}
              onRevoke={onRevoke}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function InviteRowItem({
  invite,
  onResend,
  onRevoke,
}: {
  invite: InviteRow
  onResend: (email: string) => Promise<void>
  onRevoke: (email: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const accepted = invite.status === 'accepted'

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex items-center gap-3 border-b border-[var(--color-vein)] py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-serif text-base font-medium text-[var(--color-text)]">
          {invite.display_name || invite.email}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-3)]">
          {invite.display_name ? invite.email : invite.role}
        </span>
        {accepted && (
          <span className="mt-1 block text-[11px] text-[var(--color-text-2)]">
            {invite.assigned_character
              ? `Ficha: ${invite.assigned_character.nome}`
              : 'Sem ficha atribuída'}
          </span>
        )}
      </span>

      <StatusChip status={invite.status} />

      {accepted ? null : (
        <span className="flex shrink-0 items-center gap-1">
          <IconButton
            title="Reenviar link"
            disabled={busy}
            onClick={() => run(() => onResend(invite.email))}
          >
            <RotateCw size={14} />
          </IconButton>
          <IconButton
            title="Revogar convite"
            danger
            disabled={busy}
            onClick={() => run(() => onRevoke(invite.email))}
          >
            <X size={14} />
          </IconButton>
        </span>
      )}
    </li>
  )
}

function StatusChip({ status }: { status: InviteRow['status'] }) {
  const accepted = status === 'accepted'
  return (
    <span
      className="shrink-0 rounded-[2px] border px-2 py-1 text-[9.5px] uppercase tracking-[0.14em]"
      style={{
        borderColor: accepted
          ? 'rgba(107, 154, 138, 0.5)'
          : 'var(--color-gold-dim)',
        color: accepted ? 'var(--color-verdigris)' : 'var(--color-gold)',
      }}
    >
      {accepted ? 'Aceito' : 'Pendente'}
    </span>
  )
}

function IconButton({
  title,
  danger,
  disabled,
  onClick,
  children,
}: {
  title: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-[2px] border border-transparent transition-colors disabled:opacity-40 ${
        danger
          ? 'text-[var(--color-text-3)] hover:border-[var(--color-crimson)] hover:text-[var(--color-crimson)]'
          : 'text-[var(--color-text-3)] hover:border-[var(--color-gold-dim)] hover:text-[var(--color-gold-bright)]'
      }`}
    >
      {children}
    </button>
  )
}

function inviteError(err: unknown): string {
  const key = err instanceof Error ? err.message : ''
  switch (key) {
    case 'invalid_email':
      return 'E-mail inválido. Confira o endereço.'
    case 'already_accepted':
      return 'Este jogador já entrou — não é possível revogar.'
    case 'not_found':
      return 'Convite não encontrado.'
    default:
      return 'Não foi possível concluir. Tente novamente.'
  }
}
