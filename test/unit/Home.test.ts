import type { VueWrapper } from '@vue/test-utils'
import type { HomeRecentResponse } from '@/service/me'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from '@/pages/index/index.vue'

const { lifecycle, getHomeRecentAPI, getMonthlyCheckInsAPI, settingsStoreMock, userStoreMock, toLoginPage } = vi.hoisted(() => ({
  lifecycle: { onShow: undefined as (() => void) | undefined },
  getHomeRecentAPI: vi.fn(),
  getMonthlyCheckInsAPI: vi.fn(),
  settingsStoreMock: {
    isReady: true,
    showVideo: true,
    phoneNumber: '',
    banners: [],
    hotLinks: [],
    fetchSettings: vi.fn(),
  },
  userStoreMock: { hasValidLogin: true },
  toLoginPage: vi.fn(),
}))

vi.mock('@dcloudio/uni-app', () => ({
  onShow: (callback: () => void) => { lifecycle.onShow = callback },
}))
vi.mock('@/service/me', () => ({ getHomeRecentAPI }))
vi.mock('@/service/practice', () => ({ getMonthlyCheckInsAPI }))
vi.mock('@/store/settings', () => ({ useSettingsStore: () => settingsStoreMock }))
vi.mock('@/store/user', () => ({ useUserStore: () => userStoreMock }))
vi.mock('@/tabbar/store', () => ({ isPageTabbar: () => false }))
vi.mock('@/utils', () => ({ staticUrl: (path: string) => path }))
vi.mock('@/utils/toLoginPage', () => ({ toLoginPage }))
vi.mock('wot-design-uni', () => ({ useToast: () => ({ info: vi.fn() }) }))

const emptyRecent: HomeRecentResponse = { challenges: [], courses: [], activities: [] }
const recentFixture: HomeRecentResponse = {
  challenges: [{
    id: 'challenge-1',
    title: '晨练二十一天',
    joinedAt: '2026-10-30T08:00:00.000Z',
    startDate: '2026-10-01',
    endDate: '2026-12-01',
  }],
  courses: [{
    videoId: 'video-1',
    collectionId: 'collection-1',
    title: '云手详解',
    collectionTitle: '太极基础',
    coverUrl: null,
    lastViewedAt: '2026-10-31T09:00:00.000Z',
  }],
  activities: [{
    id: 'activity-1',
    title: '周末太极交流',
    joinedAt: '2026-10-30T08:00:00.000Z',
    startTime: '2026-11-05T10:00:00.000Z',
    endTime: '2026-11-05T12:00:00.000Z',
  }],
}

async function mountHome(): Promise<VueWrapper> {
  const wrapper = mount(HomePage, { global: { stubs: { 'wd-loading': true, 'wd-swiper': true } } })
  lifecycle.onShow?.()
  await flushPromises()
  return wrapper
}

function findByText(wrapper: VueWrapper, text: string) {
  const nodes = wrapper.findAll('view,text').filter(candidate => candidate.text() === text)
  const node = nodes[nodes.length - 1]
  expect(node, `未找到文本：${text}`).toBeDefined()
  return node!
}

describe('首页我的区域', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lifecycle.onShow = undefined
    userStoreMock.hasValidLogin = true
    getMonthlyCheckInsAPI.mockReset().mockResolvedValue({ checkIns: [] })
    getHomeRecentAPI.mockReset().mockResolvedValue(emptyRecent)
    ;(globalThis as any).definePage = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('登录后加载并展示三类记录，点击分别进入详情且返回首页会刷新', async () => {
    getHomeRecentAPI.mockResolvedValue(recentFixture)
    const wrapper = await mountHome()

    expect(wrapper.text()).toContain('我的区域')
    expect(findByText(wrapper, '晨练二十一天').exists()).toBe(true)
    await findByText(wrapper, '晨练二十一天').trigger('click')
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/practice/challenge-detail?id=challenge-1' })

    await findByText(wrapper, '云手详解').trigger('click')
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/courses/video-detail?id=video-1&collectionId=collection-1' })

    await findByText(wrapper, '周末太极交流').trigger('click')
    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/activities/detail?id=activity-1' })

    lifecycle.onShow?.()
    await flushPromises()
    expect(getHomeRecentAPI).toHaveBeenCalledTimes(2)
  })

  it('未登录时显示登录引导且不请求个人数据', async () => {
    userStoreMock.hasValidLogin = false
    const wrapper = await mountHome()

    expect(getHomeRecentAPI).not.toHaveBeenCalled()
    await findByText(wrapper, '登录后查看我的记录').trigger('click')
    expect(toLoginPage).toHaveBeenCalledWith()
  })

  it('三组均为空时显示统一空态', async () => {
    const wrapper = await mountHome()

    expect(findByText(wrapper, '暂无最近记录').exists()).toBe(true)
  })

  it('加载中只显示区域加载状态', async () => {
    let resolveRecent!: (value: HomeRecentResponse) => void
    getHomeRecentAPI.mockReturnValue(new Promise<HomeRecentResponse>((resolve) => {
      resolveRecent = resolve
    }))
    const wrapper = await mountHome()

    expect(findByText(wrapper, '加载中...').exists()).toBe(true)
    expect(wrapper.text()).toContain('功能入口')
    resolveRecent(recentFixture)
    await flushPromises()
    expect(wrapper.text()).toContain('云手详解')
  })

  it('失败后可点击重试并恢复展示', async () => {
    getHomeRecentAPI.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(recentFixture)
    const wrapper = await mountHome()

    await findByText(wrapper, '加载失败，点击重试').trigger('click')
    await flushPromises()
    expect(getHomeRecentAPI).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('周末太极交流')
  })
})
