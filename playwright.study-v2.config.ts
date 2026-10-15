import {defineConfig} from '@playwright/test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import base from './playwright.config'

const port = Number(process.env.STUDY_E2E_PORT || 5179)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port de test Study invalide.')
const baseURL = `http://127.0.0.1:${port}`

// Isolate accounts and force local generation, even if a developer server and
// a real Gemini key are already configured. Capture fixtures stay reproducible.
export default defineConfig({
  ...base,
  testMatch: ['study-v2-*.spec.ts', 'my-courses.spec.ts', 'flashcard-draft-review.spec.ts'],
  retries: 0,
  workers: 1,
  use: {...base.use, baseURL},
  webServer: {
    ...base.webServer,
    env: {
      ...base.webServer?.env,
      AI_GENERATION_PROVIDER: 'local',
      ACCOUNT_DATA_DIR: join(tmpdir(), `mycorpus-study-v2-playwright-${process.pid}`),
    },
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
  },
})
