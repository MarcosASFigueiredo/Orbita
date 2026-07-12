import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import type { AppRole } from "#/lib/game";

// Persistent top bar for the authenticated app (mounted once in the _app
// layout). Wordmark on the left, the signed-in identity + sign-out on the
// right. It gains a blurred backdrop after a little scroll. There is no
// GM/Player toggle: the role is fixed by the session/route.
export function Nav({
  role,
  displayName,
}: {
  role: AppRole;
  displayName: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onSignOut = async () => {
    setBusy(true);
    // Auth.js sign-out: fetch a CSRF token, POST to the sign-out endpoint, then
    // full-reload to guarantee a clean unauthenticated state.
    const { csrfToken } = await fetch("/api/auth/csrf").then((r) => r.json());
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/login" }),
    });
    window.location.href = "/login";
  };

  const isGm = role === "gm";
  const label = isGm ? "Mestre" : displayName || "Jogador";
  const initial = (isGm ? "M" : displayName || "?").charAt(0).toUpperCase();

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-[60] flex items-center justify-between px-4 py-3 transition-[background,border-color] duration-500 sm:px-9 ${
        scrolled
          ? "border-b border-[var(--color-gold-faint)] bg-[rgba(5,5,7,0.82)] backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="leading-tight">
        <span className="font-display text-[17px] tracking-[6px] text-[var(--color-gold)]">
          ORBITA SUNS
        </span>
        <span className="mt-0.5 block text-[8.5px] font-normal uppercase tracking-[0.28em] text-[var(--color-text-3)]">
          Crônica do Grande Eclipse
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2.5 text-[11px] tracking-wide text-[var(--color-text-2)] sm:flex">
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[var(--color-gold-dim)] font-serif text-sm text-[var(--color-gold)]"
            aria-hidden
          >
            {initial}
          </span>
          <span>{label}</span>
        </div>
        <button
          type="button"
          className="btn px-2.5"
          onClick={onSignOut}
          disabled={busy}
          aria-label="Sair"
        >
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  );
}
