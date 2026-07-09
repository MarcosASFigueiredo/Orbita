import { AutoField } from './AutoField'
import { InsightTrack } from './InsightTrack'
import type { CharacterRow, CharacterSheetFields } from '#/lib/game'

interface CharacterSheetProps {
  character: CharacterRow
  editable: boolean
  onSaveField: (field: keyof CharacterSheetFields, value: string) => void
  insightEditable: boolean
  onInsightChange: (value: number) => void
  /** GM-only Atrito. `undefined` => not the GM => the field is not rendered at all. */
  atrito?: string
  onSaveAtrito?: (value: string) => void
  locked?: boolean
  compact?: boolean
}

// One character sheet. Player renders their own (editable, no Atrito); GM
// renders any (editable + Atrito). Atrito is only passed for the GM, so a
// player's DOM never contains it.
export function CharacterSheet({
  character,
  editable,
  onSaveField,
  insightEditable,
  onInsightChange,
  atrito,
  onSaveAtrito,
  locked = false,
  compact = false,
}: CharacterSheetProps) {
  const field = (key: keyof CharacterSheetFields, label: string, multiline = false) => (
    <AutoField
      label={label}
      value={character[key]}
      onSave={(v) => onSaveField(key, v)}
      multiline={multiline}
      disabled={!editable}
    />
  )

  return (
    <article className={`panel rise-in ${compact ? 'p-4' : 'p-5 sm:p-7'}`}>
      <header className="mb-4 border-b border-[var(--color-line)] pb-4">
        <h2
          className={`font-display font-semibold leading-tight text-[var(--color-starlight)] ${
            compact ? 'text-2xl' : 'text-3xl sm:text-4xl'
          }`}
        >
          {character.nome || 'Sem nome'}
        </h2>
        <p className="mt-1 text-sm font-medium uppercase tracking-[0.14em] text-[var(--color-sun)]">
          {character.ocupacao}
        </p>
        {character.epigrafe && (
          <p className="mt-2 font-display text-base italic text-[var(--color-mist)]">
            “{character.epigrafe}”
          </p>
        )}
      </header>

      <div className="mb-5">
        <InsightTrack
          value={character.insight}
          editable={insightEditable}
          onChange={onInsightChange}
          locked={locked}
          compact={compact}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {field('nome', 'Nome')}
          {field('ocupacao', 'Ocupação')}
          {field('epigrafe', 'Epígrafe')}
        </div>
        {field('descricao', 'Descrição', true)}
        {field('vinculo', 'Vínculo — o que você quer que sobreviva à escuridão', true)}
        {field('gancho', 'Seu Gancho', true)}
        {field('medo', 'Seu Medo')}
        {field('quer_do_grupo', 'O que você quer do grupo')}
        {field('teme_perder', 'O que você teme perder', true)}

        {atrito !== undefined && (
          <div className="mt-1 rounded-lg border border-[var(--color-dread-deep)] bg-[rgba(124,42,69,0.1)] p-3">
            <AutoField
              label="Atrito · nota do Mestre (oculto do jogador)"
              value={atrito}
              onSave={(v) => onSaveAtrito?.(v)}
              multiline
            />
          </div>
        )}
      </div>
    </article>
  )
}
