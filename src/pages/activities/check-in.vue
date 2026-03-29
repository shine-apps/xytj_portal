<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { scanCheckInAPI } from '@/service/checkin'

definePage({
  style: {
    navigationBarTitleText: '活动签到',
  },
  // 课程详情页需要登录检查
  excludeLoginPath: true,
})

const activityId = ref('')
const code = ref('')
const loading = ref(false)
const result = ref<{
  success: boolean
  message: string
  consecutiveDays?: number
} | null>(null)

onLoad((options) => {
  if (options?.scene) {
    code.value = decodeURIComponent(options.scene as string)
    handleCheckIn()
    return
  }

  if (options?.activity) {
    activityId.value = options.activity as string
  }
  if (options?.code) {
    code.value = options.code as string
    handleCheckIn()
  }
})

async function handleCheckIn() {
  if (!code.value) {
    result.value = {
      success: false,
      message: '无效的签到码',
    }
    return
  }

  loading.value = true
  try {
    const res = await scanCheckInAPI(code.value)
    activityId.value = res.activityId
    result.value = {
      success: true,
      message: '签到成功',
      consecutiveDays: res.consecutiveDays,
    }
  }
  catch (error: any) {
    result.value = {
      success: false,
      message: error.message || '签到失败',
    }
  }
  finally {
    loading.value = false
  }
}

function goToActivityDetail() {
  if (activityId.value) {
    uni.redirectTo({
      url: `/pages/activities/detail?id=${activityId.value}`,
    })
  }
}

function goToHome() {
  uni.switchTab({
    url: '/pages/index/index',
  })
}
</script>

<template>
  <view class="min-h-screen flex items-center justify-center bg-gray-100">
    <view class="w-full px-8 py-8">
      <!-- 加载中 -->
      <view v-if="loading" class="flex flex-col items-center gap-4">
        <view class="h-12 w-12 animate-spin border-3 border-gray-100 border-t-#a33327 rounded-full" />
        <text class="text-sm text-gray-600">正在签到...</text>
      </view>

      <!-- 签到结果 -->
      <view v-else-if="result" class="flex flex-col items-center rounded-2xl bg-white p-10 shadow-lg">
        <!-- 成功状态 -->
        <template v-if="result.success">
          <view class="mb-4">
            <text class="i-carbon-checkmark-filled text-6xl text-green-500" />
          </view>
          <text class="mb-6 text-xl text-green-500 font-semibold">签到成功</text>
          <view class="mb-6 flex flex-col items-center gap-1 rounded-xl bg-green-50 px-8 py-4">
            <text class="text-4xl text-#a33327 font-bold">{{ result.consecutiveDays }}</text>
            <text class="text-xs text-gray-600">连续签到天数</text>
          </view>
        </template>

        <!-- 失败状态 -->
        <template v-else>
          <view class="mb-4">
            <text class="i-carbon-close-filled text-6xl text-red-500" />
          </view>
          <text class="mb-6 text-xl text-red-500 font-semibold">签到失败</text>
          <text class="mb-6 text-center text-sm text-gray-600">{{ result.message }}</text>
        </template>

        <!-- 操作按钮 -->
        <view class="w-full flex flex-col gap-3">
          <button v-if="activityId" class="h-12 w-full flex items-center justify-center rounded-lg bg-#a33327 text-base text-white font-medium" @click="goToActivityDetail">
            查看活动详情
          </button>
          <button class="h-12 w-full flex items-center justify-center rounded-lg bg-gray-100 text-base text-gray-600 font-medium" @click="goToHome">
            返回首页
          </button>
        </view>
      </view>

      <!-- 无参数状态 -->
      <view v-else class="flex flex-col items-center gap-4">
        <text class="i-carbon-qr-code text-6xl text-gray-300" />
        <text class="text-sm text-gray-400">请使用微信扫码签到</text>
      </view>
    </view>
  </view>
</template>
