import type { PracticeRecordItem } from '@/service/practice'
import type { ShareConfig } from '@/utils/share'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CheckinDetailPage from '@/pages/practice/checkin-detail.vue'

const { lifecycle, getPracticeRecordAPI, deleteCheckInAPI, setPageShareConfig, shanghaiTodayMock, userStoreMock } = vi.hoisted(() => ({
  lifecycle: {
    onLoad: undefined as ((options?: { id?: string }) => void) | undefined,
    onShow: undefined as (() => void) | undefined,
  },
  getPracticeRecordAPI: vi.fn(),
  deleteCheckInAPI: vi.fn(),
  setPageShareConfig: vi.fn(),
  shanghaiTodayMock: vi.fn(() => '2026-11-01'),
  userStoreMock: {
    hasValidLogin: true,
    userInfo: { userId: 'user-2' },
  },
}))

vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: (options?: { id?: string }) => void) => {
    lifecycle.onLoad = callback
  },
  onShow: (callback: () => void) => {
    lifecycle.onShow = callback
  },
}))

vi.mock('@/service/practice', () => ({
  getPracticeRecordAPI,
  deleteCheckInAPI,
  practiceTypeLabel: (type: string[]) => type.join('、'),
}))

vi.mock('@/utils/cos', () => ({
  buildVideoCoverUrl: (url: string) => `${url}?cover`,
}))

vi.mock('@/utils/share', () => ({
  setPageShareConfig,
}))

vi.mock('@/utils/dateUtil', () => ({
  formatTime: (time: string) => time,
  shanghaiToday: shanghaiTodayMock,
}))

vi.mock('@/store/user', () => ({
  useUserStore: () => userStoreMock,
}))

const detail: PracticeRecordItem = {
  id: 'check-in-1',
  userId: 'user-1',
  checkInDate: '2026-10-30T00:00:00.000Z',
  practiceType: ['八段锦'],
  durationMinutes: 32,
  notes: '呼吸比昨日更绵长。',
  location: { latitude: 30.2741, longitude: 120.1551, address: '云栖公园' },
  points: 12,
  createdAt: '2026-10-30T00:42:00.000Z',
  updatedAt: '2026-10-30T00:42:00.000Z',
  medias: [
    { type: 'IMAGE', url: 'https://cdn.example.com/image.jpg', size: 1024, mimeType: 'image/jpeg' },
    { type: 'VIDEO', url: 'https://cdn.example.com/video.mp4', size: 2048, mimeType: 'video/mp4' },
  ],
  challengeIds: ['challenge-1'],
  challenges: [{ id: 'challenge-1', title: '晨练二十一天' }],
  user: { id: 'user-1', name: '林安然', image: 'https://cdn.example.com/avatar.jpg' },
}

async function mountDetail() {
  const wrapper = mount(CheckinDetailPage, {
    global: {
      stubs: {
        'VideoPlayer': true,
        'wd-loading': true,
      },
    },
  })
  lifecycle.onLoad?.({ id: 'check-in-1' })
  await flushPromises()
  return wrapper
}

function findText(wrapper: Awaited<ReturnType<typeof mountDetail>>, text: string) {
  return wrapper.findAll('text,view,button').find(node => node.text() === text)
}

describe('每日打卡详情', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lifecycle.onLoad = undefined
    lifecycle.onShow = undefined
    getPracticeRecordAPI.mockResolvedValue(detail)
    userStoreMock.hasValidLogin = true
    userStoreMock.userInfo.userId = 'user-2'
    shanghaiTodayMock.mockReturnValue('2026-11-01')
    Object.assign(uni, {
      setNavigationBarTitle: vi.fn(),
      setClipboardData: vi.fn((options: { success?: () => void }) => options.success?.()),
      showToast: vi.fn(),
      showModal: vi.fn(),
      navigateTo: vi.fn(),
      navigateBack: vi.fn(),
      reLaunch: vi.fn(),
    })
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    ;(globalThis as any).definePage = vi.fn()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('按打卡日期设置标题并展示完整记录', async () => {
    const wrapper = await mountDetail()

    expect(getPracticeRecordAPI).toHaveBeenCalledWith('check-in-1')
    expect(uni.setNavigationBarTitle).toHaveBeenCalledWith({ title: '林安然 10月30号的练功打卡' })
    expect(wrapper.text()).toContain('林安然')
    expect(wrapper.text()).toContain('八段锦')
    expect(wrapper.text()).toContain('32分钟')
    expect(wrapper.text()).toContain('呼吸比昨日更绵长。')
    expect(wrapper.text()).toContain('晨练二十一天')
    expect(wrapper.text()).toContain('云栖公园')
    expect(wrapper.find('.shadow-md').exists()).toBe(false)
  })

  it('配置微信好友与朋友圈分享内容', async () => {
    await mountDetail()

    const config = setPageShareConfig.mock.calls[0]?.[0] as ShareConfig | undefined
    expect(config).toBeDefined()
    expect(config!.onShareAppMessage?.()).toEqual({
      title: '林安然 10月30号的练功打卡',
      desc: '八段锦 · 32分钟 · 获得12积分',
      path: '/pages/practice/checkin-detail?id=check-in-1',
      imageUrl: 'https://cdn.example.com/image.jpg',
    })
    expect(config!.onShareTimeline?.()).toEqual({
      title: '林安然 10月30号的练功打卡',
      query: 'id=check-in-1',
      imageUrl: 'https://cdn.example.com/image.jpg',
    })
  })

  it('h5 点击分享按钮时调起系统分享', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const wrapper = await mountDetail()

    await wrapper.find('button').trigger('click')

    expect(share).toHaveBeenCalledWith({
      title: '林安然 10月30号的练功打卡',
      text: '八段锦 · 32分钟 · 获得12积分',
      url: window.location.href,
    })
  })

  it('h5 不支持系统分享时复制当前链接', async () => {
    const wrapper = await mountDetail()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(uni.setClipboardData).toHaveBeenCalledWith(expect.objectContaining({ data: window.location.href }))
    expect(uni.showToast).toHaveBeenCalledWith({ title: '链接已复制，快去分享吧', icon: 'none' })
  })

  it('加载失败后可以重新加载', async () => {
    getPracticeRecordAPI.mockReset()
    getPracticeRecordAPI.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce(detail)
    const wrapper = await mountDetail()

    expect(findText(wrapper, '打卡详情加载失败')).toBeDefined()
    await findText(wrapper, '重新加载')!.trigger('click')
    await flushPromises()

    expect(getPracticeRecordAPI).toHaveBeenCalledTimes(2)
    expect(uni.setNavigationBarTitle).toHaveBeenCalledWith({ title: '林安然 10月30号的练功打卡' })
  })

  it('本人当天的打卡显示编辑和删除按钮', async () => {
    userStoreMock.userInfo.userId = 'user-1'
    shanghaiTodayMock.mockReturnValue('2026-10-30')
    const wrapper = await mountDetail()

    expect(findText(wrapper, '编辑')).toBeDefined()
    expect(findText(wrapper, '删除')).toBeDefined()
  })

  it('他人当天的打卡不显示编辑和删除按钮', async () => {
    shanghaiTodayMock.mockReturnValue('2026-10-30')
    const wrapper = await mountDetail()

    expect(findText(wrapper, '编辑')).toBeUndefined()
    expect(findText(wrapper, '删除')).toBeUndefined()
  })

  it('本人非当天的打卡不显示编辑和删除按钮', async () => {
    userStoreMock.userInfo.userId = 'user-1'
    const wrapper = await mountDetail()

    expect(findText(wrapper, '编辑')).toBeUndefined()
    expect(findText(wrapper, '删除')).toBeUndefined()
  })

  it('点击编辑跳转到今日打卡编辑页', async () => {
    userStoreMock.userInfo.userId = 'user-1'
    shanghaiTodayMock.mockReturnValue('2026-10-30')
    const wrapper = await mountDetail()
    const editButton = findText(wrapper, '编辑')
    expect(editButton).toBeDefined()

    await editButton!.trigger('click')

    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/practice/checkin?edit=1' })
  })

  it('确认删除后按打卡日期删除并返回', async () => {
    userStoreMock.userInfo.userId = 'user-1'
    shanghaiTodayMock.mockReturnValue('2026-10-30')
    deleteCheckInAPI.mockResolvedValue({ success: true })
    ;(uni.showModal as any).mockImplementation((options: any) => options.success?.({ confirm: true }))
    const wrapper = await mountDetail()
    const deleteButton = findText(wrapper, '删除')
    expect(deleteButton).toBeDefined()

    await deleteButton!.trigger('click')
    await flushPromises()

    expect(deleteCheckInAPI).toHaveBeenCalledWith('2026-10-30')
    expect(uni.showToast).toHaveBeenCalledWith({ title: '已删除', icon: 'success' })
    expect(uni.navigateBack).toHaveBeenCalled()
  })

  it('取消删除时不调用删除接口', async () => {
    userStoreMock.userInfo.userId = 'user-1'
    shanghaiTodayMock.mockReturnValue('2026-10-30')
    ;(uni.showModal as any).mockImplementation((options: any) => options.success?.({ confirm: false }))
    const wrapper = await mountDetail()
    const deleteButton = findText(wrapper, '删除')
    expect(deleteButton).toBeDefined()

    await deleteButton!.trigger('click')
    await flushPromises()

    expect(deleteCheckInAPI).not.toHaveBeenCalled()
    expect(uni.navigateBack).not.toHaveBeenCalled()
  })

  it('从编辑页返回后重新加载最新打卡内容', async () => {
    const wrapper = await mountDetail()

    lifecycle.onShow?.()
    await flushPromises()

    expect(getPracticeRecordAPI).toHaveBeenCalledTimes(2)
  })

  it('返回刷新失败时保留已展示的打卡内容', async () => {
    const wrapper = await mountDetail()
    getPracticeRecordAPI.mockRejectedValueOnce(new Error('network error'))

    lifecycle.onShow?.()
    await flushPromises()

    expect(wrapper.text()).toContain('呼吸比昨日更绵长。')
    expect(findText(wrapper, '打卡详情加载失败')).toBeUndefined()
  })
})
