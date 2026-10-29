import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppKu from '@/App.ku.vue'

vi.mock('@/tabbar/index.vue', () => ({
  default: { template: '<div />' },
}))

vi.mock('@/tabbar/store', () => ({
  isPageTabbar: vi.fn(() => true),
}))

vi.mock('@/utils', () => ({
  currRoute: vi.fn(() => ({ path: '/' })),
}))

describe('app.ku.vue', () => {
  beforeEach(() => {
    vi.stubGlobal('onShow', vi.fn())
  })

  it('在全局根组件中挂载资料补全弹窗', () => {
    const wrapper = mount(AppKu, {
      global: {
        stubs: {
          KuRootView: true,
          ProfileCompletionPopup: {
            template: '<div data-test="profile-completion" />',
          },
        },
      },
    })

    expect(wrapper.find('[data-test="profile-completion"]').exists()).toBe(true)
  })
})
