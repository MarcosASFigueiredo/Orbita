<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# Orbita — Project Context

Durable context for humans and AI agents working on this repo. Keep this current.

## What this is

Repo root `/home/archie/projects/orbita` (package `orbita`). It started as a
**blank TanStack Start** (React) scaffold and now hosts **Lagash VTT** — a
companion web app for the tabletop RPG *"Lagash: Crônica do Grande Eclipse"*
(a modified Cthulhu Dark game). The scaffold/deploy history is below; the
application architecture is in the next section.

## Lagash VTT — application

Single-table companion app (1 GM + 5 players, no multi-tenant). Replaces paper
sheets and physical props with live-synced digital equivalents. **All UI copy is
pt-BR; code/identifiers stay English.**

**Stack ($0 / OSS, self-hostable):** **Neon** serverless Postgres via **Drizzle
ORM**; **Auth.js** (`@auth/core`) self-hosted magic-link auth with the Drizzle
adapter; **SSE** for live sync; **Resend** free tier as the *only* non-OSS piece,
used purely as mail transport behind the swappable `src/lib/mail.ts`. (Migrated
off Supabase — see the history note at the end of this section.) Skills consulted:
`router-core/auth-and-guards`, `start-core/server-functions`,
`start-core/execution-model`, `start-core/deployment`.

**Data model** (`src/server/db/schema.ts`, migrations in `drizzle/`):
- Auth.js adapter tables: `users` (role gm|player), `accounts`, `sessions`,
  `verification_tokens`. `invited_users` = email allowlist **and** the invite
  registry the GM manages from the UI → role + optional `character_slug`;
  provisioning happens in the Auth.js `createUser` event (role + PC ownership).
  **Invite status is derived, never stored**: a `users` row for the email =
  accepted, else pending (join in `invites.core.ts`, can't drift).
- `characters` (public sheet fields + `insight` 0–6 + `insight_locked_at`;
  `owner_user_id` → users; **`deleted_at`** = soft delete). GM creates/archives
  PCs from the UI; ownership (which sheet a player sees) is `owner_user_id`, not
  `character_slug` (slug is just a stable unique id, auto-generated on create).
- `npcs` (**GM-only prep entities** — nome/papel/descricao/notas/faccao/local as
  free text, `position`, `deleted_at`). A **separate table from `characters`**
  (not a `kind` column) so an over-broad character read can never leak an NPC to
  a player — same defense-in-depth as Atrito. No Insight, no owner.
- `character_gm_notes` (**Atrito** — separate GM-only table, unreachable by players).
- `six_suns_state` (singleton row, `suns boolean[6]`), `legacy_entries`
  (list, status secured|threatened|lost).
- A `set_updated_at` trigger (`drizzle/0001`, + `npcs` in `drizzle/0002`) bumps
  `updated_at` on mutation — the SSE change feed polls `max(updated_at)` off the
  three shared tables. **Soft delete = `deleted_at IS NULL` filter on every PC/NPC
  read** (`getPlayerHome`, `getGmDashboard`, `ownedCharacter`, the `getCurrentUser`
  join); archiving a PC also clears `owner_user_id`, restore brings it back unowned.

**Permissions (app-layer authz — RLS is gone):** Neon has no row-level security,
so every old RLS policy lives in the server-only cores (`data.core.ts`,
`invites.core.ts`, `npcs.core.ts`): cores take an explicit `AuthUser`; GM
reads/writes everything (`assertGm`); a player is scoped to their own `characters`
row by `character_slug`; shared tracks are read-only for players, GM-writable;
Atrito, **NPCs, invites, PC create/assign/archive/restore are all GM-only**.
Mutations return `{ok:false}` (0 rows) on an unauthorized target — the
silent-denial equivalent. Route guards (`beforeLoad`) are UX; the data boundary is
these cores. **Assignment enforces 1 PC per player**: `assignCharacter` clears the
player off any other PC before binding, matching the `.limit(1)` in
`getCurrentUser`'s owner join. Authz is covered by `src/server/*.core.test.ts` —
they `vi.mock` the DB client + `auth/config` so the **real** `assertGm` runs in
node and every player-calls-GM path asserts `/GM only/` before any query (plus an
NPC-isolation check: `getPlayerHome`'s payload is exactly `{character, legacy, suns}`).

**Auth (Auth.js, self-hosted):** no TanStack adapter exists, so `@auth/core` is
mounted as a **global request middleware in `src/start.ts`** that delegates
`/api/auth/*` to `Auth(request, authConfig)`. Config in `src/server/auth/config.ts`
(`basePath: '/api/auth'`, database sessions, Drizzle adapter, Resend provider with
`sendVerificationRequest` routed through `src/lib/mail.ts`; allowlist gate in the
`signIn` callback + provider). `@auth/core` + Neon are dynamically imported inside
the middleware `.server()` body so they never enter the client bundle. Identity
seam = `src/server/session.ts` (`getCurrentUser`/`requireUser`/`requireGm`).

**Routes:** `/login` (POST `/api/auth/signin/resend` for the magic link — no
confirm page; Auth.js owns the callback at `/api/auth/callback/resend`; the client
helper is `src/lib/auth-client.ts#requestMagicLink`, shared with the GM invite
action — one email mechanism, never two), `_app` (auth layout, resolves user into
context), `_app/` = `/` (player: own sheet + live tracks; **accepted-but-unassigned
player → themed `WaitingRoom`, which swaps to the codex live via SSE when the GM
assigns**; GM redirected), `_app/gm` = `/gm` (GM dashboard: **invite players
(`InvitePanel`), create/assign/archive/restore PCs, roster with owner badges,
CharacterDetail with `AssignOwner`, NPC workbench (`NpcPanel`)** + Atrito + Six
Suns + Legacy + Insight-6 **sacrifice** prompt).

> **Guard subtlety:** a resolved user is already past the Auth.js `signIn`
> allowlist gate, so `_app`/`login` `beforeLoad` let **any** logged-in user in — a
> player with no assigned PC lands on the waiting room, **not** back on `/login`.
> (The old `player && !characterSlug → /login` bounce made the waiting room
> unreachable; removed.)

**Realtime (SSE):** `src/server/events.ts` serves a bounded (~50s) `text/event-stream`
at `/api/events` (mounted in `src/start.ts`) that polls `max(updated_at)` across
the three shared tables every 1s (Neon's HTTP driver can't do LISTEN/NOTIFY) and
emits `{changed:true}`. Client `src/lib/realtime.ts#useLagashRealtime()` opens an
`EventSource` → `router.invalidate()` on each signal; the browser auto-reconnects
after the bounded window. **Invites, NPCs, and PC assignment/archive are NOT in
the SSE feed** — the GM route persists then calls `router.invalidate()` explicitly
(outside the optimistic overlay in `src/lib/optimistic.ts`).

**Server functions:** `src/server/auth.ts` (`fetchCurrentUser`), `src/server/data.ts`
(thin `createServerFn` wrappers) over the server-only cores: `src/server/data.core.ts`
(sheets, tracks, PC create/assign/archive/restore, GM dashboard aggregate),
`src/server/invites.core.ts` (invite list/create/resend/revoke), `src/server/npcs.core.ts`
(NPC CRUD + archive/restore). Neon client in `src/server/db/client.ts` (marked
`server-only`). Pure testable helpers in `src/lib/` (`character.ts#slugFromName`,
`roster.ts`, `insight.ts`, `suns.ts`).

**Decisions locked with the user:** player self-edits own Insight (GM overrides);
players see **only their own** sheet (not peers'); devices = phone (players) +
desktop (GM) — player views phone-first, GM dashboard desktop-first; **1 PC per
player** (reassign clears the old bond, with a UI confirm); NPC faction/location =
free text; **resend invalidates the previous magic link**; **soft delete + restore
for PC and NPC** (restore returns a PC unowned — GM reassigns, keeping the 1:1 rule).

**Env:** `DATABASE_URL` (Neon), `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
(all server-only, no `VITE_` prefix). Without `AUTH_SECRET` the app degrades to
the login screen; without `RESEND_API_KEY` in dev, the magic link is **printed to
the server console** (`src/lib/mail.ts` fallback) so you can sign in offline.
Drizzle scripts: `pnpm db:generate|migrate|push|studio|seed` and the Docker
local-dev set (`db:up|down|reset`, `dev:setup`). `db:seed` is **local-only**
(hard-refuses any non-`db.localtest.me` DATABASE_URL): it seeds the characters +
shared tracks + two `@lagash.local` test users. Staging/production are no longer
seeded — real players are added by the GM from the in-app invite UI.

**Multi-environment migrations:** `drizzle-kit migrate` targets whatever
`DATABASE_URL` is set at run time and journals applied migrations **per-DB**
(idempotent). Run per env by pointing `dotenv` at a per-env file (all `.env.*` are
gitignored) — the existing `import 'dotenv/config'` honors `DOTENV_CONFIG_PATH`,
so no new dependency:
```bash
DOTENV_CONFIG_PATH=.env.staging    pnpm db:migrate
DOTENV_CONFIG_PATH=.env.production pnpm db:migrate
```
For Neon, use the **direct (non-`-pooler`) connection string + `?sslmode=require`**
for migrations — drizzle-kit uses the `pg` driver (installed for Docker) over the
wire protocol; the pooler (PgBouncer) can trip on session statements. The app
runtime keeps the `neon-http` driver over the pooler.

**Gotchas:**
- Server-only modules (Neon, `@auth/core`, `events.ts`, the `*.core.ts`) must never
  reach the client bundle — keep them in `server-only`-marked files and reference
  them only inside server-fn / middleware `.server()` bodies (dynamic import in
  `start.ts`). The build's import-protection plugin fails otherwise.
- Auth.js `@auth/core` defaults `basePath` to `/auth`; we set `/api/auth` in
  `authConfig` **and** pass it as the 5th arg to `createActionURL`.
- **NPCs are GM-only by table isolation** — never add an NPC field to any
  Player-facing response (`getPlayerHome` etc.); keep them behind `npcs.core.ts`.
- **Invite status is derived**, not a column — don't add a `status` field; join
  `users` on `lower(email)`.
- `character_slug` is legacy: ownership/what-a-player-sees is `owner_user_id`. New
  PCs get an auto-generated slug (`slugFromName(nome)` + random suffix).
- Authz `*.core.test.ts` must `vi.mock` `@tanstack/react-start/server-only`,
  `#/server/auth/config`, and `#/server/db/client` (chainable Proxy → `[]`) so the
  real `session.ts`/`assertGm` load in node without a live DB.

**Next steps:** (1) **run `pnpm db:migrate` on every DB** (local done; staging/prod
via `DOTENV_CONFIG_PATH=...` above) — migration `0002` adds `characters.deleted_at`
+ the `npcs` table; (2) set real `AUTH_SECRET`/`RESEND_API_KEY`/`EMAIL_FROM` in
`.env` + Vercel and confirm real email delivery; (3) staging/production are **live
and de-seeded** as of go-live (2026-07-12) — the GM allowlist row + Six Suns
singleton are the only rows kept; players are invited from the in-app UI, and
`db:seed` no longer runs against remote (it's local-only); (5) verify the full feature live (invite email
round-trip, assignment, archive/restore, waiting room over SSE) — none verified
in-session; (6) optional dice roller.

**History:** originally built on Supabase (auth + Postgres + Realtime + RLS);
migrated to the Neon/Drizzle/Auth.js/SSE/Resend stack above to run at $0 on
OSS/self-hostable infra (RLS → app-layer authz; Realtime → SSE). Then the
"Observatório" frontend redesign (obsidian+gold, Three.js cosmos, live Six Suns
astrolabe) + optimistic editing. Then **GM-managed invites, PC/NPC sheet creation,
and PC→player assignment** (this branch, `feat/gm-invites-sheets`) — closing the
loop so the GM runs everything from the UI, no manual seed/DB.

---

## How the host project was scaffolded / deployed

Exact TanStack CLI command used:

```bash
npx @tanstack/cli@latest create my-tanstack-app --agent --package-manager pnpm --tailwind
```

Notes on the command:
- `--agent` — non-interactive, agent-friendly output; also wires up AGENTS.md/CLAUDE.md.
- `--package-manager pnpm` — pnpm is the package manager (see `pnpm-lock.yaml`).
- `--tailwind` — **deprecated and ignored by the CLI**; Tailwind is always enabled
  in TanStack Start scaffolds now, so the flag has no effect but does no harm.
- CLI version resolved: `@tanstack/cli@0.69.5`.
- Scaffold config is recorded in `.cta.json` (`chosenAddOns: []`, `mode: file-router`,
  `framework: react`, `intent: true`, `includeExamples: true`).

Because the host directory (`orbita`) was empty (no competing platform template),
the generated project was moved from `my-tanstack-app/` up into the repo root and
the throwaway subdirectory removed. The CLI-initialized `.git` was preserved.

## Follow-up TanStack Intent commands

Run after scaffolding (from repo root):

```bash
npx @tanstack/intent@latest install   # manages the intent-skills block in AGENTS.md
npx @tanstack/intent@latest list      # lists available local skills for this stack
```

Intent version resolved: `@tanstack/intent@0.3.5`. This newer Intent uses a
**list + load-on-demand** model: instead of embedding a large skill doc into
AGENTS.md, `install` maintains the lightweight `intent-skills` block at the top of
this file, and you load specific guidance on demand, e.g.:

```bash
pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core
pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core
```

**Before making architectural or library-specific changes, run `intent list` and
load the relevant SKILL.md rather than guessing the current pattern.** Skill
sources available for this stack include: `@tanstack/router-core` (routing:
data-loading, navigation, search-params, ssr, type-safety, auth-and-guards, etc.),
`@tanstack/start-client-core` and `@tanstack/start-server-core` (server functions,
middleware, server routes, execution model, deployment), `@tanstack/virtual-file-routes`,
and `@tanstack/devtools`.

## Stack & integrations

- **Framework:** React 19 + TanStack Start (SSR) with TanStack Router (file-based routing).
- **Build/toolchain:** Vite 8 (default CLI toolchain, unchanged), TypeScript.
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite`), `@tailwindcss/typography`.
- **Devtools:** `@tanstack/react-devtools` + router devtools, via `@tanstack/devtools-vite`
  (stripped from production builds automatically).
- **Testing:** Vitest + Testing Library (jsdom).
- **Icons:** `lucide-react` (used by the example components).
- **Partner integrations / add-ons:** **none** — `chosenAddOns` is empty by design
  (blank starter, "no extra integrations"). Nothing requested was dropped.

## Project structure (generated — preserve unless there's a clear reason to change)

```
src/
  router.tsx            # getRouter() factory; register module augmentation
  routeTree.gen.ts      # AUTO-GENERATED by tsr — do not edit by hand
  styles.css            # Tailwind entry
  routes/
    __root.tsx          # root document shell (HeadContent, Scripts, Outlet)
    index.tsx           # / route
    about.tsx           # /about route (example)
  components/           # Header, Footer, ThemeToggle (example components)
public/                 # favicon, logos, manifest.json, robots.txt
vite.config.ts          # devtools() + tailwindcss() + tanstackStart() + viteReact()
tsr.config.json         # router generator target: react
.cta.json               # create-tanstack-app config record
```

The example route (`about.tsx`) and `components/` are part of the CLI's blank
starter (`includeExamples: true`). They are safe to delete once real routes exist.

## Environment variables

**None required** to run, build, or deploy the blank starter (`.cta.json`
`envVarValues` is empty, no add-ons pull in secrets). When you add your own:
- Client-exposed vars **must** be prefixed `VITE_` (Vite convention) to reach the browser.
- Server-only secrets should **not** use the `VITE_` prefix; read them via
  `process.env` inside server functions / middleware only.
- `.env` is already gitignored. Add a committed `.env.example` when you introduce vars.
- See Intent skill `@tanstack/start-client-core#start-core/execution-model` for the
  env-var safety rules before adding any.

## Commands

```bash
pnpm dev              # dev server on http://localhost:3000
pnpm build            # production build (Nitro): .output/ locally, .vercel/output on Vercel
pnpm start            # run the built Nitro Node server (node .output/server/index.mjs)
pnpm preview          # vite preview (client build only — use `pnpm start` for SSR)
pnpm test             # run Vitest
pnpm generate-routes  # regenerate routeTree.gen.ts (tsr generate)
```

## Deployment — Vercel (staging + production)

Target is **Vercel**, configured. See **`DEPLOYMENT.md`** for the full guide.

- Build goes through **Nitro** (`nitro()` plugin in `vite.config.ts`). Nitro
  auto-detects Vercel (`VERCEL=1`) and emits Build Output API v3 into
  `.vercel/output/` (static assets + a `__server.func` serverless SSR function).
  Locally it uses the `node-server` preset → `.output/` (`pnpm start` to run).
- `vercel.json` pins `installCommand`/`buildCommand` and sets `framework: null`
  so Vercel honors our Build Output API result.
- `nitro` is installed as `nitro@npm:nitro-nightly@latest` per current TanStack
  Start guidance (stable v3 not yet released).
- **Two environments, one project, branch-mapped:** `main` → Production,
  `staging` branch → Staging (Vercel Preview or a Custom Environment named
  `staging`). Verified locally: `VERCEL=1 pnpm build` produces `.vercel/output/`.
- Chosen via the Intent skill `@tanstack/start-client-core#start-core/deployment`.

## Environment / staging separation

- `VITE_APP_ENV` (`development` | `staging` | `production`) is the deploy label,
  set **per Vercel environment**. Typed in `src/env.d.ts`, read via `src/env.ts`
  (`appEnv`, `isProduction`, `isStaging`). `VITE_`-prefixed → inlined at build
  time, so each Vercel environment builds with its own value.
- `src/routes/__root.tsx` renders a small amber environment badge on every
  **non-production** deploy (absent in production) — quick visual env confirmation.
- Verified end-to-end: a `VITE_APP_ENV=staging` build renders the `staging` badge
  in SSR HTML; a `production` build omits it.

## Key architectural decisions

- Kept the **default CLI toolchain** (Vite) and **generated project structure** as-is.
- **Blank starter, no add-ons** — matches the request for no extra integrations.
- Relocated the scaffold to the repo root and renamed the package to `orbita`
  (deviation from generated output, to match the host dir).
- **Vercel via Nitro** (Build Output API), single project with branch→environment
  mapping for staging/production.
- Environment exposed to the app through a single `VITE_APP_ENV` var + typed helper.
- Type safety: never hand-edit `routeTree.gen.ts`; let `tsr` regenerate it.

## Known gotchas

- `--tailwind` CLI flag is deprecated/ignored (Tailwind always on). Not a bug.
- `routeTree.gen.ts` is generated; editing it by hand will be overwritten.
- Devtools are dev-only and stripped from production builds by `@tanstack/devtools-vite`.
- Node 24 / pnpm 10 confirmed working; `esbuild` and `lightningcss` are the only
  approved postinstall build scripts (`pnpm.onlyBuiltDependencies`).
- `nitro` is a **nightly** package (`npm:nitro-nightly`) — upgrade deliberately.
- `VITE_`-prefixed vars are build-time inlined and **public** — never store secrets
  there; server secrets get no prefix and are read per-request (never at module scope).
- Local SSR preview is `pnpm start`, not `pnpm preview` (which serves client only).
- **Dev env is Arch Linux (WSL).** `less` was dropped from Arch's `base` group, so
  a `pacman -Syu` can remove it and break git's default pager (`cannot run less`).
  Fix: `sudo pacman -Syu less` (a plain `-Sy` 404s on a stale package DB). Once
  installed explicitly it survives future upgrades.
- Adding the `nitro()` plugin changed the build output from `dist/` to `.output/`
  (`.vercel/output/` on Vercel). Both are gitignored.
- Git repo was initialized by the CLI but has **no commits yet** — make an initial commit.

## Next steps

1. `git add -A && git commit -m "Scaffold + Vercel deploy setup"` (no commit exists yet).
2. In Vercel: import the repo, set `main`→Production and a `staging` branch/env,
   and add `VITE_APP_ENV` scoped per environment (see `DEPLOYMENT.md`).
3. Optionally delete the example `about.tsx` route and `components/` once real UI exists.
4. Add real routes under `src/routes/`; run `pnpm generate-routes` if editing outside dev.
5. Add further env vars via `.env` (+ update `.env.example`) following the `VITE_` rules.
