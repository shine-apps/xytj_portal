<script setup lang="ts">
import { ref } from 'vue'
import { scanCheckInAPI } from '@/service/checkin'

const props = defineProps<{
  activityId: string
}>()

const emit = defineEmits<{
  success: []
}>()

const loading = ref(false)

function scanCode() {
  uni.scanCode({
    success: async (res) => {
      let code: string | null = null

      // #ifdef MP-WEIXIN
      if (res.scanType === 'WX_CODE' && res.path) {
        const queryStr = res.path.includes('?') ? res.path.split('?')[1] : ''
        const params = new URLSearchParams(queryStr)
        code = params.get('scene') || params.get('code')
      }
      // #endif

      if (!code) {
        code = extractCodeFromResult(res.result)
      }

      if (!code) {
        uni.showToast({ title: '无效的二维码', icon: 'error' })
        return
      }
      await handleCheckIn(code)
    },
    fail: () => {
      uni.showToast({ title: '扫码失败', icon: 'error' })
    },
  })
}

function extractCodeFromResult(result: string): string | null {
  try {
    if (result.startsWith('xytj://check-in')) {
      const url = new URL(result)
      return url.searchParams.get('code')
    }

    if (result.startsWith('{')) {
      const json = JSON.parse(result)
      return json.code || null
    }

    if (result.startsWith('pages/')) {
      const queryStr = result.includes('?') ? result.split('?')[1] : ''
      const params = new URLSearchParams(queryStr)
      return params.get('scene') || params.get('code')
    }

    if (result.startsWith('http')) {
      const url = new URL(result)
      return url.searchParams.get('scene') || url.searchParams.get('code')
    }

    return result.trim()
  }
  catch {
    return result.trim()
  }
}

async function handleCheckIn(code: string) {
  loading.value = true
  try {
    const res = await scanCheckInAPI(code)
    uni.showToast({
      title: `签到成功！连续${res.consecutiveDays}天`,
      icon: 'success',
      duration: 2000,
    })
    emit('success')
  }
  catch (error: any) {
    const message = error.message || '签到失败'
    uni.showToast({ title: message, icon: 'error' })
  }
  finally {
    loading.value = false
  }
}

defineExpose({
  scanCode,
})
</script>

<template>
  <view class="p-4">
    <button class="h-12 w-full flex items-center justify-center rounded-lg bg-#a33327 text-base text-white font-medium" :loading="loading" @click="scanCode">
      <text class="i-carbon-scan-alt mr-2 text-lg" />
      <text>扫码签到</text>
    </button>
  </view>
</template>
