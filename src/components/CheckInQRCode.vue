<script setup lang="ts">
import type { IActivityCheckInCode } from '@/service/checkin'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { generateCheckInCodeAPI, getTodayCheckInCountAPI, invalidateCheckInCodeAPI } from '@/service/checkin'

const props = defineProps<{
  activityId: string
}>()

const emit = defineEmits(['update:checkInCode'])

const checkInCode = ref<IActivityCheckInCode | null>(null)
const loading = ref(false)
const countdown = ref(0)
const todayCount = ref(0)

let countdownTimer: ReturnType<typeof setInterval> | null = null
let todayCountTimer: ReturnType<typeof setInterval> | null = null

const qrCodeUrl = computed(() => {
  if (!checkInCode.value)
    return ''

  if (checkInCode.value.wxaCodeUrl) {
    return checkInCode.value.wxaCodeUrl
  }
  else {
    return ''
  }

  // const text = `https://xytj.shinehe.cn/activity_checkin/?activity=${props.activityId}&code=${checkInCode.value.code}`
  // return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`
})

// async function generateQrCode() {
//   const schemeInfo = await wx.getURLScheme({
//     jumpWxa: {
//       path: 'pages/activities/check-in', // 要跳转的小程序路径
//       query: `activity=${props.activityId}&code=${checkInCode.value.code}`, // 参数
//     },
//   })
//   return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(schemeInfo.url)}`
// }

const isValid = computed(() => {
  if (!checkInCode.value)
    return false
  return checkInCode.value.isActive && new Date(checkInCode.value.validUntil) > new Date()
})

const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

function startCountdown() {
  if (countdownTimer)
    clearInterval(countdownTimer)

  if (!checkInCode.value)
    return

  const updateCountdown = () => {
    const now = new Date().getTime()
    const validUntil = new Date(checkInCode.value!.validUntil).getTime()
    const diff = Math.max(0, Math.floor((validUntil - now) / 1000))
    countdown.value = diff

    if (diff === 0 && countdownTimer) {
      clearInterval(countdownTimer)
      checkInCode.value = null
    }
  }

  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
}

async function fetchTodayCount() {
  try {
    const res = await getTodayCheckInCountAPI(props.activityId)
    todayCount.value = res.count
  }
  catch (error) {
    console.error('获取今日签到人数失败', error)
  }
}

function startTodayCountRefresh() {
  if (todayCountTimer)
    clearInterval(todayCountTimer)

  fetchTodayCount()
  todayCountTimer = setInterval(fetchTodayCount, 10000)
}

function getEnvVersion(): 'release' | 'trial' | 'develop' {
  // #ifdef MP-WEIXIN
  const accountInfo = uni.getAccountInfoSync()
  const env = accountInfo.miniProgram?.envVersion
  if (env === 'release' || env === 'trial' || env === 'develop') {
    return env
  }
  // #endif
  return 'release'
}

async function generateCode() {
  loading.value = true
  try {
    const envVersion = getEnvVersion()
    const res = await generateCheckInCodeAPI(props.activityId, 60, envVersion)
    checkInCode.value = res
    emit('update:checkInCode', res)
    startCountdown()
    startTodayCountRefresh()
    uni.showToast({ title: '二维码已生成', icon: 'success' })
  }
  catch (error) {
    console.error('生成二维码失败', error)
    uni.showToast({ title: '生成失败', icon: 'error' })
  }
  finally {
    loading.value = false
  }
}

async function invalidateCode() {
  if (!checkInCode.value)
    return

  try {
    await invalidateCheckInCodeAPI(props.activityId, checkInCode.value.id)
    checkInCode.value = null
    emit('update:checkInCode', null)
    if (countdownTimer)
      clearInterval(countdownTimer)
    uni.showToast({ title: '已停止签到', icon: 'success' })
  }
  catch (error) {
    console.error('停止签到失败', error)
    uni.showToast({ title: '操作失败', icon: 'error' })
  }
}

onMounted(() => {
  console.log('CheckInQRCode mounted with activityId:', props.activityId)
})

onUnmounted(() => {
  if (countdownTimer)
    clearInterval(countdownTimer)
  if (todayCountTimer)
    clearInterval(todayCountTimer)
})

defineExpose({
  generateCodeIfNotExist() {
    if (!checkInCode.value)
      generateCode()
  },
})
</script>

<template>
  <view class="p-4">
    <view class="rounded-xl bg-white p-5 shadow-sm">
      <view class="mb-4 flex items-center justify-between">
        <text class="text-base text-gray-800 font-semibold">签到二维码</text>
        <view v-if="isValid" class="flex items-center gap-1 rounded bg-red-50 px-2 py-1">
          <text class="i-carbon-time text-[#a33327]" />
          <text class="text-sm text-[#a33327] font-semibold">{{ formatCountdown }}</text>
        </view>
      </view>

      <view class="flex flex-col items-center py-5">
        <template v-if="isValid">
          <image :src="qrCodeUrl" class="h-50 w-50 rounded-lg" mode="aspectFit" />
          <text class="mt-3 text-sm text-gray-600">请成员使用微信扫码签到</text>
        </template>
        <template v-else>
          <view class="flex flex-col items-center gap-3 py-10">
            <text class="i-carbon-qr-code text-6xl text-gray-300" />
            <text class="text-sm text-gray-400">暂无有效二维码</text>
          </view>
        </template>
      </view>

      <view class="mt-4">
        <button v-if="!isValid" class="h-11 w-full flex items-center justify-center rounded-lg bg-#a33327 text-base text-white font-medium" :loading="loading" @click="generateCode">
          <text class="i-carbon-renew mr-1" />
          生成二维码
        </button>
        <button v-else class="h-11 w-full flex items-center justify-center rounded-lg bg-red-50 text-base text-[#a33327] font-medium" @click="invalidateCode">
          <text class="i-carbon-close mr-1" />
          停止签到
        </button>
      </view>

      <view class="mt-4 flex justify-center border-t border-gray-100 pt-4">
        <view class="flex flex-col items-center gap-1">
          <text class="text-2xl text-[#a33327] font-bold">{{ todayCount }}</text>
          <text class="text-xs text-gray-400">今日签到</text>
        </view>
      </view>
    </view>
  </view>
</template>
