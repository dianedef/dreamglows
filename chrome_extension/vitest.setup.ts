import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock global de chrome pour tous les tests
const mockChrome = {
  runtime: {
    getManifest: () => ({ version: '1.0.0' }),
    onInstalled: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      clear: vi.fn().mockResolvedValue(undefined)
    }
  }
} as unknown as Partial<typeof chrome>

global.chrome = mockChrome as typeof chrome

// Configuration globale pour Vue Test Utils
config.global.mocks = {
  chrome: global.chrome
}

// Variables globales pour les tests
global.__VERSION__ = '0.0.1'
global.__CHANGELOG__ = '# Changelog\n\n## v0.0.1'
global.__GIT_COMMIT__ = 'abc123'
global.__GITHUB_URL__ = 'https://github.com/user/repo' 