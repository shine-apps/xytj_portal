import type { IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  changePassword,
  getSession,
  requestPasswordReset,
  resetPasswordWithOTP,
  signInEmail,
  signInPhone,
  signInWePhone,
  signOut,
  updateUser,
  verifyPhoneOtp,
} from '@/api/better-auth'
import { staticUrl } from '@/utils'

// 初始化状态
const userInfoState: IUserInfoRes = {
  userId: '',
  username: '',
  nickname: '',
  phoneNumber: '',
  email: '',
  avatar: staticUrl('/static/images/default-avatar.png'),
}

// 会话有效期由服务端 better-auth 统一管理（expiresIn 7 天 + updateAge 1 天滚动续期），
// 本地不再保存过期时间，token 是否有效以服务端响应为准。
const tokenInfoState = {
  token: '',
  userId: '',
}

const STORAGE_KEY_TOKEN = 'xytj_token'

export const useUserStore = defineStore(
  'user',
  () => {
    // 定义用户信息
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })

    // 定义token信息
    const tokenInfo = ref<typeof tokenInfoState>({ ...tokenInfoState })
    // 兼容旧版本存储：旧格式为 { token, userId, expiresAt }，其中 expiresAt 已废弃，
    // 读取时只提取新结构需要的字段，旧 token 仍可继续使用（服务端会话未失效）。
    const storedToken = uni.getStorageSync(STORAGE_KEY_TOKEN)
    if (storedToken && typeof storedToken === 'object' && typeof storedToken.token === 'string') {
      tokenInfo.value = {
        token: storedToken.token,
        userId: typeof storedToken.userId === 'string' ? storedToken.userId : '',
      }
    }

    // 设置token信息
    const setTokenInfo = (val: typeof tokenInfoState) => {
      console.log('设置token信息', val)
      tokenInfo.value = val
      if (val.token)
        uni.setStorageSync(STORAGE_KEY_TOKEN, tokenInfo.value)
    }

    // 设置用户信息
    const setUserInfo = (val: IUserInfoRes) => {
      console.log('设置用户信息', val)
      // 若头像为空 则使用默认头像
      if (!val.avatar) {
        val.avatar = userInfoState.avatar
      }
      userInfo.value = val
    }

    const setUserAvatar = (avatar: string) => {
      userInfo.value.avatar = avatar
      console.log('设置用户头像', avatar)
    }

    // 删除用户信息 (退出登录)
    const clearUserInfo = async () => {
      try {
        await signOut()
      }
      catch (e) {
        console.error('Logout failed', e)
      }
      finally {
        userInfo.value = { ...userInfoState }
        tokenInfo.value = { ...tokenInfoState }
        uni.removeStorageSync(STORAGE_KEY_TOKEN)
      }
    }

    /**
     * 获取用户信息
     */
    const fetchUserInfo = async () => {
      try {
        const res = await getSession()
        console.log('获取用户信息', res)
        if (res && res.user) {
          const mappedUser: IUserInfoRes = {
            userId: res.user.id,
            username: res.user.phoneNumber || res.user.email || '',
            nickname: res.user.name,
            avatar: res.user.image,
            phoneNumber: res.user.phoneNumber,
            email: res.user.email,
            role: res.user.role || 'user',
            roles: [],
          }
          if (res.user.role)
            mappedUser.roles.push(res.user.role)
          setUserInfo(mappedUser)
        }
      }
      catch (e) {
        console.error('Fetch session failed', e)
      }
      return null
    }

    // 本地不再判断 token 过期时间：会话由服务端滚动续期，只要本地存有 token
    // 即视为登录态；token 真正失效时服务端返回 401，由 HTTP 层统一兜底登出。
    const hasValidLogin = computed(() => {
      return !!tokenInfo.value.token
    })

    const hasUserInfo = computed(() => {
      return !!userInfo.value.userId
    })

    /**
     * 处理登录成功后的通用逻辑
     * @param res 登录接口返回的数据
     */
    const handleLoginSuccess = (res: {
      token: string
      user: {
        id: string
        email?: string | null
        phoneNumber?: string | null
        name?: string | null
        image?: string | null
        role?: string | null
      }
    }) => {
      if (!res || !res.token || !res.user) {
        throw new Error('Login failed')
      }

      setTokenInfo({
        token: res.token,
        userId: res.user.id,
      })

      const mappedUser: IUserInfoRes = {
        userId: res.user.id,
        username: res.user.email || res.user.phoneNumber || '',
        nickname: res.user.name,
        avatar: res.user.image,
        phoneNumber: res.user.phoneNumber || userInfoState.phoneNumber,
        email: res.user.email || userInfoState.email,
        role: res.user.role || 'user',
        roles: [],
      }
      if (res.user.role)
        mappedUser.roles.push(res.user.role)
      setUserInfo(mappedUser)
    }

    const login = async (username: string, password: string) => {
      const isPhone = /^1[3-9]\d{9}$/.test(username)
      let res = null
      if (isPhone) {
        res = await signInPhone({ phoneNumber: username, password })
      }
      else {
        res = await signInEmail({
          email: username,
          password,
        })
      }

      handleLoginSuccess(res)
    }

    const loginBySendOtp = async (phoneNumber: string, code: string) => {
      const res = await verifyPhoneOtp({ phoneNumber, code })
      handleLoginSuccess(res)
    }

    const loginByWechatPhone = async (code: string) => {
      const res = await signInWePhone({ code })
      handleLoginSuccess(res)
    }

    const updateProfile = async (data: {
      nickname?: string
      avatar?: string
    }) => {
      const updateData: { name?: string, image?: string } = {}
      if (data.nickname)
        updateData.name = data.nickname
      if (data.avatar)
        updateData.image = data.avatar

      const res = await updateUser(updateData)
      if (res?.status) {
        // 更新本地用户信息
        const mappedUser: IUserInfoRes = {
          ...userInfo.value,
          nickname: data.nickname || userInfo.value.nickname,
          avatar: data.avatar || userInfo.value.avatar,
        }
        setUserInfo(mappedUser)
        return true
      }
      return false
    }

    const isAdmin = computed(() => {
      const role = userInfo.value.role
      return role === 'admin' || role === 'xytj_admin'
    })

    /**
     * 更新密码. 若当前密码为空, 则设置新密码. 否则修改密码.
     * @param data
     * @returns
     */
    const updatePassword = async (data: { currentPassword: string, newPassword: string }) => {
      const res = await changePassword(data)
      return res?.status || false
    }

    /**
     * 请求密码重置OTP
     */
    const requestPasswordResetOTP = async (phoneNumber: string) => {
      const res = await requestPasswordReset({ phoneNumber })
      return res?.status || false
    }

    /**
     * 使用OTP重置密码
     */
    const resetPasswordWithPhoneOTP = async (data: { phoneNumber: string, otp: string, newPassword: string }) => {
      const res = await resetPasswordWithOTP(data)
      return res?.status || false
    }

    return {
      userInfo,
      tokenInfo,
      hasValidLogin,
      hasUserInfo,
      isAdmin,
      login,
      loginBySendOtp,
      loginByWechatPhone,
      updateProfile,
      updatePassword,
      requestPasswordResetOTP,
      resetPasswordWithPhoneOTP,
      clearUserInfo,
      fetchUserInfo,
      setUserInfo,
      setUserAvatar,
    }
  },
  {
    persist: false,
  },
)
