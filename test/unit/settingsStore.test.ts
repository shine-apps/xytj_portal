import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settings'

vi.mock('@/api/settings', () => ({ getSettings: vi.fn() }))
vi.mock('@/utils/cos', () => ({ buildVideoCoverUrl: vi.fn() }))

function setEnvVersion(envVersion: 'develop' | 'trial' | 'release') {
  vi.mocked(uni.getAccountInfoSync).mockReturnValue({
    miniProgram: { envVersion },
  } as ReturnType<typeof uni.getAccountInfoSync>)
}

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it.each(['develop', 'release'] as const)('微信小程序 %s 版始终显示视频课程', (envVersion) => {
    setEnvVersion(envVersion)
    const store = useSettingsStore()
    store.settings = [{
      id: 1,
      key: 'showVideo',
      value: false,
      createdAt: '',
      updatedAt: '',
    }]

    expect(store.showVideo).toBe(true)
  })

  it('微信小程序体验版按设置控制视频课程显示', () => {
    setEnvVersion('trial')
    const store = useSettingsStore()
    store.settings = [{
      id: 1,
      key: 'showVideo',
      value: false,
      createdAt: '',
      updatedAt: '',
    }]

    expect(store.showVideo).toBe(false)
  })
})
