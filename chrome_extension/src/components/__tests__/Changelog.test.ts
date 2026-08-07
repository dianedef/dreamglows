import { mount } from '@vue/test-utils'
import Changelog from '../Changelog.vue'
import { describe, it, expect, beforeAll } from 'vitest'

describe('Changelog.vue', () => {
  it('affiche la version correctement', () => {
    const wrapper = mount(Changelog)
    expect(wrapper.text()).toContain('Version: 0.0.1')
  })

  it('rend le markdown correctement', () => {
    const wrapper = mount(Changelog)
    expect(wrapper.find('.changelog').exists()).toBe(true)
  })
}) 