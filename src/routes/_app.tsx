import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentUser } from "#/server/auth";

// Authenticated layout. Resolves the user once and exposes it to child routes
// via context. Route guards protect the UI; the data boundary is the app-layer
// authorization in src/server/data.core.ts (RLS was retired with Supabase).
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
  component: () => <Outlet />,
});
