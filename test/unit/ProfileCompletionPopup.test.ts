import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { updateUser } from '@/api/better-auth'
import ProfileCompletionPopup from '@/components/ProfileCompletionPopup.vue'
import { useUserStore } from '@/store/user'
import { uploadToCos } from '@/utils/cos'

vi.mock('@/api/better-auth', () => ({
  changePassword: vi.fn(),
  getSession: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPasswordWithOTP: vi.fn(),
  signInEmail: vi.fn(),
  signInPhone: vi.fn(),
  signInWePhone: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
  verifyPhoneOtp: vi.fn(),
}))

vi.mock('@/utils', () => ({
  staticUrl: (path: string) => path,
}))

vi.mock('@/utils/cos', () => ({
  uploadToCos: vi.fn(),
}))

const PopupStub = defineComponent({
  props: {
    modelValue: Boolean,
    position: String,
    closeOnClickModal: Boolean,
  },
  template: '<div v-if="modelValue" data-test="popup"><slot /></div>',
})

const InputStub = defineComponent({
  props: {
    modelValue: String,
  },
  emits: ['update:modelValue'],
  template: '<input data-test="nickname" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)">',
})

const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
})

const ImgStub = defineComponent({
  props: {
    src: String,
  },
  template: '<img data-test="avatar" :src="src">',
})

function mountPopup(options: {
  loggedIn?: boolean
  userLoaded?: boolean
  nickname?: string
  avatar?: string
} = {}) {
  const {
    loggedIn = true,
    userLoaded = true,
    nickname = '138****8000',
    avatar = '',
  } = options

  const pinia = createPinia()
  setActivePinia(pinia)
  const userStore = useUserStore()
  userStore.tokenInfo = {
    token: loggedIn ? 'token' : '',
    userId: userLoaded ? 'user-1' : '',
  }
  userStore.userInfo = {
    userId: userLoaded ? 'user-1' : '',
    username: '',
    nickname: userLoaded ? nickname : '',
    avatar,
  }

  const wrapper = mount(ProfileCompletionPopup, {
    global: {
      plugins: [pinia],
      stubs: {
        'wd-popup': PopupStub,
        'wd-input': InputStub,
        'wd-button': ButtonStub,
        'wd-img': ImgStub,
        'wd-icon': true,
      },
    },
  })

  return { userStore, wrapper }
}

type PopupWrapper = ReturnType<typeof mountPopup>['wrapper']

function getButton(wrapper: PopupWrapper, text: string) {
  const button = wrapper.findAll('button').find(item => item.text() === text)
  if (!button)
    throw new Error(`未找到按钮：${text}`)
  return button
}

async function chooseAvatar(wrapper: PopupWrapper) {
  vi.mocked(uni.chooseImage).mockImplementationOnce((options) => {
    options.success?.({
      tempFilePaths: ['blob:avatar'],
      tempFiles: [{ path: 'blob:avatar', size: 100 }],
    })
  })
  await wrapper.find('button[aria-label="选择头像"]').trigger('click')
}

describe('profileCompletionPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('资料不完整时显示可通过遮罩关闭的底部弹窗', () => {
    const { wrapper } = mountPopup()

    expect(wrapper.find('[data-test="popup"]').exists()).toBe(true)
    const popup = wrapper.findComponent(PopupStub)
    expect(popup.props('position')).toBe('bottom')
    expect(popup.props('closeOnClickModal')).toBe(true)
  })

  it('用户信息尚未恢复时不显示弹窗', () => {
    const { wrapper } = mountPopup({ userLoaded: false })

    expect(wrapper.find('[data-test="popup"]').exists()).toBe(false)
  })

  it('头像和昵称都完整时不显示弹窗', () => {
    const { wrapper } = mountPopup({
      nickname: '云山',
      avatar: 'https://example.com/avatar.png',
    })

    expect(wrapper.find('[data-test="popup"]').exists()).toBe(false)
  })

  it('取消后本次不再弹出，重新登录时再次提醒', async () => {
    const { userStore, wrapper } = mountPopup({ nickname: '云山' })
    await getButton(wrapper, '取消').trigger('click')

    expect(wrapper.find('[data-test="popup"]').exists()).toBe(false)

    userStore.userInfo.nickname = '云'
    await nextTick()
    expect(wrapper.find('[data-test="popup"]').exists()).toBe(false)

    userStore.tokenInfo = { token: '', userId: 'user-1' }
    await nextTick()
    userStore.tokenInfo = { token: 'token', userId: 'user-1' }
    await nextTick()
    expect(wrapper.find('[data-test="popup"]').exists()).toBe(true)
  })

  it('昵称为空或仍为默认值时不提交', async () => {
    const { wrapper } = mountPopup()

    await getButton(wrapper, '完成').trigger('click')
    expect(uni.showToast).toHaveBeenCalledWith({ title: '请输入昵称', icon: 'none' })

    await wrapper.find('[data-test="nickname"]').setValue('138****8000')
    await chooseAvatar(wrapper)
    await getButton(wrapper, '完成').trigger('click')

    expect(uni.showToast).toHaveBeenCalledWith({ title: '请设置新的昵称', icon: 'none' })
    expect(uploadToCos).not.toHaveBeenCalled()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('未选择头像时不提交', async () => {
    const { wrapper } = mountPopup()
    await wrapper.find('[data-test="nickname"]').setValue('云山')

    await getButton(wrapper, '完成').trigger('click')

    expect(uni.showToast).toHaveBeenCalledWith({ title: '请选择头像', icon: 'none' })
    expect(uploadToCos).not.toHaveBeenCalled()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('仅头像缺失时回填已有昵称', () => {
    const { wrapper } = mountPopup({ nickname: '云山' })

    expect((wrapper.find('[data-test="nickname"]').element as HTMLInputElement).value).toBe('云山')
  })

  it('仅昵称缺失时复用已有头像，无需重新上传', async () => {
    vi.mocked(updateUser).mockResolvedValueOnce({ status: true })
    const avatar = 'https://example.com/existing-avatar.png'
    const { wrapper } = mountPopup({ nickname: '', avatar })

    expect(wrapper.find('[data-test="avatar"]').attributes('src')).toBe(avatar)
    await wrapper.find('[data-test="nickname"]').setValue('云山')
    await getButton(wrapper, '完成').trigger('click')
    await flushPromises()

    expect(uploadToCos).not.toHaveBeenCalled()
    expect(updateUser).toHaveBeenCalledWith({ name: '云山', image: avatar })
    expect(wrapper.find('[data-test="popup"]').exists()).toBe(false)
  })

  it('上传新头像并保存昵称后关闭弹窗', async () => {
    vi.mocked(uploadToCos).mockResolvedValueOnce({ url: 'https://example.com/avatar.png', key: 'avatar' })
    vi.mocked(updateUser).mockResolvedValueOnce({ status: true })
    const { userStore, wrapper } = mountPopup()
    await wrapper.find('[data-test="nickname"]').setValue('  云山  ')
    await chooseAvatar(wrapper)

    await getButton(wrapper, '完成').trigger('click')
    await flushPromises()

    expect(uploadToCos).toHaveBeenCalledWith('blob:avatar')
    expect(updateUser).toHaveBeenCalledWith({ name: '云山', image: 'https://example.com/avatar.png' })
    expect(userStore.userInfo.nickname).toBe('云山')
    expect(userStore.userInfo.avatar).toBe('https://example.com/avatar.png')
    expect(wrapper.find('[data-test="popup"]').exists()).toBe(false)
  })

  it('保存失败时保留弹窗和已填写内容', async () => {
    vi.mocked(uploadToCos).mockResolvedValueOnce({ url: 'https://example.com/avatar.png', key: 'avatar' })
    vi.mocked(updateUser).mockRejectedValueOnce(new Error('network error'))
    const { wrapper } = mountPopup()
    await wrapper.find('[data-test="nickname"]').setValue('云山')
    await chooseAvatar(wrapper)

    await getButton(wrapper, '完成').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="popup"]').exists()).toBe(true)
    expect((wrapper.find('[data-test="nickname"]').element as HTMLInputElement).value).toBe('云山')
    expect(uni.showToast).toHaveBeenCalledWith({ title: '保存失败，请重试', icon: 'none' })
  })
})
