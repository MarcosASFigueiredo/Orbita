import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  build: {
    // The only chunk over 500 kB is three.js (~724 kB), and it is already an
    // isolated lazy chunk: it's dynamically imported inside Cosmos, deferred to
    // idle, and skipped entirely on mobile / reduced-motion — never in the
    // critical path. Routes and Cosmos are already code-split, so there is no
    // further meaningful split to make; this just quiets the (expected) warning.
    chunkSizeWarningLimit: 800,
  },
  // nitro() builds the server for deployment. On Vercel it auto-detects the
  // `VERCEL` build env and emits the Build Output API format (.vercel/output);
  // locally it emits a Node server at .output/server/index.mjs.
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
})

export default config
