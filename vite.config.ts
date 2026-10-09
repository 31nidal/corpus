import {purgeRejectedDraftsOnStartup} from './server/flashcards/review/startup.mjs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createApiHandler } from './server/api.mjs'
export default defineConfig(({mode}) => {
  const config = {...process.env, ...loadEnv(mode, process.cwd(), '')}
  const api = createApiHandler(config)
  return {
    plugins: [react(), {
      name: 'corpus-api',
      configureServer(server) { purgeRejectedDraftsOnStartup(config); server.middlewares.use(api) },
      configurePreviewServer(server) { purgeRejectedDraftsOnStartup(config); server.middlewares.use(api) },
    }],
    base: './',
    build: {rollupOptions: {output: {manualChunks: {three: ['three']}}}},
  }
})
