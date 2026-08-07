import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app.store'
import { describe, it, expect, beforeEach } from 'vitest'

describe('App Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('incrémente le compteur', () => {
    const store = useAppStore()
    expect(store.count).toBe(0)
    store.increment()
    expect(store.count).toBe(1)
  })
}) 