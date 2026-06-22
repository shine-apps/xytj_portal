<template>
  <view class="min-h-screen bg-white px-6 pt-20">
    <view class="mb-10 flex flex-col items-center">
      <image src="/static/logo.png" class="mb-4 h-20 w-20" mode="aspectFit" />
      <text class="text-2xl text-[#1a1a1a] font-bold tracking-widest">翔云文武</text>
    </view>

    <view v-if="isMpWeixin" class="mb-8">
      <button
        class="w-full rounded-lg bg-[#07c160] py-3 text-white font-medium shadow-md transition active:bg-[#06ad56]"
        open-type="getPhoneNumber"
        @getphonenumber="handleWechatPhoneLogin"
      >
        手机号快捷登录
      </button>
    </view>

    <view v-if="isMpWeixin" class="mb-6 flex items-center">
      <view class="h-px flex-1 bg-gray-200" />
      <text class="px-4 text-sm text-gray-400">其他登录方式</text>
      <view class="h-px flex-1 bg-gray-200" />
    </view>

    <wd-tabs v-model="currentTab" class="mb-6">
      <wd-tab name="otp" title="验证码登录" />
      <wd-tab name="password" title="密码登录" />
    </wd-tabs>

    <view v-if="currentTab === 'otp'" class="pt-4 space-y-4">
      <wd-input v-model="otpForm.phoneNumber" placeholder="请输入手机号" type="number" clearable>
        <template #prefix>
          <view class="mr-2 flex items-center border-r border-gray-200 pr-2 active:opacity-60" @click.stop="openCountryPicker">
            <text class="text-base text-[#1a1a1a]">+{{ otpForm.countryCode }}</text>
            <wd-icon name="arrow-down" size="14px" custom-class="ml-1 text-gray-400" />
          </view>
        </template>
      </wd-input>
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
      <!-- <navigator url="/pages/register/register" hover-class="none" class="text-primary">
        注册账号
      </navigator> -->
      <navigator url="#" hover-class="none">
        忘记密码?
      </navigator>
    </view>

    <wd-picker
      v-model="countryCodeSelected"
      v-model:visible="showCountryPicker"
      :columns="countryCodeColumns"
      title="选择国家/地区"
      @confirm="onCountryCodeConfirm"
    />
  </view>
</template>

<script lang="ts" setup>
import { isMpWeixin } from '@uni-helper/uni-env'
import { sendPhoneOtp } from '@/api/better-auth'
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
  countryCode: '86',
  phoneNumber: '',
  otp: '',
})

// 国家/地区区号选项
const countryCodeColumns = ref<{ label: string, value: string }[]>([
  { label: '中国大陆 +86', value: '86' },
  { label: '中国香港 +852', value: '852' },
  { label: '中国澳门 +853', value: '853' },
  { label: '中国台湾 +886', value: '886' },
  { label: '美国/加拿大 +1', value: '1' },
  { label: '新加坡 +65', value: '65' },
  { label: '日本 +81', value: '81' },
  { label: '韩国 +82', value: '82' },
  { label: '英国 +44', value: '44' },
  { label: '澳大利亚 +61', value: '61' },
  { label: '法国 +33', value: '33' },
  { label: '德国 +49', value: '49' },
  { label: '印度 +91', value: '91' },
  { label: '马来西亚 +60', value: '60' },
  { label: '泰国 +66', value: '66' },
])

const showCountryPicker = ref(false)
const countryCodeSelected = ref<string[]>(['86'])

function openCountryPicker() {
  countryCodeSelected.value = [otpForm.countryCode]
  showCountryPicker.value = true
}

function onCountryCodeConfirm({ selectedItems }: { selectedItems: { value: string }[] }) {
  const value = selectedItems?.[0]?.value
  if (value)
    otpForm.countryCode = value
}

function getFullPhoneNumber() {
  return `+${otpForm.countryCode}${otpForm.phoneNumber}`
}

const userStore = useUserStore()

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+$/.test(email)
// 中国大陆手机号严格校验；其他国家/地区仅做 4~15 位数字校验
function validatePhone(phone: string, code = '86') {
  if (!phone)
    return false
  if (code === '86')
    return /^1[3-9]\d{9}$/.test(phone)
  return /^\d{4,15}$/.test(phone)
}

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
  if (!validatePhone(otpForm.phoneNumber, otpForm.countryCode)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }

  try {
    await sendPhoneOtp({ phoneNumber: getFullPhoneNumber() })
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
  if (!validatePhone(otpForm.phoneNumber, otpForm.countryCode) || !otpForm.otp) {
    uni.showToast({ title: '请输入手机号和验证码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    await userStore.loginBySendOtp(getFullPhoneNumber(), otpForm.otp)
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
