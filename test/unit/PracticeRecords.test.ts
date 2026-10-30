import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PracticeRecordsPage from '@/pages/practice/records.vue'

const { lifecycle, getPracticeRecordsAPI, setPageShareConfig } = vi.hoisted(() => ({
  lifecycle: {
    onLoad: undefined as (() => void) | undefined,
  },
  getPracticeRecordsAPI: vi.fn(),
  setPageShareConfig: vi.fn(),
}))

vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: () => void) => {
    lifecycle.onLoad = callback
  },
  onShow: vi.fn(),
}))

vi.mock('@/service/practice', () => ({
  getPracticeRecordsAPI,
  practiceTypeLabel: (type: string) => type,
}))

vi.mock('@/store/user', () => ({
  useUserStore: () => ({ hasValidLogin: true }),
}))

vi.mock('@/utils/share', () => ({
  setPageShareConfig,
}))

vi.mock('@/utils/cos', () => ({
  buildVideoCoverUrl: (url: string) => url,
}))

vi.mock('@/utils/toLoginPage', () => ({
  toLoginPage: vi.fn(),
}))

function mountPage() {
  const wrapper = mount(PracticeRecordsPage, {
    global: {
      stubs: {
        'z-paging': { template: '<div><slot /></div>' },
        'VideoPlayer': true,
      },
    },
  })
  lifecycle.onLoad?.()
  return wrapper
}

function findShareEntry(wrapper: ReturnType<typeof mountPage>) {
  return wrapper.findAll('text').find(node => node.text() === '分享')
}

describe('练功打卡广场分享', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('definePage', vi.fn())
    lifecycle.onLoad = undefined
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    })
  })

  it('配置小程序好友和朋友圈分享', () => {
    mountPage()

    expect(setPageShareConfig).toHaveBeenCalledOnce()
    const config = setPageShareConfig.mock.calls[0][0]
    expect(config.onShareAppMessage()).toEqual({
      title: '翔云文武·练功打卡广场',
      desc: '一起坚持练功，记录每一次成长',
      path: '/pages/practice/records',
    })
    expect(config.onShareTimeline()).toEqual({
      title: '翔云文武·练功打卡广场',
      query: '',
    })
  })

  it('h5 优先调起系统分享', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    const wrapper = mountPage()

    const entry = findShareEntry(wrapper)
    expect(entry).toBeDefined()
    await entry!.trigger('click')
    await flushPromises()

    expect(share).toHaveBeenCalledWith({
      title: '翔云文武·练功打卡广场',
      text: '一起坚持练功，记录每一次成长',
      url: window.location.href,
    })
    expect(uni.setClipboardData).not.toHaveBeenCalled()
  })

  it('h5 不支持系统分享时复制链接', async () => {
    const wrapper = mountPage()

    const entry = findShareEntry(wrapper)
    expect(entry).toBeDefined()
    await entry!.trigger('click')
    await flushPromises()

    expect(uni.setClipboardData).toHaveBeenCalledWith(expect.objectContaining({
      data: window.location.href,
      success: expect.any(Function),
    }))
  })

  it('h5 系统分享失败时复制链接', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error('share failed')),
    })
    const wrapper = mountPage()

    const entry = findShareEntry(wrapper)
    expect(entry).toBeDefined()
    await entry!.trigger('click')
    await flushPromises()

    expect(uni.setClipboardData).toHaveBeenCalledWith(expect.objectContaining({
      data: window.location.href,
    }))
  })
})
