import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { PlayerOption } from "#/components/lagash/AssignOwner";
import { CharacterDetail } from "#/components/lagash/CharacterDetail";
import { InvitePanel } from "#/components/lagash/InvitePanel";
import { LegacyTrack } from "#/components/lagash/LegacyTrack";
import { NpcPanel } from "#/components/lagash/NpcPanel";
import { Roster } from "#/components/lagash/Roster";
import { SunsClock } from "#/components/lagash/SunsClock";
import { useLagashRealtime } from "#/lib/realtime";
import { useOptimisticData } from "#/lib/optimistic";
import { requestMagicLink } from "#/lib/auth-client";
import {
  addLegacyEntry,
  archiveCharacterSheet,
  archiveNpcSheet,
  assignCharacterOwner,
  createCharacterSheet,
  createNpcSheet,
  deleteLegacyEntry,
  fetchGmDashboard,
  invitePlayer,
  lockCharacter,
  resendPlayerInvite,
  restoreCharacterSheet,
  restoreNpcSheet,
  revokePlayerInvite,
  setSuns,
  updateNpc,
  updateAtrito,
  updateCharacterFields,
  updateInsight,
  updateLegacyEntry,
} from "#/server/data";
import type {
  CharacterRow,
  CharacterSheetFields,
  LegacyEntryRow,
  LegacyStatus,
  NpcFields,
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

// A placeholder Legacy row shown instantly on add; the SSE refetch swaps it for
// the real DB row (with its real id) within ~1s.
function tempLegacy(texto: string, position: number): LegacyEntryRow {
  const now = new Date().toISOString();
  return {
    id: `temp-${now}-${Math.random().toString(36).slice(2)}`,
    texto,
    status: "secured",
    position,
    created_at: now,
    updated_at: now,
  };
}

function GmDashboard() {
  const router = useRouter();
  const [data, mutate] = useOptimisticData(Route.useLoaderData());
  const { characters, archivedCharacters, atrito, suns, legacy, invites, npcs } =
    data;
  const [picked, setPicked] = useState<string | null>(null);
  useLagashRealtime();

  // Accepted players (a magic-link login created their account) are the only
  // valid assignment targets. Build the owner-name map + assignment options,
  // including each player's currently-owned PC so the assign UI can warn on a
  // swap (one PC per player).
  const accepted = invites.filter((i) => i.status === "accepted" && i.user_id);
  const owners: Record<string, string> = {};
  for (const inv of accepted) {
    if (inv.user_id) owners[inv.user_id] = inv.display_name || inv.email;
  }
  const players: PlayerOption[] = accepted.map((inv) => ({
    userId: inv.user_id as string,
    displayName: inv.display_name || inv.email,
    ownsCharacterId: inv.assigned_character?.id ?? null,
    ownsCharacterNome: inv.assigned_character?.nome ?? null,
  }));

  // Invites live outside the optimistic overlay: they aren't in the SSE feed,
  // so each action persists then forces a loader refetch to reflect the derived
  // status. The magic link reuses the exact Auth.js/Resend path as /login.
  const onInvite = async (email: string, displayName: string) => {
    const res = await invitePlayer({ data: { email, displayName } });
    if (!res.ok) throw new Error(res.error ?? "error");
    await requestMagicLink(email);
    await router.invalidate();
  };

  const onResendInvite = async (email: string) => {
    const res = await resendPlayerInvite({ data: { email } });
    if (!res.ok) throw new Error(res.error ?? "error");
    // Server invalidated the old link; mint a fresh one via the same path.
    await requestMagicLink(email);
    await router.invalidate();
  };

  const onRevokeInvite = async (email: string) => {
    const res = await revokePlayerInvite({ data: { email } });
    if (!res.ok) throw new Error(res.error ?? "error");
    await router.invalidate();
  };

  // Create a PC (GM-only). Await the real row, refetch, then select it so the
  // GM lands in the detail editor to fill the rest of the sheet.
  const onCreateCharacter = async (nome: string) => {
    const res = await createCharacterSheet({ data: { nome } });
    if (!res.ok || !res.character) throw new Error(res.error ?? "error");
    await router.invalidate();
    setPicked(res.character.id);
  };

  // Assignment / archive of PCs: persist then refetch (owner + archive state
  // aren't part of the optimistic sheet overlay).
  const onAssign = async (characterId: string, userId: string | null) => {
    const res = await assignCharacterOwner({ data: { characterId, userId } });
    if (!res.ok) throw new Error(res.error ?? "error");
    await router.invalidate();
  };

  const onArchiveCharacter = async (id: string) => {
    const res = await archiveCharacterSheet({ data: { id } });
    if (!res.ok) throw new Error(res.error ?? "error");
    setPicked(null);
    await router.invalidate();
  };

  const onRestoreCharacter = async (id: string) => {
    const res = await restoreCharacterSheet({ data: { id } });
    if (!res.ok) throw new Error(res.error ?? "error");
    await router.invalidate();
  };

  // NPCs, like invites, live outside the optimistic overlay (not in the SSE
  // feed): persist then refetch.
  const onCreateNpc = async (fields: NpcFields) => {
    const res = await createNpcSheet({ data: fields });
    if (!res.ok) throw new Error(res.error ?? "error");
    await router.invalidate();
  };

  const onEditNpc = async (id: string, fields: Partial<NpcFields>) => {
    const res = await updateNpc({ data: { id, fields } });
    if (!res.ok) throw new Error(res.error ?? "error");
    await router.invalidate();
  };

  const onArchiveNpc = async (id: string) => {
    const res = await archiveNpcSheet({ data: { id } });
    if (!res.ok) throw new Error(res.error ?? "error");
    await router.invalidate();
  };

  const onRestoreNpc = async (id: string) => {
    const res = await restoreNpcSheet({ data: { id } });
    if (!res.ok) throw new Error(res.error ?? "error");
    await router.invalidate();
  };

  // Default the detail pane to the first character; keep the caller's pick when
  // it still exists (survives realtime list changes).
  const selected =
    characters.find((c) => c.id === picked) ?? characters[0] ?? null;

  const onSetSuns = (next: boolean[]) =>
    mutate(
      (d) => ({ ...d, suns: next }),
      () => setSuns({ data: { suns: next } }),
    );

  const onSaveField = (
    id: string,
    field: keyof CharacterSheetFields,
    value: string,
  ) =>
    mutate(
      (d) => ({
        ...d,
        characters: d.characters.map((c) =>
          c.id === id ? { ...c, [field]: value } : c,
        ),
      }),
      () => updateCharacterFields({ data: { id, fields: { [field]: value } } }),
    );

  const onInsight = (id: string, value: number) =>
    mutate(
      (d) => ({
        ...d,
        characters: d.characters.map((c) =>
          c.id === id ? { ...c, insight: value } : c,
        ),
      }),
      () => updateInsight({ data: { id, insight: value } }),
    );

  const onSaveAtrito = (id: string, value: string) =>
    mutate(
      (d) => ({ ...d, atrito: { ...d.atrito, [id]: value } }),
      () => updateAtrito({ data: { characterId: id, atrito: value } }),
    );

  const onAddLegacy = (texto: string) =>
    mutate(
      (d) => ({ ...d, legacy: [...d.legacy, tempLegacy(texto, d.legacy.length)] }),
      () => addLegacyEntry({ data: { texto, position: legacy.length } }),
    );

  const onSetLegacyStatus = (id: string, status: LegacyStatus) =>
    mutate(
      (d) => ({
        ...d,
        legacy: d.legacy.map((e) => (e.id === id ? { ...e, status } : e)),
      }),
      () => updateLegacyEntry({ data: { id, status } }),
    );

  const onEditLegacyText = (id: string, texto: string) =>
    mutate(
      (d) => ({
        ...d,
        legacy: d.legacy.map((e) => (e.id === id ? { ...e, texto } : e)),
      }),
      () => updateLegacyEntry({ data: { id, texto } }),
    );

  const onDeleteLegacy = (id: string) =>
    mutate(
      (d) => ({ ...d, legacy: d.legacy.filter((e) => e.id !== id) }),
      () => deleteLegacyEntry({ data: { id } }),
    );

  // Lock the PC (and optionally record a final Legacy entry) at Insight 6.
  const onSacrifice = (character: CharacterRow, texto: string | null) =>
    mutate(
      (d) => ({
        ...d,
        legacy: texto ? [...d.legacy, tempLegacy(texto, d.legacy.length)] : d.legacy,
        characters: d.characters.map((c) =>
          c.id === character.id
            ? { ...c, insight_locked_at: new Date().toISOString() }
            : c,
        ),
      }),
      async () => {
        if (texto) await addLegacyEntry({ data: { texto, status: "secured" } });
        await lockCharacter({ data: { id: character.id, locked: true } });
      },
    );

  const pendingSacrifice = characters.filter(
    (c) => c.insight >= 6 && c.insight_locked_at === null,
  );

  return (
    <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-9">
      <p className="plate-title mb-6">
        <span className="glyph">✦</span>Painel do Mestre
      </p>

      {pendingSacrifice.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {pendingSacrifice.map((c) => (
            <SacrificePrompt
              key={c.id}
              character={c}
              onCommit={(texto) => onSacrifice(c, texto)}
            />
          ))}
        </div>
      )}

      <div className="grid items-start gap-5 min-[1150px]:grid-cols-[288px_1fr_320px]">
        <div className="flex flex-col gap-5">
          <InvitePanel
            invites={invites}
            onInvite={onInvite}
            onResend={onResendInvite}
            onRevoke={onRevokeInvite}
          />
          <Roster
            characters={characters}
            archivedCharacters={archivedCharacters}
            owners={owners}
            selectedId={selected?.id ?? null}
            onSelect={setPicked}
            onCreate={onCreateCharacter}
            onRestore={onRestoreCharacter}
          />
        </div>

        {selected ? (
          <CharacterDetail
            character={selected}
            atrito={atrito[selected.id] ?? ""}
            locked={selected.insight_locked_at !== null}
            ownerName={
              selected.owner_user_id
                ? (owners[selected.owner_user_id] ?? "Jogador")
                : null
            }
            players={players}
            onSaveField={(field, value) => onSaveField(selected.id, field, value)}
            onInsight={(value) => onInsight(selected.id, value)}
            onSaveAtrito={(value) => onSaveAtrito(selected.id, value)}
            onAssign={(userId) => onAssign(selected.id, userId)}
            onArchive={() => onArchiveCharacter(selected.id)}
          />
        ) : (
          <div className="plate p-6 text-center font-serif italic text-[var(--color-text-3)]">
            Nenhum personagem na crônica ainda.
          </div>
        )}

        <div className="flex flex-col gap-5">
          <section className="plate reveal reveal-d2 tiltable p-6">
            <SunsClock suns={suns} editable onChange={onSetSuns} />
          </section>
          <section className="plate reveal reveal-d3 tiltable p-6">
            <LegacyTrack
              entries={legacy}
              editable
              onAdd={onAddLegacy}
              onSetStatus={onSetLegacyStatus}
              onEditText={onEditLegacyText}
              onDelete={onDeleteLegacy}
            />
          </section>
        </div>
      </div>

      <section className="mt-5">
        <NpcPanel
          npcs={npcs}
          onCreate={onCreateNpc}
          onEdit={onEditNpc}
          onArchive={onArchiveNpc}
          onRestore={onRestoreNpc}
        />
      </section>
    </main>
  );
}

// When a PC reaches Insight 6, the player may spend their last lucid moment to
// lock one entry into the Legacy Track before the character is lost.
function SacrificePrompt({
  character,
  onCommit,
}: {
  character: CharacterRow;
  onCommit: (texto: string | null) => void;
}) {
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = (withEntry: boolean) => {
    setBusy(true);
    onCommit(withEntry && texto.trim() ? texto.trim() : null);
  };

  return (
    <div className="plate border-[var(--color-crimson-deep)] p-4">
      <div className="mb-3 flex items-center gap-2 text-[var(--color-crimson)]">
        <TriangleAlert size={18} />
        <p className="font-serif text-lg font-medium">
          {character.nome} chegou ao Insight 6 — o último momento lúcido.
        </p>
      </div>
      <p className="mb-3 text-sm text-[var(--color-text-2)]">
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
