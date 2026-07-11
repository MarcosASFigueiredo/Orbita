import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { fetchCurrentUser } from "#/server/auth";
import { Cosmos } from "#/components/lagash/Cosmos";
import { Hero } from "#/components/lagash/Hero";
import { Nav } from "#/components/lagash/Nav";
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
    // Logged in but not on the allowlist (no role match / no assigned PC).
    if (user.role === "player" && !user.characterSlug) {
      throw redirect({ to: "/login", search: { erro: "nao_convidado" } });
    }
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
      <div className="relative z-10 pt-[60px]">
        <Hero />
        <Outlet />
      </div>
    </>
  );
}
