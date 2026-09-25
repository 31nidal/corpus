import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', timeout: 120000, fullyParallel: Boolean(process.env.CI), workers: 1, retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1440, height: 900 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: { env: {VITE_QCM_TEST_SEED:'playwright-qcm'}, command: 'npm run dev -- --host 127.0.0.1 --port 5173', url: 'http://127.0.0.1:5173', reuseExistingServer: true }
})
