<script setup lang="ts">
import type { ICheckInStatus } from '@/service/checkin'
import { onMounted, ref } from 'vue'
import { getCheckInStatusAPI } from '@/service/checkin'
import ScanCheckIn from './ScanCheckIn.vue'

const props = defineProps<{
  activityId: string
}>()

const status = ref<ICheckInStatus | null>(null)
const loading = ref(false)

async function fetchStatus() {
  loading.value = true
  try {
    const res = await getCheckInStatusAPI(props.activityId)
    status.value = res
  }
  catch (error) {
    console.error('获取签到状态失败', error)
  }
  finally {
    loading.value = false
  }
}

function onCheckInSuccess() {
  fetchStatus()
}

onMounted(() => {
  fetchStatus()
})

defineExpose({
  refresh: fetchStatus,
})
</script>

<template>
  <view class="check-in-status">
    <view class="status-card">
      <view class="status-header">
        <text class="title">每日签到</text>
        <view v-if="status?.todayCheckedIn" class="checked-badge">
          <text class="i-carbon-checkmark-filled text-xs text-white" />
          <text class="text-xs text-white">已签到</text>
        </view>
      </view>

      <view class="status-stats">
        <view class="stat-item">
          <text class="stat-value">{{ status?.consecutiveDays || 0 }}</text>
          <text class="stat-label">连续签到</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-value">{{ status?.totalDays || 0 }}</text>
          <text class="stat-label">累计签到</text>
        </view>
      </view>

      <ScanCheckIn
        v-if="!status?.todayCheckedIn"
        :activity-id="activityId"
        @success="onCheckInSuccess"
      />

      <view v-else class="checked-in-tip">
        <text class="i-carbon-checkmark-outline text-2xl text-green-500" />
        <text class="tip-text">今日已完成签到</text>
        <text class="time-text">{{ new Date(status?.todayCheckIn?.createdAt || '').toLocaleTimeString() }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.check-in-status {
  padding: 16px;
}

.status-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .checked-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #22c55e;
    padding: 4px 8px;
    border-radius: 12px;
  }
}

.status-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #a33327;
    }

    .stat-label {
      font-size: 12px;
      color: #999;
    }
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background: #e5e5e5;
  }
}

.checked-in-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: #f0fdf4;
  border-radius: 8px;

  .tip-text {
    font-size: 14px;
    color: #22c55e;
    font-weight: 500;
  }

  .time-text {
    font-size: 12px;
    color: #999;
  }
}
</style>
