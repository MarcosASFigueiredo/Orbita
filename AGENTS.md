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
  `verification_tokens`. `invited_users` = email allowlist → role + `character_slug`;
  provisioning happens in the Auth.js `createUser` event (role + PC ownership).
- `characters` (public sheet fields + `insight` 0–6 + `insight_locked_at`;
  `owner_user_id` → users).
- `character_gm_notes` (**Atrito** — separate GM-only table, unreachable by players).
- `six_suns_state` (singleton row, `suns boolean[6]`), `legacy_entries`
  (list, status secured|threatened|lost).
- A `set_updated_at` trigger (`drizzle/0001`) bumps `updated_at` on the three
  shared tables — the SSE change feed polls `max(updated_at)` off it.

**Permissions (app-layer authz — RLS is gone):** Neon has no row-level security,
so every old RLS policy lives in `src/server/data.core.ts`: cores take an explicit
`AuthUser`; GM reads/writes everything (`assertGm`); a player is scoped to their
own `characters` row by `character_slug`; shared tracks are read-only for players,
GM-writable; Atrito is GM-only. Mutations return `{ok:false}` (0 rows) on an
unauthorized target — the silent-denial equivalent. Route guards (`beforeLoad`)
are UX; the data boundary is these cores.

**Auth (Auth.js, self-hosted):** no TanStack adapter exists, so `@auth/core` is
mounted as a **global request middleware in `src/start.ts`** that delegates
`/api/auth/*` to `Auth(request, authConfig)`. Config in `src/server/auth/config.ts`
(`basePath: '/api/auth'`, database sessions, Drizzle adapter, Resend provider with
`sendVerificationRequest` routed through `src/lib/mail.ts`; allowlist gate in the
`signIn` callback + provider). `@auth/core` + Neon are dynamically imported inside
the middleware `.server()` body so they never enter the client bundle. Identity
seam = `src/server/session.ts` (`getCurrentUser`/`requireUser`/`requireGm`).

**Routes:** `/login` (POST `/api/auth/signin/resend` for the magic link — no
confirm page; Auth.js owns the callback at `/api/auth/callback/resend`), `_app`
(auth layout, resolves user into context), `_app/` = `/` (player: own sheet + live
tracks; GM redirected), `_app/gm` = `/gm` (GM dashboard: all sheets + Atrito + Six
Suns + Legacy + Insight-6 **sacrifice** prompt).

**Realtime (SSE):** `src/server/events.ts` serves a bounded (~50s) `text/event-stream`
at `/api/events` (mounted in `src/start.ts`) that polls `max(updated_at)` across
the three shared tables every 2s (Neon's HTTP driver can't do LISTEN/NOTIFY) and
emits `{changed:true}`. Client `src/lib/realtime.ts#useLagashRealtime()` opens an
`EventSource` → `router.invalidate()` on each signal; the browser auto-reconnects
after the bounded window.

**Server functions:** `src/server/auth.ts` (`fetchCurrentUser`), `src/server/data.ts`
(thin `createServerFn` wrappers) over `src/server/data.core.ts` (server-only cores +
Drizzle access). Neon client in `src/server/db/client.ts` (marked `server-only`).

**Decisions locked with the user:** player self-edits own Insight (GM overrides);
players see **only their own** sheet (not peers'); devices = phone (players) +
desktop (GM) — player views phone-first, GM dashboard desktop-first.

**Env:** `DATABASE_URL` (Neon), `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
(all server-only, no `VITE_` prefix). Without `AUTH_SECRET` the app degrades to
the login screen. Drizzle scripts: `pnpm db:generate|migrate|push|studio|seed`.

**Gotchas:**
- Server-only modules (Neon, `@auth/core`, `events.ts`) must never reach the
  client bundle — keep them in `server-only`-marked files and reference them only
  inside server-fn / middleware `.server()` bodies (dynamic import in `start.ts`).
  The build's import-protection plugin fails otherwise.
- Auth.js `@auth/core` defaults `basePath` to `/auth`; we set `/api/auth` in
  `authConfig` **and** pass it as the 5th arg to `createActionURL`.
- 4 of 5 sheets are pt-BR placeholders pending real content (Halda is real).

**Next steps:** (1) set real `AUTH_SECRET`/`RESEND_API_KEY`/`EMAIL_FROM` in `.env`
+ Vercel, seed `invited_users` with the GM + 5 player emails, confirm real email
delivery; (2) drop in the 4 remaining sheets' real text; (3) optional dice roller.

**History:** originally built on Supabase (auth + Postgres + Realtime + RLS);
migrated to the Neon/Drizzle/Auth.js/SSE/Resend stack above to run at $0 on
OSS/self-hostable infra. RLS moved to app-layer authz; Realtime moved to SSE.

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
