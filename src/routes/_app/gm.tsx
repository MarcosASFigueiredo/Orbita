import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { AppBar } from "#/components/lagash/AppBar";
import { CharacterSheet } from "#/components/lagash/CharacterSheet";
import { LegacyTrack } from "#/components/lagash/LegacyTrack";
import { SixSuns } from "#/components/lagash/SixSuns";
import { useLagashRealtime } from "#/lib/realtime";
import {
  addLegacyEntry,
  deleteLegacyEntry,
  fetchGmDashboard,
  lockCharacter,
  setSuns,
  updateAtrito,
  updateCharacterFields,
  updateInsight,
  updateLegacyEntry,
} from "#/server/data";
import type {
  CharacterRow,
  CharacterSheetFields,
  LegacyStatus,
} from "#/lib/game";

export const Route = createFileRoute("/_app/gm")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "gm") {
      throw redirect({ to: "/" });
    }
  },
  loader: () => fetchGmDashboard(),
  component: GmDashboard,
});

function GmDashboard() {
  const { characters, atrito, suns, legacy } = Route.useLoaderData();
  const router = useRouter();
  useLagashRealtime();

  const refresh = () => router.invalidate();

  const onToggleSun = (index: number) => {
    const next = Array.from({ length: 6 }, (_, i) =>
      i === index ? !suns[i] : suns[i],
    );
    void setSuns({ data: { suns: next } }).then(refresh);
  };

  const pendingSacrifice = characters.filter(
    (c) => c.insight >= 6 && c.insight_locked_at === null,
  );

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <AppBar subtitle="Painel do Mestre" />

      {pendingSacrifice.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {pendingSacrifice.map((c) => (
            <SacrificePrompt key={c.id} character={c} onDone={refresh} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6 lg:grid-cols-2">
          {characters.map((c) => (
            <CharacterSheet
              key={c.id}
              character={c}
              editable
              compact
              locked={c.insight_locked_at !== null}
              onSaveField={(field: keyof CharacterSheetFields, value: string) =>
                void updateCharacterFields({
                  data: { id: c.id, fields: { [field]: value } },
                }).then(refresh)
              }
              insightEditable
              onInsightChange={(value: number) =>
                void updateInsight({ data: { id: c.id, insight: value } }).then(
                  refresh,
                )
              }
              atrito={atrito[c.id] ?? ""}
              onSaveAtrito={(value: string) =>
                void updateAtrito({
                  data: { characterId: c.id, atrito: value },
                }).then(refresh)
              }
            />
          ))}
        </div>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
          <section className="panel p-5">
            <SixSuns suns={suns} editable onToggle={onToggleSun} />
          </section>
          <section className="panel p-5">
            <LegacyTrack
              entries={legacy}
              editable
              onAdd={(texto) =>
                void addLegacyEntry({
                  data: { texto, position: legacy.length },
                }).then(refresh)
              }
              onSetStatus={(id: string, status: LegacyStatus) =>
                void updateLegacyEntry({ data: { id, status } }).then(refresh)
              }
              onEditText={(id: string, texto: string) =>
                void updateLegacyEntry({ data: { id, texto } }).then(refresh)
              }
              onDelete={(id: string) =>
                void deleteLegacyEntry({ data: { id } }).then(refresh)
              }
            />
          </section>
        </aside>
      </div>
    </main>
  );
}

// When a PC reaches Insight 6, the player may spend their last lucid moment to
// lock one entry into the Legacy Track before the character is lost.
function SacrificePrompt({
  character,
  onDone,
}: {
  character: CharacterRow;
  onDone: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = async (withEntry: boolean) => {
    setBusy(true);
    if (withEntry && texto.trim()) {
      await addLegacyEntry({
        data: { texto: texto.trim(), status: "secured" },
      });
    }
    await lockCharacter({ data: { id: character.id, locked: true } });
    onDone();
  };

  return (
    <div className="panel border-[var(--color-dread-deep)] p-4">
      <div className="mb-3 flex items-center gap-2 text-[var(--color-dread)]">
        <TriangleAlert size={18} />
        <p className="font-semibold">
          {character.nome} chegou ao Insight 6 — o último momento lúcido.
        </p>
      </div>
      <p className="mb-3 text-sm text-[var(--color-mist)]">
        Grave uma última coisa na Trilha do Legado antes de {character.nome} se
        perder.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          className="field-input"
          placeholder="O que fica assegurado…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary shrink-0"
          disabled={busy || !texto.trim()}
          onClick={() => commit(true)}
        >
          Gravar no Legado e encerrar
        </button>
        <button
          type="button"
          className="btn btn-danger shrink-0"
          disabled={busy}
          onClick={() => commit(false)}
        >
          Apenas encerrar
        </button>
      </div>
    </div>
  );
}
