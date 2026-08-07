import { describe, expect, it, vi } from 'vitest'

interface ChromeMock {
  runtime: {
    onInstalled: {
      addListener: ReturnType<typeof vi.fn>
    }
    getManifest?: () => { version: string }
  }
  storage: {
    local: {
      clear: ReturnType<typeof vi.fn>
    }
  }
}

describe('background Script', () => {
  it('gère correctement l\'installation', async () => {
    const mockChrome: ChromeMock = {
      runtime: {
        onInstalled: {
          addListener: vi.fn()
        }
      },
      storage: {
        local: {
          clear: vi.fn()
        }
      }
    }
    
    // @ts-ignore - On ignore l'erreur de type car on mock seulement ce dont on a besoin
    global.chrome = mockChrome
    
    // Import dynamique du background script
    await import('../index')
    
    expect(mockChrome.runtime.onInstalled.addListener).toHaveBeenCalled()
  })
}) 