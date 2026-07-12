import { createFileRoute, redirect } from "@tanstack/react-router";
import { Codex } from "#/components/orbita-suns/Codex";
import { LegacyTrack } from "#/components/orbita-suns/LegacyTrack";
import { MobileDock } from "#/components/orbita-suns/MobileDock";
import { SunsClock } from "#/components/orbita-suns/SunsClock";
import { WaitingRoom } from "#/components/orbita-suns/WaitingRoom";
import { useRealtime } from "#/lib/realtime";
import { useOptimisticData } from "#/lib/optimistic";
import { fetchPlayerHome } from "#/server/data";

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
  const [data] = useOptimisticData(Route.useLoaderData());
  const { character, suns, legacy } = data;
  useRealtime();

  if (!character) {
    return <WaitingRoom displayName={user.displayName} />;
  }

  // The whole sheet is read-only for players now — the GM authors the text and
  // controls Insight. Updates arrive live over SSE (useRealtime).
  const locked = character.insight_locked_at !== null;

  return (
    <>
      <main className="mx-auto max-w-[880px] px-4 py-6 pb-28 sm:px-6 min-[720px]:pb-8">
        <div id="ficha" className="scroll-mt-20">
          <Codex character={character} locked={locked} />
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
