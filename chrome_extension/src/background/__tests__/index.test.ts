import { describe, expect, it, vi } from 'vitest'

describe('background persistence boundary', () => {
  it('registers awaited messages and never clears storage on install', async () => {
    const listeners: Record<string, Function> = {}
    const clear = vi.fn()
    const create = vi.fn().mockResolvedValue({})
    global.chrome = {
      runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}`, onInstalled: { addListener: (listener: Function) => { listeners.install = listener } }, onMessage: { addListener: (listener: Function) => { listeners.message = listener } } },
      storage: { local: { clear, get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) } }, tabs: { create }
    } as any
    await import('../index')
    await listeners.install({ reason: 'install' })
    expect(clear).not.toHaveBeenCalled()
    expect(create).toHaveBeenCalledWith({ active: true, url: 'chrome-extension://test/src/setup/index.html?type=update' })
    const response = vi.fn()
    expect(listeners.message({ namespace: 'dreamglows-path-v1', action: 'load' }, { id: 'outsider' }, response)).toBe(false)
    expect(response).not.toHaveBeenCalled()
    const completion = new Promise<any>(resolve => {
      expect(listeners.message({ namespace: 'dreamglows-path-v1', action: 'load' }, { id: 'test' }, resolve)).toBe(true)
    })
    expect(await completion).toMatchObject({ ok: true, document: { repositoryVersion: 1 } })
  })
})
