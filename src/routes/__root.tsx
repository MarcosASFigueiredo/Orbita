import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { appEnv, isProduction } from '../env'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Lagash — Crônica do Grande Eclipse' },
      {
        name: 'description',
        content:
          'Companion de mesa para Lagash: Crônica do Grande Eclipse — fichas e props ao vivo.',
      },
    ],
    links: [
      // Warm the Google Fonts connections before the CSS that references them is
      // parsed — this removes the DNS+TLS handshake from the LCP critical path.
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: appCss },
      // Fonts moved out of the CSS `@import` (which was discovered only after
      // app CSS downloaded + parsed, serializing the request) into a head <link>
      // so the preload scanner fetches it in parallel. `display=swap` keeps the
      // H1 (LCP) painting immediately in the fallback face.
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen font-sans antialiased [overflow-wrap:anywhere]">
        {children}
        {/* Non-production deploy indicator. Never renders in production. */}
        {!isProduction && (
          <div className="fixed bottom-2 left-2 z-50 rounded-full bg-amber-500/90 px-2.5 py-1 text-xs font-medium text-black shadow">
            {appEnv}
          </div>
        )}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
