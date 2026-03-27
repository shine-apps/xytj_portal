<script setup lang="ts">
import type { IActivityCheckInCode } from '@/service/checkin'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { generateCheckInCodeAPI, getCurrentCheckInCodeAPI, getTodayCheckInCountAPI, invalidateCheckInCodeAPI } from '@/service/checkin'

const props = defineProps<{
  activityId: string
}>()

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
  console.log(props.activityId)
  // 不自动获取二维码，需要用户手动点击生成
  // 只有二维码显示时才按频率10秒一次拉取签到人数
})

onShow(() => {
  if (!checkInCode.value)
    fetchTodayCount()
})

onUnmounted(() => {
  if (countdownTimer)
    clearInterval(countdownTimer)
  if (todayCountTimer)
    clearInterval(todayCountTimer)
})
</script>

<template>
  <view class="check-in-qr-code">
    <view class="qr-card">
      <view class="qr-header">
        <text class="title">签到二维码</text>
        <view v-if="isValid" class="countdown">
          <text class="i-carbon-time text-[#a33327]" />
          <text class="time">{{ formatCountdown }}</text>
        </view>
      </view>

      <view class="qr-content">
        <template v-if="isValid">
          <image :src="qrCodeUrl" class="qr-image" mode="aspectFit" />
          <text class="qr-tip">请成员使用微信扫码签到</text>
        </template>
        <template v-else>
          <view class="no-code">
            <text class="i-carbon-qr-code text-6xl text-gray-300" />
            <text class="no-code-text">暂无有效二维码</text>
          </view>
        </template>
      </view>

      <view class="qr-actions">
        <button v-if="!isValid" class="action-btn primary" :loading="loading" @click="generateCode">
          <text class="i-carbon-renew mr-1" />
          生成二维码
        </button>
        <button v-else class="action-btn danger" @click="invalidateCode">
          <text class="i-carbon-close mr-1" />
          停止签到
        </button>
      </view>

      <view class="stats">
        <view class="stat-item">
          <text class="stat-value">{{ todayCount }}</text>
          <text class="stat-label">今日签到</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.check-in-qr-code {
  padding: 16px;
}

.qr-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.qr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .countdown {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #fef2f2;
    padding: 4px 8px;
    border-radius: 4px;

    .time {
      font-size: 14px;
      font-weight: 600;
      color: #a33327;
    }
  }
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;

  .qr-image {
    width: 200px;
    height: 200px;
    border-radius: 8px;
  }

  .qr-tip {
    margin-top: 12px;
    font-size: 13px;
    color: #666;
  }

  .no-code {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 0;

    .no-code-text {
      font-size: 14px;
      color: #999;
    }
  }
}

.qr-actions {
  margin-top: 16px;

  .action-btn {
    width: 100%;
    height: 44px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;

    &.primary {
      background: #a33327;
      color: #fff;
    }

    &.danger {
      background: #fef2f2;
      color: #a33327;
    }
  }
}

.stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: center;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #a33327;
    }

    .stat-label {
      font-size: 12px;
      color: #999;
    }
  }
}
</style>
