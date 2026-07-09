// Lagash VTT — seed data (Drizzle port of the retired supabase/seed.sql).
// Idempotent: safe to re-run (upserts on stable slugs/keys). Run with:
//   pnpm db:seed   (needs a live DATABASE_URL in .env)
//
// Standalone script: builds its own Neon/Drizzle connection instead of the
// server-only client, so it can run under plain tsx.
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { sql } from 'drizzle-orm'
import {
  characterGmNotes,
  characters,
  legacyEntries,
  sixSunsState,
} from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is not set')
const db = drizzle(neon(connectionString), {
  schema: { characterGmNotes, characters, legacyEntries, sixSunsState },
})

// Characters: Halda = fully specified reference; others = pt-BR placeholders
// to be replaced with real content the GM provides.
const SEED_CHARACTERS = [
  {
    slug: 'halda',
    nome: 'Halda',
    ocupacao: 'Astrônoma',
    epigrafe: 'O céu acabou de mentir para você.',
    descricao:
      'Você passou a vida medindo o céu — e é uma das poucas mentes em Lagash capaz de entender o que um número impossível significa. Você lê placas fotográficas, calcula órbitas, enxerga o padrão onde os outros só veem luz.',
    vinculo:
      'A verdade. Os dados, a prova, o mecanismo. Não as pessoas, não os prédios — o saber. E você sabe, no fundo, que trocaria vidas por isso.',
    gancho:
      'A leitura estranha é sua: um instrumento seu registrou, ontem, um valor que não deveria existir. A coceira que não larga a sua cabeça.',
    medo: 'Estar certa.',
    querDoGrupo: 'Que levem os dados a sério antes que seja tarde.',
    temePerder: 'A razão — porque compreender isto por inteiro pode ser insuportável.',
    position: 0,
    atrito:
      'Empurra para publicar/preservar a qualquer custo; sobe rápido no Insight quando confrontada com dados que confirmam o impensável.',
  },
  ...(
    [
      ['vessa', 'Vessa', 'Repórter', 1],
      ['sehra', 'Sehra', 'Arquivista', 2],
      ['orren', 'Orren', 'Clérigo das Seis', 3],
      ['corvin', 'Corvin', 'Oficial da Guarda', 4],
    ] as const
  ).map(([slug, nome, ocupacao, position]) => ({
    slug,
    nome,
    ocupacao,
    epigrafe: '[Epígrafe a definir]',
    descricao:
      '[Descrição a definir — placeholder até o GM fornecer o texto real.]',
    vinculo: '[Vínculo a definir.]',
    gancho: '[Gancho a definir.]',
    medo: '[Medo a definir.]',
    querDoGrupo: '[O que quer do grupo — a definir.]',
    temePerder: '[O que teme perder — a definir.]',
    position,
    atrito: '[Atrito a definir — nota de preparação do GM.]',
  })),
]

async function seed() {
  for (const { atrito, ...c } of SEED_CHARACTERS) {
    const [row] = await db
      .insert(characters)
      .values(c)
      .onConflictDoNothing({ target: characters.slug })
      .returning({ id: characters.id })

    // onConflictDoNothing returns nothing when the row already exists — look it
    // up so the Atrito note still gets seeded on a fresh row.
    const characterId =
      row?.id ??
      (
        await db.query.characters.findFirst({
          where: (t, { eq }) => eq(t.slug, c.slug),
          columns: { id: true },
        })
      )?.id
    if (characterId) {
      await db
        .insert(characterGmNotes)
        .values({ characterId, atrito })
        .onConflictDoNothing({ target: characterGmNotes.characterId })
    }
  }

  // Six Suns — singleton row, all six lit at campaign start.
  await db.insert(sixSunsState).values({ id: true }).onConflictDoNothing()

  // Legacy Track — one example entry so the list renders. Only if empty.
  const existing = await db
    .select({ n: sql<number>`count(*)` })
    .from(legacyEntries)
  if (Number(existing[0]?.n ?? 0) === 0) {
    await db.insert(legacyEntries).values({
      texto: 'A prova existe, e está escondida.',
      status: 'secured',
      position: 0,
    })
  }

  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
