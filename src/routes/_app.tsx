import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { fetchCurrentUser } from "#/server/auth";
import { Cosmos } from "#/components/orbita-suns/Cosmos";
import { Hero } from "#/components/orbita-suns/Hero";
import { Nav } from "#/components/orbita-suns/Nav";
import { useCinematics } from "#/lib/cinematics";

// Authenticated layout. Resolves the user once and exposes it to child routes
// via context. Route guards protect the UI; the data boundary is the app-layer
// authorization in src/server/data.core.ts (RLS was retired with Supabase).
// Also hosts the persistent chrome (Nav now; hero + Three.js cosmos come later).
export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user) {
      throw redirect({ to: "/login", search: { erro: undefined } });
    }
    // A resolved user is already past the Auth.js allowlist gate (no invite,
    // no session). A player without an assigned PC is a valid, expected state —
    // they land on the waiting room (src/routes/_app/index.tsx), not an error.
    return { user };
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  const pathname = useLocation({ select: (l) => l.pathname });
  useCinematics(pathname);
  return (
    <>
      <Cosmos />
      <Nav role={user.role} displayName={user.displayName} />
      {/* Reserve the viewport height up front so the route content (streamed in
          after the loader/auth resolves) fills a space that already exists — the
          <main> no longer grows from 0×0, which was ~all of the page CLS. */}
      <div className="relative z-10 min-h-[100dvh] pt-[60px]">
        <Hero />
        <Outlet />
      </div>
    </>
  );
}
