import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createApiHandler } from './server/api.mjs'
export default defineConfig(({mode}) => {
  const api = createApiHandler({...process.env, ...loadEnv(mode, process.cwd(), '')})
  return {
    plugins: [react(), {
      name: 'corpus-api',
      configureServer(server) { server.middlewares.use(api) },
      configurePreviewServer(server) { server.middlewares.use(api) },
    }],
    base: './',
    build: {rollupOptions: {output: {manualChunks: {three: ['three']}}}},
  }
})
