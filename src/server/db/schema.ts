// Lagash VTT — Drizzle schema for Neon Postgres.
//
// Preserves the original game data model, with two structural changes from the
// stack it was migrated off:
//   1. The old 1:1 profiles table is folded into the Auth.js `users` table
//      (role + display name live as columns on the user). Auth.js owns identity.
//   2. Row-level security is not a DB feature here — RLS policies, is_gm()/
//      new-user helpers, the column-guard trigger and the realtime publication
//      do NOT live in the DB anymore. Role/ownership is enforced in the server
//      fns (src/server/data.core.ts); live sync is SSE-over-polling
//      (src/server/events.ts). The only trigger we keep is set_updated_at
//      (drizzle/0001_updated_at_triggers.sql), because the SSE change feed reads
//      max(updated_at) across the shared tracks.

import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const appRole = pgEnum('app_role', ['gm', 'player'])
export const legacyStatus = pgEnum('legacy_status', [
  'secured',
  'threatened',
  'lost',
])

// ---------------------------------------------------------------------------
// Auth.js adapter tables (@auth/drizzle-adapter canonical shape).
// Wired up in step c; defined now so the schema/migration is generated once.
// `role` is our only addition to the standard `users` table — it replaces the
// old `profiles.role`; `name` carries the display name.
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  role: appRole('role').notNull().default('player'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
)

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
})

// Magic-link tokens are stored here by the Auth.js Email provider.
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
)

// ---------------------------------------------------------------------------
// Allowlist: the GM pre-seeds who may log in and what role/character they get.
// Keyed by email; character mapping uses the stable character slug. Consulted
// by the Auth.js signIn callback (step c) to gate + provision accounts.
// ---------------------------------------------------------------------------
export const invitedUsers = pgTable('invited_users', {
  email: text('email').primaryKey(),
  role: appRole('role').notNull().default('player'),
  characterSlug: text('character_slug'),
  displayName: text('display_name').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---------------------------------------------------------------------------
// Character sheets (public fields — visible to owner + GM).
// ---------------------------------------------------------------------------
export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(), // stable id: 'halda', 'vessa', ...
    ownerUserId: text('owner_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    nome: text('nome').notNull().default(''),
    ocupacao: text('ocupacao').notNull().default(''),
    epigrafe: text('epigrafe').notNull().default(''),
    descricao: text('descricao').notNull().default(''),
    vinculo: text('vinculo').notNull().default(''),
    gancho: text('gancho').notNull().default(''),
    medo: text('medo').notNull().default(''),
    querDoGrupo: text('quer_do_grupo').notNull().default(''),
    temePerder: text('teme_perder').notNull().default(''),
    insight: smallint('insight').notNull().default(0),
    insightLockedAt: timestamp('insight_locked_at', { withTimezone: true }),
    position: smallint('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check('characters_insight_range', sql`${t.insight} between 0 and 6`)],
)

// Atrito — GM-only prep note. Separate table so an accidental over-broad read
// still can't leak it (defense in depth, same as the old RLS split).
export const characterGmNotes = pgTable('character_gm_notes', {
  characterId: uuid('character_id')
    .primaryKey()
    .references(() => characters.id, { onDelete: 'cascade' }),
  atrito: text('atrito').notNull().default(''),
})

// Six Suns — a single shared, table-wide row. `suns[i]` = is sun i still lit.
// The boolean PK defaulting to true + a check(id) constraint is the singleton
// guard: only one row can ever exist.
export const sixSunsState = pgTable(
  'six_suns_state',
  {
    id: boolean('id').primaryKey().default(true),
    suns: boolean('suns')
      .array()
      .notNull()
      .default(sql`ARRAY[true, true, true, true, true, true]`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check('six_suns_singleton', sql`${t.id}`)],
)

// Legacy Track — shared, table-wide list of free-text statements.
export const legacyEntries = pgTable('legacy_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  texto: text('texto').notNull().default(''),
  status: legacyStatus('status').notNull().default('secured'),
  position: smallint('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
