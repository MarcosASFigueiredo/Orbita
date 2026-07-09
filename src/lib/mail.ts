// Outbound transactional mail — the one non-OSS dependency in the stack. Kept
// behind this thin interface so the provider is swappable: to move off Resend
// (e.g. to Brevo, or a self-hosted SMTP relay later) only this file changes.
// Uses Resend's HTTP API directly via fetch, so no SDK dependency is needed.
import '@tanstack/react-start/server-only'

export interface MagicLinkMail {
  to: string
  /** The Auth.js callback URL that consumes the verification token. */
  url: string
  /** RFC5322 From, e.g. "Lagash <mesa@seu-dominio.com>". */
  from: string
}

export async function sendMagicLinkEmail({
  to,
  url,
  from,
}: MagicLinkMail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Seu link de acesso à mesa — Lagash',
      text: `Abra este link para entrar na mesa (expira em 24h):\n\n${url}\n\nSe você não pediu este acesso, ignore este e-mail.`,
      html: magicLinkHtml(url),
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`)
  }
}

function magicLinkHtml(url: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0d1a;padding:40px 16px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e7e9f5">
  <div style="max-width:460px;margin:0 auto;background:#131629;border:1px solid #262a44;border-radius:16px;padding:32px;text-align:center">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#8b90b8">Crônica do Grande Eclipse</p>
    <h1 style="margin:0 0 20px;font-size:30px;color:#f4d78a">Lagash</h1>
    <p style="margin:0 0 24px;color:#b6bade;line-height:1.5">Toque no botão abaixo para entrar na mesa. O link é válido por 24 horas e só pode ser usado uma vez.</p>
    <a href="${url}" style="display:inline-block;background:#f4d78a;color:#131629;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px">Entrar na mesa</a>
    <p style="margin:24px 0 0;font-size:12px;color:#6c7099">Se você não pediu este acesso, ignore este e-mail.</p>
  </div>
</body></html>`
}
