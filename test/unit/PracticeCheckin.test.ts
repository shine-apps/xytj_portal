import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import CheckinPage from '@/pages/practice/checkin.vue'

const mocks = vi.hoisted(() => ({
  lifecycle: {
    onLoad: undefined as ((options?: { edit?: string }) => void) | undefined,
  },
  getPracticeTypesAPI: vi.fn(),
  getChallengesAPI: vi.fn(),
  getCheckInByDateAPI: vi.fn(),
  submitCheckInAPI: vi.fn(),
  checkTextSecurityAPI: vi.fn(),
  enqueueOfflineCheckIn: vi.fn(),
  uploadToCos: vi.fn(),
  toLoginPage: vi.fn(),
  settingsStore: {
    globalChallengeId: null,
    fetchSettings: vi.fn(),
  },
}))

vi.mock('@dcloudio/uni-app', () => ({
  onLoad: (callback: (options?: { edit?: string }) => void) => {
    mocks.lifecycle.onLoad = callback
  },
}))

vi.mock('@/store/user', () => ({
  useUserStore: () => ({ hasValidLogin: true }),
}))

vi.mock('@/store/settings', () => ({
  useSettingsStore: () => mocks.settingsStore,
}))

vi.mock('@/service/practice', () => ({
  getPracticeTypesAPI: mocks.getPracticeTypesAPI,
  getChallengesAPI: mocks.getChallengesAPI,
  getCheckInByDateAPI: mocks.getCheckInByDateAPI,
  submitCheckInAPI: mocks.submitCheckInAPI,
}))

vi.mock('@/service/security', () => ({
  checkTextSecurityAPI: mocks.checkTextSecurityAPI,
}))

vi.mock('@/utils/practice-offline', () => ({
  enqueueOfflineCheckIn: mocks.enqueueOfflineCheckIn,
}))

vi.mock('@/utils/cos', () => ({
  uploadToCos: mocks.uploadToCos,
}))

vi.mock('@/utils/toLoginPage', () => ({
  toLoginPage: mocks.toLoginPage,
}))

vi.mock('@/components/MediaUploader.vue', () => ({
  default: {
    name: 'MediaUploader',
    template: '<div />',
  },
}))

const SubmitButtonStub = defineComponent({
  props: { loading: Boolean },
  emits: ['click'],
  template: '<button class="submit-button" @click="$emit(\'click\')"><slot /></button>',
})

async function mountCheckin() {
  const wrapper = mount(CheckinPage, {
    global: {
      stubs: {
        'wd-button': SubmitButtonStub,
        'wd-loading': true,
      },
    },
  })
  mocks.lifecycle.onLoad?.({})
  await flushPromises()
  return wrapper
}

async function submitNotes(wrapper: Awaited<ReturnType<typeof mountCheckin>>, notes: string) {
  await wrapper.find('textarea').setValue(notes)
  await wrapper.find('.submit-button').trigger('click')
  await flushPromises()
}

describe('打卡文本安全预检', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.lifecycle.onLoad = undefined
    mocks.getPracticeTypesAPI.mockResolvedValue([{ id: 'type-1', name: '八段锦', description: null }])
    mocks.getChallengesAPI.mockResolvedValue({ challenges: [] })
    mocks.settingsStore.fetchSettings.mockResolvedValue([])
    mocks.checkTextSecurityAPI.mockResolvedValue({ suggest: 'pass' })
    mocks.submitCheckInAPI.mockResolvedValue({
      pointsEarned: 0,
      newBadges: [],
      consecutiveDays: 1,
      totalPoints: 0,
      checkIn: null,
    })
    Object.assign(uni, {
      getNetworkType: vi.fn().mockResolvedValue({ networkType: 'wifi' }),
      setNavigationBarTitle: vi.fn(),
    })
    ;(globalThis as any).definePage = vi.fn()
  })

  it('心得通过安全检测后才提交打卡', async () => {
    const wrapper = await mountCheckin()

    await submitNotes(wrapper, '今日套路练习')

    expect(mocks.checkTextSecurityAPI).toHaveBeenCalledWith('今日套路练习')
    expect(mocks.submitCheckInAPI).toHaveBeenCalledTimes(1)
    expect(mocks.checkTextSecurityAPI.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.submitCheckInAPI.mock.invocationCallOrder[0])
  })

  it('安全检测拒绝时停止提交且不入离线队列', async () => {
    const wrapper = await mountCheckin()
    mocks.checkTextSecurityAPI.mockRejectedValue({ statusCode: 400 })

    await submitNotes(wrapper, '待检测文本')

    expect(mocks.submitCheckInAPI).not.toHaveBeenCalled()
    expect(mocks.enqueueOfflineCheckIn).not.toHaveBeenCalled()
  })
})
