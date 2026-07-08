# Deploying Orbita to Vercel (staging + production)

This app is a TanStack Start (React) SSR app. It builds for Vercel via **Nitro**,
which auto-detects Vercel's build environment and emits the Vercel Build Output
API v3 layout (`.vercel/output/`) — a static asset dir plus a serverless function
for SSR. No preset config is required; Vercel sets `VERCEL=1` during builds and
Nitro picks the `vercel` preset automatically.

## How the build is wired

- `vite.config.ts` includes the `nitro()` plugin (after `tanstackStart()`).
- `vercel.json` pins the install/build commands and sets `framework: null` so
  Vercel honors the Build Output API we emit rather than applying its own build.
- Locally, `pnpm build` uses Nitro's `node-server` preset → `.output/`; run it
  with `pnpm start` (`node .output/server/index.mjs`).

## The two environments

We use **one Vercel project** with Git-branch → environment mapping:

| Environment | Git branch | `VITE_APP_ENV` | URL |
| ----------- | ---------- | -------------- | --- |
| Production  | `main`     | `production`   | your production domain |
| Staging     | `staging`  | `staging`      | a stable staging domain / preview URL |

- Pushes to `main` → **Production** deployment.
- Pushes to `staging` → a **Preview** deployment. For a stable staging URL, either
  assign a domain to the `staging` branch, or use Vercel **Custom Environments**
  (Project → Settings → Environments → add one named `staging` bound to the
  `staging` branch) so env vars can be scoped to it explicitly.
- All other branches / PRs → ephemeral Preview deployments.

> Alternative: two separate Vercel projects (one per environment) pointed at the
> same repo/different branches. The same build config works unchanged; only the
> env-var scoping location differs.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables, **scoped per
environment**. Only `VITE_`-prefixed vars reach the browser; everything else is
server-only (read via `process.env` inside server functions/middleware — never at
module scope). See `.env.example` and the Intent `execution-model` skill.

Minimum for this app:

| Variable       | Production   | Staging   | Notes |
| -------------- | ------------ | --------- | ----- |
| `VITE_APP_ENV` | `production` | `staging` | Drives the non-production badge (`src/env.ts`). Inlined at build time. |

Because `VITE_`-prefixed vars are **inlined at build time**, each environment
must be built with its own value — which happens naturally since Vercel builds
each environment separately with that environment's variables.

The app reads it through the typed helper in `src/env.ts` (`appEnv`,
`isProduction`, `isStaging`). A small amber badge shows the environment name on
every non-production deployment and is absent in production — a quick visual
confirmation of which environment you're looking at.

## Deploy

Connect the repo in the Vercel dashboard (recommended — gives automatic
branch→environment deploys), or use the CLI:

```bash
npm i -g vercel
vercel link                 # once, to connect the project
vercel                      # deploy a Preview (e.g. from the staging branch)
vercel --prod               # deploy Production
```

You can also verify the exact Vercel output locally:

```bash
VERCEL=1 pnpm build         # emits .vercel/output/ (Build Output API)
```

## Gotchas

- `nitro` is installed as `nitro@npm:nitro-nightly@latest` per current TanStack
  Start guidance (stable v3 not yet released). Pin/upgrade deliberately.
- `VITE_`-prefixed vars are build-time inlined and public — never put secrets in
  them. Server secrets get no prefix and are read per-request on the server.
- `.vercel/`, `.output/`, and `.nitro/` are gitignored build artifacts.
- Local SSR preview: `pnpm build && pnpm start` (not `vite preview`, which serves
  the client build only).
