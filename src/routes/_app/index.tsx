import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AppBar } from "#/components/lagash/AppBar";
import { CharacterSheet } from "#/components/lagash/CharacterSheet";
import { LegacyTrack } from "#/components/lagash/LegacyTrack";
import { SixSuns } from "#/components/lagash/SixSuns";
import { useLagashRealtime } from "#/lib/realtime";
import {
  fetchPlayerHome,
  updateCharacterFields,
  updateInsight,
} from "#/server/data";
import type { CharacterSheetFields } from "#/lib/game";

export const Route = createFileRoute("/_app/")({
  beforeLoad: ({ context }) => {
    if (context.user.role === "gm") {
      throw redirect({ to: "/gm" });
    }
  },
  loader: () => fetchPlayerHome(),
  component: PlayerHome,
});

function PlayerHome() {
  const { character, suns, legacy } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  useLagashRealtime();

  if (!character) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-6">
        <AppBar subtitle={user.displayName} />
        <p className="panel p-6 text-[var(--color-mist)]">
          Nenhuma ficha atribuída a você ainda. Fale com o Mestre.
        </p>
      </main>
    );
  }

  const locked = character.insight_locked_at !== null;

  const onSaveField = (field: keyof CharacterSheetFields, value: string) => {
    void updateCharacterFields({
      data: { id: character.id, fields: { [field]: value } },
    }).then(() => router.invalidate());
  };
  const onInsight = (value: number) => {
    void updateInsight({ data: { id: character.id, insight: value } }).then(
      () => router.invalidate(),
    );
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <AppBar subtitle={user.displayName} />

      {/* Shared props — read-only for players, live. */}
      <section className="panel mb-6 p-5">
        <SixSuns suns={suns} editable={false} onToggle={() => {}} />
        <div className="mt-5 border-t border-[var(--color-line)] pt-4">
          <LegacyTrack entries={legacy} editable={false} />
        </div>
      </section>

      <CharacterSheet
        character={character}
        editable={!locked}
        onSaveField={onSaveField}
        insightEditable={!locked}
        onInsightChange={onInsight}
        locked={locked}
      />
    </main>
  );
}
