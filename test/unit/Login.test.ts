import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, onUnmounted, reactive, ref } from 'vue'
import LoginPage from '@/pages/login/login.vue'

vi.mock('@/api/better-auth', () => ({
  sendPhoneOtp: vi.fn(),
}))

vi.mock('@/store/user', () => ({
  useUserStore: () => ({}),
}))

vi.mock('@/utils', () => ({
  staticUrl: (path: string) => path,
}))

const PickerStub = defineComponent({
  setup(_, { slots }) {
    const visible = ref(false)
    return () => h('div', [
      slots.default
        ? h('button', { 'data-test': 'country-trigger', 'onClick': () => { visible.value = true } }, slots.default())
        : h('div', { 'data-test': 'picker-default-cell' }, '中国大陆 +86'),
      visible.value ? h('div', { 'data-test': 'country-popup' }) : null,
    ])
  },
})

const InputStub = defineComponent({
  template: '<label><slot name="prefix" /><input /><slot name="suffix" /></label>',
})

function mountLogin() {
  return mount(LoginPage, {
    global: {
      stubs: {
        'wd-picker': PickerStub,
        'wd-input': InputStub,
        'wd-tabs': { template: '<div data-test="login-tabs"><slot /></div>' },
        'wd-tab': true,
        'wd-button': { template: '<button><slot /></button>' },
        'wd-icon': true,
        'navigator': true,
      },
    },
  })
}

async function toggleOtherLogin(wrapper: ReturnType<typeof mountLogin>, text: string) {
  const entry = wrapper.findAll('text').find(node => node.text() === text)
  expect(entry).toBeDefined()
  await entry!.trigger('click')
}

describe('登录页', () => {
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('reactive', reactive)
    vi.stubGlobal('onUnmounted', onUnmounted)
    vi.stubGlobal('definePage', vi.fn())
  })

  it('默认隐藏其他登录方式，点击后可展开和收起', async () => {
    const wrapper = mountLogin()

    expect(wrapper.find('[data-test="login-tabs"]').exists()).toBe(false)
    await toggleOtherLogin(wrapper, '展开其他登录方式')
    expect(wrapper.find('[data-test="login-tabs"]').exists()).toBe(true)

    await toggleOtherLogin(wrapper, '收起其他登录方式')
    expect(wrapper.find('[data-test="login-tabs"]').exists()).toBe(false)
  })

  it('不显示常驻选择单元格，点击区号后才打开弹窗', async () => {
    const wrapper = mountLogin()
    await toggleOtherLogin(wrapper, '展开其他登录方式')

    expect(wrapper.find('[data-test="picker-default-cell"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="country-popup"]').exists()).toBe(false)

    const trigger = wrapper.find('[data-test="country-trigger"]')
    expect(trigger.text()).toContain('+86')
    await trigger.trigger('click')

    expect(wrapper.find('[data-test="country-popup"]').exists()).toBe(true)
  })
})
