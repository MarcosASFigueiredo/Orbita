import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Mail, MoonStar } from 'lucide-react'
import { fetchCurrentUser } from '#/server/auth'
import { requestMagicLink } from '#/lib/auth-client'

const ERRO_MESSAGES: Record<string, string> = {
  nao_convidado: 'Este e-mail não faz parte da mesa. Fale com o Mestre.',
  expirado: 'O link expirou ou já foi usado. Peça um novo abaixo.',
  link_invalido: 'Link inválido. Peça um novo acesso abaixo.',
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    erro: typeof search.erro === 'string' ? search.erro : undefined,
  }),
  beforeLoad: async () => {
    const user = await fetchCurrentUser()
    // Any resolved user is past the allowlist gate — send them into the app.
    // A player with no assigned PC lands on the waiting room, not back here.
    if (user) {
      throw redirect({ to: user.role === 'gm' ? '/gm' : '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { erro } = Route.useSearch()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setMessage('')
    try {
      await requestMagicLink(email.trim())
      setStatus('sent')
    } catch {
      setStatus('error')
      setMessage('Não foi possível enviar o link. Tente novamente em instantes.')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8 text-center">
        <MoonStar className="mx-auto mb-4 text-[var(--color-sun)]" size={40} strokeWidth={1.5} />
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-mist)]">
          Crônica do Grande Eclipse
        </p>
        <h1 className="font-display text-4xl font-semibold text-[var(--color-starlight)]">
          Orbita Suns
        </h1>
      </div>

      <div className="panel p-6 rise-in">
        {erro && ERRO_MESSAGES[erro] && (
          <p className="mb-4 rounded-lg border border-[var(--color-dread-deep)] bg-[rgba(124,42,69,0.15)] p-3 text-sm text-[var(--color-star)]">
            {ERRO_MESSAGES[erro]}
          </p>
        )}

        {status === 'sent' ? (
          <div className="text-center">
            <Mail className="mx-auto mb-3 text-[var(--color-sun)]" size={28} />
            <p className="text-[var(--color-starlight)]">
              Enviamos um link de acesso para <strong>{email}</strong>.
            </p>
            <p className="mt-2 text-sm text-[var(--color-mist)]">
              Abra o link neste dispositivo para entrar na mesa.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="block">
              <span className="field-label">Seu e-mail</span>
              <input
                type="email"
                required
                autoComplete="email"
                className="field-input"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === 'sending' || !email.trim()}
            >
              {status === 'sending' ? 'Enviando…' : 'Receber link de acesso'}
            </button>
            {status === 'error' && (
              <p className="text-sm text-[var(--color-dread)]">{message}</p>
            )}
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-mist-dim)]">
        Acesso por link mágico — sem senha. Apenas convidados da mesa entram.
      </p>
    </main>
  )
}
