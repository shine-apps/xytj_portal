<script setup lang="ts">
import type { IActivityCheckIn } from '@/service/checkin'
import dayjs from 'dayjs'
import { ref, watch } from 'vue'
import { getCheckInHistoryAPI } from '@/service/checkin'

const props = defineProps<{
  activityId: string
}>()

const history = ref<IActivityCheckIn[]>([])
const loading = ref(false)
const refreshing = ref(false)
const hasMore = ref(true)
const page = ref(1)
const limit = 20

async function loadHistory(reset = false, isRefresh = false) {
  if (!props.activityId)
    return
  if (reset) {
    page.value = 1
    history.value = []
    hasMore.value = true
  }
  if (!hasMore.value && !reset)
    return

  if (isRefresh) {
    refreshing.value = true
  }
  else {
    loading.value = true
  }
  try {
    const res = await getCheckInHistoryAPI(props.activityId, { page: page.value, limit })
    if (reset) {
      history.value = res
    }
    else {
      history.value.push(...res)
    }
    hasMore.value = res.length === limit
    if (hasMore.value)
      page.value++
  }
  catch (e) {
    console.error('加载签到历史失败', e)
  }
  finally {
    loading.value = false
    refreshing.value = false
  }
}

// 刷新数据
async function onRefresh() {
  await loadHistory(true, true)
}

watch(() => props.activityId, (newId) => {
  if (newId) {
    loadHistory(true)
  }
}, { immediate: true })

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

function onLoadMore() {
  loadHistory()
}
</script>

<template>
  <view class="p-4">
    <view class="rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
        <view class="flex items-center gap-2">
          <text class="text-base text-gray-800 font-semibold">签到历史</text>
          <text class="text-xs text-gray-400">共 {{ history.length }} 条记录</text>
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

      <view v-if="loading && history.length === 0" class="flex flex-col items-center gap-3 py-10">
        <view class="h-8 w-8 animate-spin border-2 border-gray-100 border-t-#a33327 rounded-full" />
        <text class="text-sm text-gray-400">加载中...</text>
      </view>

      <view v-else-if="history.length === 0" class="flex flex-col items-center gap-3 py-10">
        <text class="i-carbon-calendar text-4xl text-gray-300" />
        <text class="text-sm text-gray-400">暂无签到记录</text>
      </view>

      <view v-else class="flex flex-col gap-3">
        <view
          v-for="item in history"
          :key="item.id"
          class="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
        >
          <view class="flex-shrink-0">
            <image
              v-if="item.user?.avatarUrl"
              :src="item.user.avatarUrl"
              class="h-12 w-12 rounded-full bg-gray-100"
              mode="aspectFill"
            />
            <view v-else class="h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
              <text class="i-carbon-user text-lg text-gray-400" />
            </view>
          </view>
          <view class="flex flex-1 flex-col gap-1">
            <text class="text-base text-gray-800 font-medium">{{ item.user?.nickname || '未知用户' }}</text>
            <view class="flex items-center gap-2">
              <text class="text-xs text-gray-500">{{ formatDate(item.checkInDate) }}</text>
              <text class="text-xs text-gray-400">{{ dayjs(item.createdAt).format('HH:mm') }}</text>
            </view>
          </view>
          <view class="flex-shrink-0">
            <view class="flex items-center gap-1 rounded-full bg-#a33327 px-2 py-1">
              <text class="i-carbon-fire text-xs text-white" />
              <text class="text-xs text-white">{{ item.consecutiveDays }}天</text>
            </view>
          </view>
        </view>

        <view v-if="hasMore" class="py-3 text-center active:opacity-70" @click="onLoadMore">
          <text v-if="loading" class="text-xs text-gray-400">加载中...</text>
          <text v-else class="text-xs text-gray-400">点击加载更多</text>
        </view>

        <view v-else-if="history.length > 0" class="py-3 text-center">
          <text class="text-xs text-gray-400">没有更多了</text>
        </view>
      </view>
    </view>
  </view>
</template>
