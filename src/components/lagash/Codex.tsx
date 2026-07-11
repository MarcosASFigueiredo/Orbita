import { Minus, Plus } from 'lucide-react'
import { InsightConstellation } from './InsightConstellation'
import { insightColor, insightPhase } from '#/lib/insight'
import { INSIGHT_MAX, INSIGHT_MIN } from '#/lib/game'
import type { CharacterRow } from '#/lib/game'

// The player's character sheet as a read-only codex (the GM authors the text in
// the dashboard). The one thing the player writes here is their own Insight —
// the Insanity die can raise it mid-scene — via the −/+ controls, which darken
// the suns of their inner-sky constellation.
export function Codex({
  character,
  locked,
  onInsight,
}: {
  character: CharacterRow
  locked: boolean
  onInsight: (value: number) => void
}) {
  const col = insightColor(character.insight)
  const step = (delta: number) =>
    onInsight(Math.max(INSIGHT_MIN, Math.min(INSIGHT_MAX, character.insight + delta)))

  return (
    <div className="plate reveal tiltable overflow-hidden">
      {/* hero */}
      <div className="relative overflow-hidden px-6 pb-10 pt-11 text-center">
        <Constellation />
        <p className="relative text-[10px] uppercase tracking-[0.32em] text-[var(--color-gold)]">
          {character.ocupacao}
        </p>
        <h2 className="relative font-serif text-[clamp(46px,9vw,72px)] font-medium leading-[0.95] text-[var(--color-starlight)]">
          {character.nome || 'Sem nome'}
        </h2>
        {character.epigrafe && (
          <p className="relative mt-4 font-serif text-[clamp(16px,2.4vw,20px)] italic text-[var(--color-text-2)]">
            “{character.epigrafe}”
          </p>
        )}
        <div className="relative mx-auto mt-6 h-px w-[52px] bg-[var(--color-gold-dim)]">
          <span className="absolute -top-[9px] left-1/2 -translate-x-1/2 text-[11px] text-[var(--color-gold-dim)]">
            ✳
          </span>
        </div>
      </div>

      {/* body */}
      <div className="px-[clamp(20px,6vw,60px)] pb-12 pt-9">
        {/* Insight */}
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-1.5">
          <span className="text-[9.5px] uppercase tracking-[0.24em] text-[var(--color-text-3)]">
            Trilha de Insight
          </span>
          <span className="font-serif text-base italic" style={{ color: col }}>
            {insightPhase(character.insight)} · {character.insight}/6
          </span>
        </div>
        <div className="mb-3 rounded-sm border border-[var(--color-vein)] bg-[rgba(5,5,7,0.5)] px-4 py-6">
          <InsightConstellation insight={character.insight} />
          <div className="mt-5 flex items-center justify-center gap-5">
            <button
              type="button"
              className="btn h-9 w-9 shrink-0 px-0"
              disabled={locked || character.insight <= INSIGHT_MIN}
              onClick={() => step(-1)}
              aria-label="Diminuir Insight"
            >
              <Minus size={15} />
            </button>
            <span className="font-serif text-lg" style={{ color: col }}>
              Insight {character.insight}
              <span className="text-[var(--color-text-3)]">/6</span>
            </span>
            <button
              type="button"
              className="btn h-9 w-9 shrink-0 px-0"
              disabled={locked || character.insight >= INSIGHT_MAX}
              onClick={() => step(1)}
              aria-label="Aumentar Insight"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
        {locked && (
          <p className="mb-8 text-center text-xs font-medium" style={{ color: 'var(--color-crimson)' }}>
            Perdido — este personagem saiu de jogo.
          </p>
        )}

        <Section title="Quem você é" text={character.descricao} />

        {character.vinculo && (
          <section className="mb-8 border-l border-[var(--color-gold)] bg-gradient-to-r from-[var(--color-gold-faint)] to-transparent px-6 py-[18px]">
            <p className="font-serif text-[19px] italic leading-[1.65]">{character.vinculo}</p>
          </section>
        )}

        <div className="grid gap-8 sm:grid-cols-2">
          <Section title="Seu gancho" text={character.gancho} />
          <Section title="Seu medo" text={character.medo} emphatic />
        </div>
        <div className="grid gap-8 sm:grid-cols-2">
          <Section title="O que você quer do grupo" text={character.quer_do_grupo} />
          <Section title="O que você teme perder" text={character.teme_perder} />
        </div>

        <div className="mt-2 border border-[var(--color-vein)] bg-[rgba(5,5,7,0.45)] px-6 py-5 text-[13.5px] font-light leading-[1.85] text-[var(--color-text-2)]">
          <strong className="font-normal text-[var(--color-text)]">O rito dos dados —</strong>{' '}
          junte d6 e conte só o maior: <Die kind="h">H</Die> Humano, sempre ·{' '}
          <Die kind="o">O</Die> Ocupação, se seu ofício ajuda · <Die kind="i">I</Die>{' '}
          Insanidade, opcional — arrisque a mente. <strong className="font-normal text-[var(--color-text)]">1</strong>{' '}
          consegue, com custo. <strong className="font-normal text-[var(--color-text)]">6</strong>{' '}
          impecável. Se o dado de Insanidade sair sozinho como o maior, seu Insight sobe 1.
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  text,
  emphatic = false,
}: {
  title: string
  text: string
  emphatic?: boolean
}) {
  return (
    <section className="mb-8">
      <h3 className="mb-3 flex items-center gap-3 text-[9.5px] uppercase tracking-[0.24em] text-[var(--color-text-3)]">
        {title}
        <span className="h-px flex-1 bg-[var(--color-vein)]" />
      </h3>
      {emphatic ? (
        <p className="font-serif text-[21px] italic leading-snug">{text}</p>
      ) : (
        <p className="text-[15px] font-light leading-[1.8]">{text}</p>
      )}
    </section>
  )
}

const DIE_CLASS: Record<'h' | 'o' | 'i', string> = {
  h: 'text-[var(--color-text)] border-[var(--color-vein)]',
  o: 'text-[var(--color-gold)] border-[var(--color-gold-dim)]',
  i: 'text-[var(--color-crimson)] border-[rgba(179,74,106,0.5)]',
}

function Die({ kind, children }: { kind: 'h' | 'o' | 'i'; children: string }) {
  return (
    <span
      className={`mx-0.5 inline-flex h-[21px] w-[21px] items-center justify-center rounded-[3px] border align-[-5px] text-[10.5px] ${DIE_CLASS[kind]}`}
    >
      {children}
    </span>
  )
}

// Decorative background constellation for the codex hero (static).
function Constellation() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
      viewBox="0 0 900 260"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g stroke="rgba(201,165,88,0.28)" strokeWidth="0.8" fill="none">
        <polyline points="90,70 220,120 370,66 520,138 680,86 810,150" />
      </g>
      <g fill="rgba(232,200,126,0.85)">
        <circle cx="90" cy="70" r="2.4" />
        <circle cx="220" cy="120" r="1.8" />
        <circle cx="370" cy="66" r="2.8" />
        <circle cx="520" cy="138" r="1.8" />
        <circle cx="680" cy="86" r="2.4" />
        <circle cx="810" cy="150" r="1.9" />
      </g>
      <g fill="rgba(236,232,221,0.3)">
        <circle cx="150" cy="200" r="1.1" />
        <circle cx="300" cy="170" r="0.9" />
        <circle cx="460" cy="40" r="1.3" />
        <circle cx="620" cy="210" r="1" />
        <circle cx="770" cy="50" r="1.2" />
        <circle cx="40" cy="160" r="0.9" />
      </g>
    </svg>
  )
}
