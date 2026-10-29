import type { ChallengeDetail } from '@/service/practice'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import ChallengeDetailPage from '@/pages/practice/challenge-detail.vue'

const { lifecycle, userStore, getChallengeDetailAPI } = vi.hoisted(() => ({
  lifecycle: {
    onLoad: undefined as ((options?: { id?: string }) => void) | undefined,
  },
  userStore: {
    userInfo: { userId: 'creator-1' },
    isAdmin: false,
  },
  getChallengeDetailAPI: vi.fn(),
}))

vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: (options?: { id?: string }) => void) => {
    lifecycle.onLoad = callback
  },
  onShow: vi.fn(),
}))

vi.mock('@/store/user', () => ({
  useUserStore: () => userStore,
}))

vi.mock('@/service/practice', () => ({
  getChallengeDetailAPI,
  joinChallengeAPI: vi.fn(),
  leaveChallengeAPI: vi.fn(),
  createChallengeAPI: vi.fn(),
  updateChallengeAPI: vi.fn(),
}))

vi.mock('wot-design-uni', () => ({
  useMessage: () => ({ confirm: vi.fn() }),
}))

const ChallengeFormStub = defineComponent({
  props: {
    show: Boolean,
    challenge: { type: Object, default: undefined },
  },
  template: '<div data-test="challenge-form" />',
})

const detail: ChallengeDetail = {
  challenge: {
    id: 'challenge-1',
    title: '太极共修',
    description: '每日练拳',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ongoing',
    participantCount: 1,
    isJoined: true,
    isGlobal: false,
    creator: { id: 'creator-1', name: '创建者' },
  },
  leaderboard: [],
}

async function mountDetail() {
  const wrapper = mount(ChallengeDetailPage, {
    global: {
      stubs: {
        'ChallengeForm': ChallengeFormStub,
        'wd-loading': true,
        'wd-message-box': true,
      },
    },
  })
  lifecycle.onLoad?.({ id: 'challenge-1' })
  await flushPromises()
  return wrapper
}

function findText(wrapper: Awaited<ReturnType<typeof mountDetail>>, text: string) {
  return wrapper.findAll('text').find(node => node.text() === text)
}

describe('挑战详情编辑权限', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lifecycle.onLoad = undefined
    userStore.userInfo.userId = 'creator-1'
    userStore.isAdmin = false
    getChallengeDetailAPI.mockResolvedValue(detail)
    Object.assign(uni, { setNavigationBarTitle: vi.fn() })
    ;(globalThis as any).definePage = vi.fn()
  })

  it('创建者可以打开编辑弹层', async () => {
    const wrapper = await mountDetail()
    const editText = findText(wrapper, '编辑挑战')

    expect(editText).toBeDefined()
    await editText!.trigger('click')

    expect(wrapper.findComponent(ChallengeFormStub).props('show')).toBe(true)
    expect(wrapper.findComponent(ChallengeFormStub).props('challenge')).toEqual(detail.challenge)
  })

  it('系统管理员可以编辑他人创建的挑战', async () => {
    userStore.userInfo.userId = 'admin-1'
    userStore.isAdmin = true
    const wrapper = await mountDetail()

    expect(findText(wrapper, '编辑挑战')).toBeDefined()
  })

  it('普通非创建者看不到编辑入口', async () => {
    userStore.userInfo.userId = 'other-user'
    const wrapper = await mountDetail()

    expect(findText(wrapper, '编辑挑战')).toBeUndefined()
  })
})
