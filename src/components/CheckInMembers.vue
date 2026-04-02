<script setup lang="ts">
import type { IActivityMemberCheckIn } from '@/service/checkin'
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import { getCheckInMembersAPI } from '@/service/checkin'

const props = defineProps<{
  activityId: string
}>()

const members = ref<IActivityMemberCheckIn[]>([])
const loading = ref(false)
const refreshing = ref(false)

async function loadMembers(isRefresh = false) {
  if (!props.activityId)
    return

  if (isRefresh) {
    refreshing.value = true
  }
  else {
    loading.value = true
  }
  try {
    const res = await getCheckInMembersAPI(props.activityId)
    members.value = res
  }
  catch (e) {
    console.error('加载成员签到记录失败', e)
  }
  finally {
    loading.value = false
    refreshing.value = false
  }
}

// 刷新数据
async function onRefresh() {
  await loadMembers(true)
}

watch(() => props.activityId, (newId) => {
  if (newId) {
    loadMembers()
  }
}, { immediate: true })

function formatDate(date: string | Date | null) {
  if (!date)
    return '-'
  // 如果是今天，返回'今日'字符串
  const dayJsDate = dayjs(date)
  const today = dayjs()
  if (dayJsDate.isSame(today, 'day'))
    return '今日'
  // 显示昨天的日期
  if (dayJsDate.isSame(today.subtract(1, 'day'), 'day'))
    return '昨日'
  // 如果是今年，返回MM-DD格式
  if (dayJsDate.isSame(today, 'year'))
    return dayJsDate.format('MM-DD')
  return dayJsDate.format('YYYY-MM-DD')
}
</script>

<template>
  <view class="p-4">
    <view class="rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <view class="flex items-center gap-2">
          <text class="text-base text-gray-800 font-semibold">成员签到记录</text>
          <text class="text-xs text-gray-400">共 {{ members.length }} 人</text>
        </view>
        <wd-button
          type="icon"
          size="small"
          :loading="refreshing"
          @click="onRefresh"
        >
          <text class="i-carbon-renew text-lg" />
        </wd-button>
      </view>

      <view v-if="loading && members.length === 0" class="flex flex-col items-center gap-3 py-10">
        <view class="h-8 w-8 animate-spin border-2 border-gray-100 border-t-#a33327 rounded-full" />
        <text class="text-sm text-gray-400">加载中...</text>
      </view>

      <view v-else-if="members.length === 0" class="flex flex-col items-center gap-3 py-10">
        <text class="i-carbon-user-multiple text-4xl text-gray-300" />
        <text class="text-sm text-gray-400">暂无成员签到记录</text>
      </view>

      <view v-else class="flex flex-col gap-3">
        <view
          v-for="member in members"
          :key="member.id"
          class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
        >
          <view class="flex items-center gap-3">
            <view class="h-10 w-10 flex items-center justify-center rounded-full bg-#a33327/10">
              <text class="i-carbon-user text-xl text-#a33327" />
            </view>
            <view class="flex flex-col gap-1">
              <text class="text-sm text-gray-800 font-medium">{{ member.nickname || '未设置昵称' }}</text>
            </view>
          </view>

          <view class="flex flex-col items-end gap-1">
            <view class="flex items-center gap-2">
              <text class="text-xs text-gray-500">总签到</text>
              <text class="text-base text-#a33327 font-semibold">{{ member.totalCheckIns }}</text>
              <text class="text-xs text-gray-500">次</text>
            </view>
            <view class="flex items-center gap-2">
              <text class="text-xs text-gray-500">连续</text>
              <text class="text-sm text-#a33327 font-medium">{{ member.consecutiveDays }}</text>
              <text class="text-xs text-gray-500">天</text>
            </view>
            <text class="text-xs text-gray-400">
              最后签到: {{ formatDate(member.lastCheckInDate) }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
