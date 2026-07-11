import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Minimal config for pure unit tests — deliberately NOT the app's vite.config
// (no tanstackStart/nitro plugins). Just resolves the `#/*` alias to src/ and
// runs *.test.ts in a node environment.
const src = fileURLToPath(new URL('./src/', import.meta.url))

export default defineConfig({
  resolve: { alias: [{ find: /^#\//, replacement: src }] },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
