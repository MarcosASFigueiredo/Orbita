import { useState } from 'react'
import { UserCheck, UserX } from 'lucide-react'

export type PlayerOption = {
  userId: string
  displayName: string
  /** The PC this player currently owns (if any) — used to warn on a swap. */
  ownsCharacterId: string | null
  ownsCharacterNome: string | null
}

// GM control to bind a PC to an accepted player (one PC per player). Assigning
// to a free player is one click; anything that moves an existing bond — this PC
// already has an owner, or the chosen player already owns another PC — requires
// an explicit confirm, so ownership never changes silently.
export function AssignOwner({
  characterId,
  ownerId,
  ownerName,
  players,
  onAssign,
}: {
  characterId: string
  ownerId: string | null
  ownerName: string | null
  players: PlayerOption[]
  onAssign: (userId: string | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)

  const run = async (userId: string | null) => {
    setBusy(true)
    try {
      await onAssign(userId)
      setOpen(false)
      setConfirming(null)
    } finally {
      setBusy(false)
    }
  }

  // Choosing `target` moves an existing bond when this PC already belongs to
  // someone else, or when the target already owns a different PC.
  const needsConfirm = (opt: PlayerOption) =>
    (ownerId !== null && ownerId !== opt.userId) ||
    (opt.ownsCharacterId !== null && opt.ownsCharacterId !== characterId)

  const pick = (opt: PlayerOption) => {
    if (needsConfirm(opt)) setConfirming(opt.userId)
    else void run(opt.userId)
  }

  return (
    <div className="rounded-sm border border-[var(--color-vein)] bg-[rgba(5,5,7,0.4)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm">
          {ownerName ? (
            <>
              <UserCheck size={13} className="text-[var(--color-verdigris)]" />
              <span className="text-[var(--color-text-2)]">Jogador:</span>
              <span className="text-[var(--color-text)]">{ownerName}</span>
            </>
          ) : (
            <>
              <UserX size={13} className="text-[var(--color-gold-dim)]" />
              <span className="text-[var(--color-gold)]">Sem dono</span>
            </>
          )}
        </span>
        <button
          type="button"
          className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-3)] transition-colors hover:text-[var(--color-gold-bright)]"
          onClick={() => {
            setOpen((v) => !v)
            setConfirming(null)
          }}
        >
          {open ? 'Fechar' : ownerName ? 'Reatribuir' : 'Atribuir'}
        </button>
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-1 border-t border-[var(--color-vein)] pt-3">
          {players.length === 0 && (
            <p className="py-1 font-serif text-sm italic text-[var(--color-text-3)]">
              Nenhum jogador aceitou o convite ainda.
            </p>
          )}

          {players.map((opt) => {
            const isOwner = opt.userId === ownerId
            return (
              <div key={opt.userId} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy || isOwner}
                  onClick={() => pick(opt)}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[2px] px-2 py-1.5 text-left transition-colors hover:bg-[rgba(201,165,88,0.06)] disabled:opacity-45"
                >
                  <span className="min-w-0 truncate text-sm text-[var(--color-text)]">
                    {opt.displayName}
                  </span>
                  {opt.ownsCharacterNome && opt.ownsCharacterId !== characterId && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--color-text-3)]">
                      tem {opt.ownsCharacterNome}
                    </span>
                  )}
                  {isOwner && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--color-verdigris)]">
                      atual
                    </span>
                  )}
                </button>
              </div>
            )
          })}

          {ownerId !== null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(null)}
              className="mt-1 rounded-[2px] px-2 py-1.5 text-left text-sm text-[var(--color-text-3)] transition-colors hover:text-[var(--color-crimson)] disabled:opacity-45"
            >
              Remover dono
            </button>
          )}

          {confirming && (
            <ConfirmSwap
              busy={busy}
              onCancel={() => setConfirming(null)}
              onConfirm={() => void run(confirming)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ConfirmSwap({
  busy,
  onConfirm,
  onCancel,
}: {
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="mt-2 rounded-sm border border-[rgba(179,74,106,0.4)] bg-[rgba(179,74,106,0.05)] p-2.5">
      <p className="mb-2 text-[13px] text-[var(--color-text-2)]">
        Isto troca o dono da ficha. Um jogador só pode ter uma ficha.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-danger h-8 px-3 text-xs"
          disabled={busy}
          onClick={onConfirm}
        >
          Confirmar troca
        </button>
        <button
          type="button"
          className="btn h-8 px-3 text-xs"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
