import type { IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSession, signInEmail, signInPhone, signInWePhone, signOut, updateUser, verifyPhoneOtp } from '@/api/better-auth'

// 初始化状态
const userInfoState: IUserInfoRes = {
  userId: '',
  username: '',
  nickname: '',
  phoneNumber: '',
  email: '',
  avatar: '/static/images/default-avatar.png',
}

const tokenInfoState = {
  token: '',
  userId: '',
  expiresAt: 0,
}

const STORAGE_KEY_TOKEN = 'xytj_token'

export const useUserStore = defineStore(
  'user',
  () => {
    // 定义用户信息
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })

    // 定义token信息
    const tokenInfo = ref<typeof tokenInfoState>({ ...tokenInfoState })
    const _token = uni.getStorageSync(STORAGE_KEY_TOKEN)
    if (_token) {
      tokenInfo.value = _token
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
        if (res && res.user) {
          const mappedUser: IUserInfoRes = {
            userId: res.user.id,
            username: res.user.email || res.user.phoneNumber || '',
            nickname: res.user.name,
            avatar: res.user.image,
            phoneNumber: res.user.phoneNumber,
            email: res.user.email,
          }
          setUserInfo(mappedUser)
        }
        // if (res && res.session && res.session.token) {
        //   setTokenInfo({
        //     token: res.session.token,
        //     userId: res.session.userId,
        //     expiresAt: new Date(res.session.expiresAt).getTime(),
        //   })
        // }
      }
      catch (e) {
        console.error('Fetch session failed', e)
      }
      return null
    }

    const hasValidLogin = computed(() => {
      return tokenInfo.value.token && tokenInfo.value.expiresAt > Date.now()
    })

    const hasUserInfo = computed(() => {
      return !!userInfo.value.userId
    })

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

      if (res && res.token && res.user) {
        setTokenInfo({
          token: res.token,
          userId: res.user.id,
          expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 默认7天过期
        })
        const mappedUser: IUserInfoRes = {
          userId: res.user.id,
          username: res.user.email || res.user.phoneNumber || '',
          nickname: res.user.name,
          avatar: res.user.image,
          phoneNumber: res.user.phoneNumber || userInfoState.phone,
          email: res.user.email || userInfoState.email,
        }
        setUserInfo(mappedUser)
      }
      else {
        throw new Error('Login failed')
      }
    }

    const loginBySendOtp = async (phoneNumber: string, code: string) => {
      const res = await verifyPhoneOtp({ phoneNumber, code })
      if (res && res.token && res.user) {
        setTokenInfo({
          token: res.token,
          userId: res.user.id,
          expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 默认7天过期
        })
        const mappedUser: IUserInfoRes = {
          userId: res.user.id,
          username: res.user.email || res.user.phoneNumber || '',
          nickname: res.user.name,
          avatar: res.user.image,
          phoneNumber: res.user.phoneNumber,
          email: res.user.email,
        }
        setUserInfo(mappedUser)
      }
      else {
        throw new Error('Login failed')
      }
    }

    const loginByWechatPhone = async (code: string) => {
      const res = await signInWePhone({ code })
      if (res && res.token && res.user) {
        setTokenInfo({
          token: res.token,
          userId: res.user.id,
          expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 默认7天过期
        })
        const mappedUser: IUserInfoRes = {
          userId: res.user.id,
          username: res.user.email || res.user.phoneNumber || '',
          nickname: res.user.name,
          avatar: res.user.image,
          phoneNumber: res.user.phoneNumber,
          email: res.user.email,
        }
        setUserInfo(mappedUser)
      }
      else {
        throw new Error('Login failed')
      }
    }

    const updateProfile = async (data: { nickname?: string, avatar?: string }) => {
      const updateData: { name?: string, image?: string } = {}
      if (data.nickname)
        updateData.name = data.nickname
      if (data.avatar)
        updateData.image = data.avatar

      const res = await updateUser(updateData)
      if (res) {
        // 更新本地用户信息
        const mappedUser: IUserInfoRes = {
          ...userInfo.value,
          nickname: res.name || userInfo.value.nickname,
          avatar: res.image || userInfo.value.avatar,
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
