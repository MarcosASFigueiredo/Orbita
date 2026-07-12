// Shown to an accepted player who has no PC assigned yet (or whose PC was just
// archived). A themed holding state — not an error — consistent with the
// Observatório look. The SSE feed refetches the loader when the GM assigns a
// sheet, so this swaps to the codex live, no reload needed.
export function WaitingRoom({ displayName }: { displayName: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <div className="plate reveal reveal-d1 w-full p-8 sm:p-10">
        <svg
          viewBox="0 0 80 80"
          className="mx-auto mb-6 h-16 w-16"
          aria-hidden="true"
        >
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="var(--color-gold-faint)"
            strokeWidth="1"
          />
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="var(--color-gold-dim)"
            strokeWidth="1"
            strokeDasharray="4 8"
            className="hero-ring-slow"
            style={{ transformOrigin: '40px 40px' }}
          />
          <circle cx="40" cy="10" r="2.4" fill="var(--color-gold)" />
          <circle cx="40" cy="40" r="3" fill="var(--color-gold-bright)" />
        </svg>

        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-[var(--color-gold)]">
          Crônica dos Seis Sóis
        </p>
        <h1 className="font-display text-3xl font-medium text-[var(--color-starlight)]">
          Bem-vinda, {displayName || 'viajante'}
        </h1>
        <p className="mx-auto mt-4 max-w-sm font-serif text-lg italic leading-relaxed text-[var(--color-text-2)]">
          Seu lugar sob os Seis Sóis está guardado. O Mestre ainda não lhe
          confiou uma ficha — quando o fizer, ela surgirá aqui, sem que você
          precise recarregar a página.
        </p>
        <p className="mt-6 text-sm text-[var(--color-text-3)]">
          Enquanto isso, observe o céu.
        </p>
      </div>
    </main>
  )
}
