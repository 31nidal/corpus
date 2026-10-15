import {defineConfig} from '@playwright/test'
import study from './playwright.study-v2.config'

// WebKit checks complement Safari/VoiceOver manual checks; they do not replace them.
export default defineConfig({
  ...study,
  use: {...study.use, browserName: 'webkit', launchOptions: {}},
})
