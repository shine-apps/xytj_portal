import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUserStore } from '@/store/user'

const mocks = vi.hoisted(() => ({
  signInWePhone: vi.fn(),
  getSession: vi.fn(),
  bindWxOpenid: vi.fn(),
  getWxCode: vi.fn(),
}))

vi.mock('@/api/better-auth', () => ({
  changePassword: vi.fn(),
  getSession: mocks.getSession,
  requestPasswordReset: vi.fn(),
  resetPasswordWithOTP: vi.fn(),
  signInEmail: vi.fn(),
  signInPhone: vi.fn(),
  signInWePhone: mocks.signInWePhone,
  signOut: vi.fn(),
  updateUser: vi.fn(),
  verifyPhoneOtp: vi.fn(),
  bindWxOpenid: mocks.bindWxOpenid,
}))
vi.mock('@/api/login', () => ({ getWxCode: mocks.getWxCode }))
vi.mock('@/utils', () => ({ staticUrl: (path: string) => path }))

function makeAuthUser(wxOpenid: string | null = null) {
  return {
    id: 'user-1',
    email: 'u1@x.com',
    phoneNumber: '13800000000',
    name: 'Test',
    image: null,
    role: 'user',
    wxOpenid,
  }
}

describe('用户 wxOpenid 自动补全', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('微信手机号快捷登录后自动获取并保存 wxOpenid', async () => {
    mocks.signInWePhone.mockResolvedValue({ token: 'token', user: makeAuthUser() })
    mocks.getWxCode.mockResolvedValue({ code: 'uni-login-code' })
    mocks.bindWxOpenid.mockResolvedValue({ wxOpenid: 'wx-openid-1' })
    const store = useUserStore()

    await store.loginByWechatPhone('phone-auth-code')

    expect(mocks.signInWePhone).toHaveBeenCalledWith({ code: 'phone-auth-code' })
    expect(mocks.getWxCode).toHaveBeenCalledTimes(1)
    expect(mocks.bindWxOpenid).toHaveBeenCalledWith({ code: 'uni-login-code' })
    expect(store.userInfo.wxOpenid).toBe('wx-openid-1')
  })

  it('已有 wxOpenid 时不重复获取', async () => {
    mocks.signInWePhone.mockResolvedValue({
      token: 'token',
      user: makeAuthUser('existing-openid'),
    })
    const store = useUserStore()

    await store.loginByWechatPhone('phone-auth-code')

    expect(mocks.getWxCode).not.toHaveBeenCalled()
    expect(mocks.bindWxOpenid).not.toHaveBeenCalled()
    expect(store.userInfo.wxOpenid).toBe('existing-openid')
  })

  it('老用户恢复会话后缺少 wxOpenid 时自动补全', async () => {
    mocks.getSession.mockResolvedValue({ user: makeAuthUser(), session: {} })
    mocks.getWxCode.mockResolvedValue({ code: 'uni-login-code' })
    mocks.bindWxOpenid.mockResolvedValue({ wxOpenid: 'wx-openid-2' })
    const store = useUserStore()

    await store.fetchUserInfo()

    expect(mocks.bindWxOpenid).toHaveBeenCalledWith({ code: 'uni-login-code' })
    expect(store.userInfo.wxOpenid).toBe('wx-openid-2')
  })
})
