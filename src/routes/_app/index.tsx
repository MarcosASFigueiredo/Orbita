import { createFileRoute, redirect } from "@tanstack/react-router";
import { Codex } from "#/components/orbita-suns/Codex";
import { LegacyTrack } from "#/components/orbita-suns/LegacyTrack";
import { MobileDock } from "#/components/orbita-suns/MobileDock";
import { SunsClock } from "#/components/orbita-suns/SunsClock";
import { WaitingRoom } from "#/components/orbita-suns/WaitingRoom";
import { useRealtime } from "#/lib/realtime";
import { useOptimisticData } from "#/lib/optimistic";
import { fetchPlayerHome, updateInsight } from "#/server/data";

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
  const { user } = Route.useRouteContext();
  const [data, mutate] = useOptimisticData(Route.useLoaderData());
  const { character, suns, legacy } = data;
  useRealtime();

  if (!character) {
    return <WaitingRoom displayName={user.displayName} />;
  }

  const characterId = character.id;
  const locked = character.insight_locked_at !== null;

  // Player self-edits only their own Insight (the Insanity die). Optimistic so
  // it feels instant; the sheet text is read-only (the GM authors it).
  const onInsight = (value: number) =>
    mutate(
      (d) => ({
        ...d,
        character: d.character ? { ...d.character, insight: value } : d.character,
      }),
      () => updateInsight({ data: { id: characterId, insight: value } }),
    );

  return (
    <>
      <main className="mx-auto max-w-[880px] px-4 py-6 pb-28 sm:px-6 min-[720px]:pb-8">
        <div id="ficha" className="scroll-mt-20">
          <Codex character={character} locked={locked} onInsight={onInsight} />
        </div>

        <div className="mt-5 grid gap-5 min-[840px]:grid-cols-2">
          <section id="sois" className="plate reveal reveal-d1 tiltable scroll-mt-20 p-6">
            <SunsClock suns={suns} editable={false} />
          </section>
          <section id="legado" className="plate reveal reveal-d2 tiltable scroll-mt-20 p-6">
            <LegacyTrack entries={legacy} editable={false} />
          </section>
        </div>
      </main>
      <MobileDock />
    </>
  );
}
