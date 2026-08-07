import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Changelog from '../Changelog.vue'

describe('changelog.vue', () => {
  it('affiche la version correctement', () => {
    const wrapper = mount(Changelog)
    expect(wrapper.text()).toContain('Version: 0.0.1')
  })

  it('rend le markdown correctement', () => {
    const wrapper = mount(Changelog)
    expect(wrapper.find('.changelog').exists()).toBe(true)
  })
}) 