import type { PracticeRecordItem } from '@/service/practice'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import ChallengeRecordsPanel from '@/pages/practice/components/ChallengeRecordsPanel.vue'

const { getPracticeRecordsAPI } = vi.hoisted(() => ({
  getPracticeRecordsAPI: vi.fn(),
}))

vi.mock('z-paging/components/z-paging/js/hooks/useZPaging.js', () => ({
  default: vi.fn(),
}))

vi.mock('@/service/practice', () => ({
  getPracticeRecordsAPI,
  practiceTypeLabel: (type: string[]) => type.join('、'),
}))

vi.mock('@/store/user', () => ({
  useUserStore: () => ({ hasValidLogin: true }),
}))

vi.mock('@/utils/cos', () => ({
  buildVideoCoverUrl: (url: string) => `${url}?cover`,
}))

const record: PracticeRecordItem = {
  id: 'check-in-1',
  userId: 'user-1',
  checkInDate: '2026-10-30T00:00:00.000Z',
  practiceType: ['八段锦'],
  durationMinutes: 32,
  notes: '呼吸比昨日更绵长。',
  location: null,
  points: 12,
  createdAt: '2026-10-30T00:42:00.000Z',
  updatedAt: '2026-10-30T00:42:00.000Z',
  medias: [
    { type: 'IMAGE', url: 'https://cdn.example.com/image.jpg', size: 1024, mimeType: 'image/jpeg' },
    { type: 'VIDEO', url: 'https://cdn.example.com/video.mp4', size: 2048, mimeType: 'video/mp4' },
  ],
  challengeIds: ['challenge-1'],
  challenges: [{ id: 'challenge-1', title: '晨练二十一天' }],
  user: { id: 'user-1', name: '林安然', image: null },
}

const ZPagingStub = defineComponent({
  props: {
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['query', 'update:modelValue'],
  mounted() {
    this.$emit('query', 1, 10)
  },
  methods: {
    completeByTotal(items: PracticeRecordItem[]) {
      this.$emit('update:modelValue', items)
    },
    complete() {},
  },
  template: '<div><slot /></div>',
})

async function mountPanel() {
  const wrapper = mount(ChallengeRecordsPanel, {
    props: { challengeId: 'challenge-1', active: true },
    global: {
      stubs: {
        'z-paging': ZPagingStub,
        'VideoPlayer': true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

function findCard(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
  return wrapper.findAll('view').find(node => node.classes().includes('shadow-sm') && node.text().includes(record.notes!))!
}

describe('挑战打卡记录面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPracticeRecordsAPI.mockResolvedValue({ checkIns: [record], total: 1, page: 1, pageSize: 10 })
    Object.assign(uni, { navigateTo: vi.fn(), previewImage: vi.fn() })
  })

  it('点击整张卡片进入对应打卡详情', async () => {
    const wrapper = await mountPanel()

    await findCard(wrapper).trigger('click')

    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/practice/checkin-detail?id=check-in-1' })
  })

  it('点击关联挑战不触发打卡详情跳转', async () => {
    const wrapper = await mountPanel()
    const challengeLink = wrapper.findAll('text').find(node => node.text() === '晨练二十一天')!

    await challengeLink.trigger('click')

    expect(uni.navigateTo).toHaveBeenCalledWith({ url: '/pages/practice/challenge-detail?id=challenge-1' })
    expect(uni.navigateTo).not.toHaveBeenCalledWith({ url: '/pages/practice/checkin-detail?id=check-in-1' })
  })

  it('图片预览和视频区域不触发打卡详情跳转', async () => {
    const wrapper = await mountPanel()

    await wrapper.find('image').trigger('click')
    await wrapper.findComponent({ name: 'VideoPlayer' }).trigger('click')

    expect(uni.previewImage).toHaveBeenCalled()
    expect(uni.navigateTo).not.toHaveBeenCalledWith({ url: '/pages/practice/checkin-detail?id=check-in-1' })
  })

  it('小程序分享按钮携带对应记录且点击不触发卡片跳转', async () => {
    const wrapper = await mountPanel()
    const shareButton = wrapper.find('button[open-type="share"]')

    expect(shareButton.exists()).toBe(true)
    expect(shareButton.attributes('data-check-in-id')).toBe('check-in-1')
    expect(shareButton.attributes('data-share-title')).toBe('林安然 10月30号的练功打卡')
    expect(shareButton.attributes('data-share-image')).toBe('https://cdn.example.com/image.jpg')

    await shareButton.trigger('click')
    expect(uni.navigateTo).not.toHaveBeenCalled()
  })
})
