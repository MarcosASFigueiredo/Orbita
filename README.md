# Orbita Suns VTT

Companion web app for the tabletop RPG *"Orbita Suns: Crônica dos Seis Sóis"*.
Stack: React 19 + TanStack Start, Postgres via Drizzle ORM, self-hosted Auth.js
magic-link auth, SSE realtime. Production runs on Neon + Resend; local dev runs
entirely on Docker with **no external accounts and no internet required**.

# Getting Started (local development, from zero)

Prerequisites: **Node + pnpm**, and **Docker** (Docker Desktop with WSL
integration enabled if you're on Windows/WSL). Then:

```bash
# 1. Install dependencies
pnpm install

# 2. Create your local env file (defaults already point at the docker DB)
cp .env.example .env

# 3. Bring up the database and set everything up from scratch:
#    starts Postgres + the Neon HTTP proxy, runs migrations, seeds the
#    characters + shared tracks, and seeds two local test users.
pnpm dev:setup

# 4. Run the app
pnpm dev            # http://localhost:3000
```

### Logging in locally (no email needed)

Auth is passwordless magic-link. Locally there's no mail provider, so the link
is **printed to the terminal running `pnpm dev`** instead of being emailed.

1. Go to `http://localhost:3000/login` and enter a seeded test email:
   - `gm@orbitasuns.local` — the **GM** (dashboard at `/gm`)
   - `player@orbitasuns.local` — a **Player** bound to the *Halda* sheet
2. Look in the `pnpm dev` terminal for a line like
   `✉️  [dev] Magic link for gm@orbitasuns.local: http://localhost:3000/api/auth/callback/...`
3. Paste that URL into the browser — you're signed in.

Only allowlisted emails may sign in (`invited_users` table). Add more via
`pnpm db:studio` or by editing the `DEV_INVITES` list in `src/server/db/seed.ts`.

### Why a "Neon proxy" container?

In production the app talks to Postgres through Neon's **HTTP** serverless
driver, not the raw wire protocol — a plain Postgres container can't serve that.
`docker-compose.yml` therefore runs a tiny `neon-proxy` alongside Postgres that
exposes a Neon-compatible HTTP endpoint on `:4444`, so your **local code path is
identical to production** (same driver, no code branches). `src/server/db/
neon-local.ts` redirects the driver to that proxy only when `DATABASE_URL` points
at the local host — against real Neon it's a no-op.

### Local vs production — don't mix them up

The **only** thing that decides local vs production is the `DATABASE_URL` value
in your `.env`:

| | `DATABASE_URL` | Email | Notes |
|---|---|---|---|
| **Local** | `postgres://…@db.localtest.me:5432/main` (default in `.env.example`) | magic link printed to terminal | safe to migrate/seed/reset freely |
| **Production** | your Neon connection string | Resend (`RESEND_API_KEY`) | **never** run `db:migrate` against it unless you mean to; `db:seed` is local-only and refuses to run here |

`.env` is gitignored; only `.env.example` (placeholders, no secrets) is
committed. `pnpm db:seed` hard-refuses to run unless `DATABASE_URL` is the
local host, so a stray seed/reset can't touch Neon. Real players are added by
the GM from the in-app invite UI — staging/production are no longer seeded.

### Handy commands

```bash
pnpm db:up        # start Postgres + Neon proxy (waits until healthy)
pnpm db:down      # stop the containers (keeps data)
pnpm db:reset     # wipe the data volume and start fresh
pnpm db:migrate   # apply drizzle/ migrations
pnpm db:seed      # characters + shared tracks + local test users (local-only)
pnpm db:studio    # Drizzle Studio (browse/edit the DB)
```

Port 5432 already taken? Set `POSTGRES_PORT` in `.env` (e.g. `5433`) and change
the `:5432` in `DATABASE_URL` to match. If `db.localtest.me` doesn't resolve
(offline DNS), add `127.0.0.1 db.localtest.me` to your hosts file.

# Building For Production

To build this application for production:

```bash
pnpm build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `pnpm add @tailwindcss/vite tailwindcss --dev`



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
