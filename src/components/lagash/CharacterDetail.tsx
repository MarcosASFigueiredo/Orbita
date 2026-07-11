import { Lock } from 'lucide-react'
import { AutoField } from './AutoField'
import { InsightDial } from './InsightDial'
import { insightColor, insightPhase } from '#/lib/insight'
import { INSIGHT_MAX, INSIGHT_MIN } from '#/lib/game'
import type { CharacterRow, CharacterSheetFields } from '#/lib/game'

// The GM's editing view for the selected character: engraved header + Insight
// instrument dial, the −/+ controls with the thematic phase between them, all
// editable sheet fields, and the crimson GM-only Atrito. Editing is disabled
// once the PC is locked (lost at Insight 6). Fields save on blur (AutoField).
export function CharacterDetail({
  character,
  atrito,
  locked,
  onSaveField,
  onInsight,
  onSaveAtrito,
}: {
  character: CharacterRow
  atrito: string
  locked: boolean
  onSaveField: (field: keyof CharacterSheetFields, value: string) => void
  onInsight: (value: number) => void
  onSaveAtrito: (value: string) => void
}) {
  const col = insightColor(character.insight)
  const step = (delta: number) =>
    onInsight(Math.max(INSIGHT_MIN, Math.min(INSIGHT_MAX, character.insight + delta)))

  return (
    <div className="plate reveal reveal-d1 tiltable p-6 sm:p-7">
      <div className="mb-2 flex items-start justify-between gap-5">
        <div className="min-w-0">
          <h2 className="font-serif text-4xl font-medium leading-none text-[var(--color-starlight)] sm:text-[42px]">
            {character.nome || 'Sem nome'}
          </h2>
          <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[var(--color-gold)]">
            {character.ocupacao}
          </p>
          {character.epigrafe && (
            <p className="mt-2 font-serif text-lg italic text-[var(--color-text-2)]">
              “{character.epigrafe}”
            </p>
          )}
        </div>
        <div className="shrink-0 text-center">
          <InsightDial value={character.insight} />
          <p className="mt-1 text-[8.5px] uppercase tracking-[0.2em] text-[var(--color-text-3)]">
            Insight
          </p>
        </div>
      </div>

      <div className="my-6 flex items-center justify-center gap-3.5 rounded-sm border border-[var(--color-vein)] bg-[rgba(5,5,7,0.5)] p-3.5">
        <button
          type="button"
          className="btn h-8 w-8 px-0 text-lg"
          disabled={locked || character.insight <= INSIGHT_MIN}
          onClick={() => step(-1)}
          aria-label="Diminuir Insight"
        >
          −
        </button>
        <span
          className="min-w-[190px] text-center font-serif text-[15px] italic"
          style={{ color: col }}
        >
          {insightPhase(character.insight)}
        </span>
        <button
          type="button"
          className="btn h-8 w-8 px-0 text-lg"
          disabled={locked || character.insight >= INSIGHT_MAX}
          onClick={() => step(1)}
          aria-label="Aumentar Insight"
        >
          +
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <AutoField label="Nome" value={character.nome} onSave={(v) => onSaveField('nome', v)} disabled={locked} />
          <AutoField label="Ocupação" value={character.ocupacao} onSave={(v) => onSaveField('ocupacao', v)} disabled={locked} />
          <AutoField label="Epígrafe" value={character.epigrafe} onSave={(v) => onSaveField('epigrafe', v)} disabled={locked} />
        </div>
        <AutoField label="Descrição" value={character.descricao} onSave={(v) => onSaveField('descricao', v)} multiline disabled={locked} />
        <div className="grid gap-4 sm:grid-cols-2">
          <AutoField label="Vínculo" value={character.vinculo} onSave={(v) => onSaveField('vinculo', v)} multiline disabled={locked} />
          <AutoField label="Gancho" value={character.gancho} onSave={(v) => onSaveField('gancho', v)} multiline disabled={locked} />
        </div>
        <AutoField label="Medo" value={character.medo} onSave={(v) => onSaveField('medo', v)} disabled={locked} />
        <div className="grid gap-4 sm:grid-cols-2">
          <AutoField label="O que quer do grupo" value={character.quer_do_grupo} onSave={(v) => onSaveField('quer_do_grupo', v)} disabled={locked} />
          <AutoField label="O que teme perder" value={character.teme_perder} onSave={(v) => onSaveField('teme_perder', v)} multiline disabled={locked} />
        </div>

        <div className="rounded-sm border border-[rgba(179,74,106,0.4)] bg-[rgba(179,74,106,0.04)] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[var(--color-crimson)]">
            <Lock size={11} />
            <span className="text-[9px] uppercase tracking-[0.2em]">
              Atrito · visível apenas ao mestre
            </span>
          </div>
          <AutoField label="" value={atrito} onSave={onSaveAtrito} multiline />
        </div>
      </div>
    </div>
  )
}
