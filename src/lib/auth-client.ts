// Client-side helper to kick off the Auth.js magic-link flow: fetch a CSRF
// token, then POST the email to the Resend email provider's sign-in endpoint.
// Auth.js emails a link that points at its own /api/auth/callback/resend, so
// there is no confirm page.
//
// Shared by the login page and the GM's "invite player" action — both reuse the
// exact same Auth.js/Resend path, so there is never a second email mechanism.
// The allowlist gate in the Resend provider only sends to invited addresses, so
// the GM must create the invite row *before* calling this.
export async function requestMagicLink(email: string): Promise<void> {
  const { csrfToken } = await fetch('/api/auth/csrf').then((r) => r.json())
  const res = await fetch('/api/auth/signin/resend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Auth-Return-Redirect': '1',
    },
    body: new URLSearchParams({ email, csrfToken, callbackUrl: '/' }),
  })
  if (!res.ok) throw new Error('signin_failed')
}
