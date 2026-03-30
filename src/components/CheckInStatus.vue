<script setup lang="ts">
import type { ICheckInStatus } from '@/service/checkin'
import { onMounted, ref } from 'vue'
import { getCheckInStatusAPI } from '@/service/checkin'
import { formatTime } from '@/utils/dateUtil'
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
  <view class="p-4">
    <view class="rounded-xl bg-white p-5 shadow-sm">
      <view class="mb-4 flex items-center justify-between">
        <text class="text-base text-gray-800 font-semibold">每日签到</text>
        <view v-if="status?.todayCheckedIn" class="flex items-center gap-1 rounded-xl bg-green-500 px-2 py-1">
          <text class="i-carbon-checkmark-filled text-xs text-white" />
          <text class="text-xs text-white">已签到</text>
        </view>
      </view>

      <view class="mb-5 flex items-center justify-center gap-8 rounded-lg bg-gray-50 p-4">
        <view class="flex flex-col items-center gap-1">
          <text class="text-2xl text-[#a33327] font-bold">{{ status?.consecutiveDays || 0 }}</text>
          <text class="text-xs text-gray-400">连续签到</text>
        </view>
        <view class="h-10 w-px bg-gray-200" />
        <view class="flex flex-col items-center gap-1">
          <text class="text-2xl text-[#a33327] font-bold">{{ status?.totalDays || 0 }}</text>
          <text class="text-xs text-gray-400">累计签到</text>
        </view>
      </view>

      <ScanCheckIn
        v-if="!status?.todayCheckedIn"
        :activity-id="activityId"
        @success="onCheckInSuccess"
      />

      <view v-else class="flex flex-col items-center gap-2 rounded-lg bg-green-50 p-5">
        <text class="i-carbon-checkmark-outline text-2xl text-green-500" />
        <text class="text-sm text-green-500 font-medium">今日已完成签到</text>
        <text class="text-xs text-gray-400">{{ formatTime(status?.todayCheckIn?.createdAt || '') || '' }}</text>
      </view>
    </view>
  </view>
</template>
