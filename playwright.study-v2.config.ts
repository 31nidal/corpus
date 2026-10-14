import {defineConfig} from '@playwright/test'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import base from './playwright.config'

// Isolate accounts and force local generation, even if a developer server and
// a real Gemini key are already configured. Capture fixtures stay reproducible.
export default defineConfig({
  ...base,
  testMatch: ['study-v2-*.spec.ts', 'my-courses.spec.ts', 'flashcard-draft-review.spec.ts'],
  retries: 0,
  workers: 1,
  use: {...base.use, baseURL: 'http://127.0.0.1:5179'},
  webServer: {
    ...base.webServer,
    env: {
      ...base.webServer?.env,
      AI_GENERATION_PROVIDER: 'local',
      ACCOUNT_DATA_DIR: join(tmpdir(), `mycorpus-study-v2-playwright-${process.pid}`),
    },
    command: 'npm run dev -- --host 127.0.0.1 --port 5179',
    url: 'http://127.0.0.1:5179',
    reuseExistingServer: false,
  },
})
