<template>
  <!-- 根据配置决定是否显示登录页面 -->

  <view v-if="showLoginPage" class="login-page min-h-screen bg-white p-6">
    <view class="mb-8 mt-10 text-center text-3xl text-gray-800 font-bold">
      欢迎登录
    </view>

    <wd-tabs v-model="currentTab" class="mb-6">
      <wd-tab name="otp" title="验证码登录" />
      <wd-tab name="password" title="密码登录" />
    </wd-tabs>

    <view v-if="currentTab === 'otp'" class="pt-4 space-y-4">
      <wd-input v-model="otpForm.phoneNumber" placeholder="请输入手机号" type="number" clearable prefix-icon="mobile" />
      <wd-input v-model="otpForm.otp" placeholder="请输入验证码" type="number" clearable prefix-icon="secured">
        <template #suffix>
          <wd-button type="primary" size="small" :disabled="countdown > 0" text @click="handleSendOtp">
            {{ countdown > 0 ? `${countdown}s后重发` : "获取验证码" }}
          </wd-button>
        </template>
      </wd-input>
      <view class="pt-4">
        <wd-button block type="primary" size="large" :loading="loading" @click="handleOtpLogin">
          登录
        </wd-button>
      </view>
    </view>

    <view v-if="currentTab === 'password'" class="pt-4 space-y-4">
      <wd-input v-model="passwordForm.account" placeholder="请输入邮箱或手机号" clearable prefix-icon="user" />
      <wd-input v-model="passwordForm.password" show-password placeholder="请输入密码" clearable prefix-icon="lock-on" />
      <view class="pt-4">
        <wd-button block type="primary" size="large" :loading="loading" @click="handlePasswordLogin">
          登录
        </wd-button>
      </view>
    </view>

    <view class="mt-6 flex justify-between px-2 text-sm text-gray-500">
      <navigator url="/pages/register/register" hover-class="none" class="text-primary">
        注册账号
      </navigator>
      <navigator url="#" hover-class="none">
        忘记密码?
      </navigator>
    </view>
  </view>
  <view v-else class="h-screen flex items-center justify-center">
    <view class="text-center">
      <button
        class="rounded-lg bg-green-500 px-6 py-3 text-white shadow-md transition active:bg-green-600"
        open-type="getPhoneNumber"
        @getphonenumber="handleWechatPhoneLogin"
      >
        手机号快捷登录
      </button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { isMpWeixin } from '@uni-helper/uni-env'
import { sendPhoneOtp } from '@/api/better-auth'
import { LOGIN_PAGE_ENABLE_IN_MP } from '@/router/config'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '登录',
  },
})

const currentTab = ref('otp')
const loading = ref(false)
const countdown = ref(0)
let timer: any = null

const passwordForm = reactive({
  account: '',
  password: '',
})

const otpForm = reactive({
  phoneNumber: '',
  otp: '',
})

const userStore = useUserStore()

// 计算是否显示登录页面
const showLoginPage = computed(() => {
  // 如果不是微信小程序，或者配置允许在小程序中使用登录页，则显示
  return !isMpWeixin || LOGIN_PAGE_ENABLE_IN_MP
})

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+$/.test(email)
const validatePhone = (phone: string) => /^1[3-9]\d{9}$/.test(phone)

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})

async function handlePasswordLogin() {
  console.log(passwordForm)
  if (!passwordForm.account || !passwordForm.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    if (!validateEmail(passwordForm.account) && !validatePhone(passwordForm.account)) {
      uni.showToast({ title: '请输入正确的邮箱或手机号', icon: 'none' })
      loading.value = false
      return
    }
    const res = await userStore.login(passwordForm.account, passwordForm.password)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      }
      else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    })
  }
  catch (err: any) {
    console.error(err)
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

/**
 * 微信手机号快捷登录
 */
async function handleWechatPhoneLogin(e: any) {
  if (e.detail.errMsg === 'getPhoneNumber:ok' && e.detail.code) {
    loading.value = true
    try {
      await userStore.loginByWechatPhone(e.detail.code)
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        }
        else {
          uni.switchTab({ url: '/pages/index/index' })
        }
      }, 1500)
    }
    catch (err: any) {
      console.error(err)
      uni.showToast({ title: err.message || '登录失败', icon: 'none' })
    }
    finally {
      loading.value = false
    }
  }
  else {
    uni.showToast({ title: '获取手机号失败', icon: 'none' })
  }
}
async function handleSendOtp() {
  if (!validatePhone(otpForm.phoneNumber)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  try {
    await sendPhoneOtp({ phoneNumber: otpForm.phoneNumber })
    uni.showToast({ title: '验证码已发送', icon: 'none' })
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  }
  catch (err: any) {
    uni.showToast({ title: err.message || '发送失败', icon: 'none' })
  }
}
async function handleOtpLogin() {
  if (!validatePhone(otpForm.phoneNumber) || !otpForm.otp) {
    uni.showToast({ title: '请输入手机号和验证码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await userStore.loginBySendOtp(otpForm.phoneNumber, otpForm.otp)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      }
      else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    })
  }
  catch (err: any) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}
</script>
