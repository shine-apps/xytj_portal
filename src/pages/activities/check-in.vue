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
  if (options?.activity) {
    activityId.value = options.activity as string
  }
  if (options?.code) {
    code.value = options.code as string
    // 自动执行签到
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
  <view class="check-in-page">
    <view class="content">
      <!-- 加载中 -->
      <view v-if="loading" class="loading-section">
        <view class="loading-spinner" />
        <text class="loading-text">正在签到...</text>
      </view>

      <!-- 签到结果 -->
      <view v-else-if="result" class="result-section">
        <!-- 成功状态 -->
        <template v-if="result.success">
          <view class="success-icon">
            <text class="i-carbon-checkmark-filled text-6xl text-green-500" />
          </view>
          <text class="result-title success">签到成功</text>
          <view class="consecutive-days">
            <text class="days-number">{{ result.consecutiveDays }}</text>
            <text class="days-label">连续签到天数</text>
          </view>
        </template>

        <!-- 失败状态 -->
        <template v-else>
          <view class="error-icon">
            <text class="i-carbon-close-filled text-6xl text-red-500" />
          </view>
          <text class="result-title error">签到失败</text>
          <text class="error-message">{{ result.message }}</text>
        </template>

        <!-- 操作按钮 -->
        <view class="actions">
          <button v-if="activityId" class="action-btn primary" @click="goToActivityDetail">
            查看活动详情
          </button>
          <button class="action-btn secondary" @click="goToHome">
            返回首页
          </button>
        </view>
      </view>

      <!-- 无参数状态 -->
      <view v-else class="empty-section">
        <text class="i-carbon-qr-code text-6xl text-gray-300" />
        <text class="empty-text">请使用微信扫码签到</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.check-in-page {
  min-height: 100vh;
  background: #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  width: 100%;
  padding: 32px;
}

// 加载中
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #a33327;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    font-size: 14px;
    color: #666;
  }
}

// 结果区域
.result-section {
  background: #fff;
  border-radius: 16px;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);

  .success-icon,
  .error-icon {
    margin-bottom: 16px;
  }

  .result-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 24px;

    &.success {
      color: #22c55e;
    }

    &.error {
      color: #ef4444;
    }
  }

  .consecutive-days {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 16px 32px;
    background: #f0fdf4;
    border-radius: 12px;
    margin-bottom: 24px;

    .days-number {
      font-size: 36px;
      font-weight: 700;
      color: #a33327;
    }

    .days-label {
      font-size: 12px;
      color: #666;
    }
  }

  .error-message {
    font-size: 14px;
    color: #666;
    margin-bottom: 24px;
    text-align: center;
  }
}

// 操作按钮
.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .action-btn {
    width: 100%;
    height: 48px;
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

    &.secondary {
      background: #f5f5f5;
      color: #666;
    }
  }
}

// 空状态
.empty-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .empty-text {
    font-size: 14px;
    color: #999;
  }
}
</style>
