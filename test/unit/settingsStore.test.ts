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

  it('微信小程序正式版审核中时隐藏视频课程', () => {
    setEnvVersion('release')
    const store = useSettingsStore()
    store.settings = [
      { id: 1, key: 'showVideo', value: true, createdAt: '', updatedAt: '' },
      { id: 2, key: 'isInReview', value: true, createdAt: '', updatedAt: '' },
    ]

    expect(store.isInReview).toBe(true)
    expect(store.showVideo).toBe(false)
  })

  it('微信小程序正式版非审核中时显示视频课程', () => {
    setEnvVersion('release')
    const store = useSettingsStore()
    store.settings = [
      { id: 1, key: 'showVideo', value: true, createdAt: '', updatedAt: '' },
      { id: 2, key: 'isInReview', value: false, createdAt: '', updatedAt: '' },
    ]

    expect(store.isInReview).toBe(false)
    expect(store.showVideo).toBe(true)
  })

  it('微信小程序体验版不受 isInReview 影响，仍按 showVideo 控制', () => {
    setEnvVersion('trial')
    const store = useSettingsStore()
    store.settings = [
      { id: 1, key: 'showVideo', value: true, createdAt: '', updatedAt: '' },
      { id: 2, key: 'isInReview', value: true, createdAt: '', updatedAt: '' },
    ]

    expect(store.isInReview).toBe(true)
    expect(store.showVideo).toBe(true)
  })

  it('isInReview 未配置时默认 false，正式版正常显示视频课程', () => {
    setEnvVersion('release')
    const store = useSettingsStore()
    store.settings = [
      { id: 1, key: 'showVideo', value: true, createdAt: '', updatedAt: '' },
    ]

    expect(store.isInReview).toBe(false)
    expect(store.showVideo).toBe(true)
  })
})
