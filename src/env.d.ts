/// <reference types="vite/client" />

// Client-exposed (VITE_-prefixed) environment variables. Keep in sync with
// `.env.example`. See the Intent skill
// `@tanstack/start-client-core#start-core/execution-model`.
interface ImportMetaEnv {
  /** Deploy environment label, set per Vercel environment. */
  readonly VITE_APP_ENV?: 'development' | 'staging' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
