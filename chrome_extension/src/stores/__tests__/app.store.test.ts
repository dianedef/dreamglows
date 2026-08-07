import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '../app.store'

describe('app Store', () => {
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