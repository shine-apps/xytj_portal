<script lang="ts" setup>
import type { IActivity } from '@/service/activity'
import dayjs from 'dayjs'
import { ref } from 'vue'
import { getActivitiesAPI } from '@/service/activity'
import { RICE_PAPER_IMAGE } from '@/utils/constants'

defineOptions({
  name: 'Activities',
})
definePage({
  style: {
    navigationBarTitleText: '线下活动',
  },
})

const paging = ref<any>(null)
const activities = ref<IActivity[]>([])
const searchKeyword = ref('')

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getActivitiesAPI({
      keyword: searchKeyword.value || undefined,
    })
    // Since the API returns all data, we just return it on the first page
    if (pageNo === 1) {
      paging.value.complete(res)
    }
    else {
      paging.value.complete([])
    }
  }
  catch (e) {
    paging.value.complete(false)
  }
}

function onSearch() {
  paging.value.reload()
}

function navigateToDetail(id: string) {
  uni.navigateTo({ url: `/pages/activities/detail?id=${id}` })
}

function formatTime(time: string) {
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

function getStatus(start: string, end: string) {
  const now = dayjs()
  const startTime = dayjs(start)
  const endTime = dayjs(end)

  if (now.isBefore(startTime))
    return '即将开始'
  if (now.isAfter(endTime))
    return '已结束'
  return '进行中'
}

function formatLocation(loc: any) {
  if (!loc)
    return '地点待定'
  if (typeof loc === 'string') {
    try {
      // Try to parse if it's a JSON string
      if (loc.startsWith('{') || loc.startsWith('[')) {
        const obj = JSON.parse(loc)
        return obj.address || obj.name || loc
      }
      return loc
    }
    catch {
      return loc
    }
  }
  if (typeof loc === 'object') {
    return loc.address || loc.name || '未知地点'
  }
  return String(loc)
}
</script>

<template>
  <z-paging ref="paging" v-model="activities" @query="queryList">
    <view class="min-h-screen bg-[#f7f7f7] font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
      <!-- 装饰纹理 -->
      <view
        class="pointer-events-none absolute inset-0 opacity-10"
        :style="{ backgroundImage: `url('${RICE_PAPER_IMAGE}')` }"
      />

      <view class="relative z-8 p-4">
        <!-- 搜索框 -->
        <view class="mb-4">
          <wd-search
            v-model="searchKeyword"
            placeholder="搜索活动标题"
            hide-cancel
            @search="onSearch"
            @clear="onSearch"
          />
        </view>

        <view class="mb-6 flex items-center justify-center">
          <view class="h-[1px] w-12 bg-[#a33327] opacity-50" />
          <text class="mx-4 text-xl text-[#1a1a1a] font-bold tracking-widest">近期活动</text>
          <view class="h-[1px] w-12 bg-[#a33327] opacity-50" />
        </view>

        <view class="space-y-4">
          <view
            v-for="item in activities"
            :key="item.id"
            class="group overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] shadow-md transition-all duration-300 hover:shadow-lg"
            @click="navigateToDetail(item.id)"
          >
            <view class="relative w-full">
              <image
                :src="item.coverUrl"
                class="group-hover:scale-105" w-full object-cover sepia-20 filter transition-transform duration-700
                mode="widthFix"
              />
              <view class="absolute right-4 top-4 rounded bg-[#a33327]/90 px-3 py-1 text-xs text-white shadow-sm">
                {{ getStatus(item.startTime, item.endTime) }}
              </view>
            </view>

            <view class="p-4">
              <view class="mb-2 flex items-center justify-between">
                <text class="text-lg text-[#1a1a1a] font-bold">{{ item.title }}</text>
                <!-- 所属合集 -->
                <text v-if="item.collection" class="inline-block border border-orange-100 rounded bg-orange-50 px-2 py-0.5 text-xs text-[#a33327] font-medium">
                  {{ item.collection.title }}
                </text>
              </view>

              <view class="text-sm text-[#555] space-y-2">
                <view class="flex items-center">
                  <view class="i-carbon-time mr-2 text-[#a33327]" />
                  <text>{{ formatTime(item.startTime) }}</text>
                </view>
                <view class="flex items-center">
                  <view class="i-carbon-location mr-2 text-[#a33327]" />
                  <text>{{ formatLocation(item.location) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部装饰 -->
      <view class="flex justify-center py-8 opacity-30">
        <text class="text-xs text-[#888] tracking-[0.5em]">—— 以武会友 · 共修身心 ——</text>
      </view>
    </view>
  </z-paging>
</template>
