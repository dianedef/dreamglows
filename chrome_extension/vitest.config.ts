/// <reference types="vitest" />
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    setupFiles: ['./vitest.setup.ts'],
    define: {
      __VERSION__: '"0.0.1"',
      __CHANGELOG__: '"# Changelog\\n\\n## v0.0.1"',
      __GIT_COMMIT__: '"abc123"',
      __GITHUB_URL__: '"https://github.com/user/repo"',
      'chrome': '{ runtime: { onInstalled: { addListener: () => {} }, storage: { local: { clear: () => Promise.resolve() } } } }'
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
}) 