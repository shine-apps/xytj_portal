<script lang="ts" setup>
import type { HomeRecentResponse } from '@/service/me'
import dayjs from 'dayjs'
import { computed } from 'vue'

const props = defineProps<{
  recent: HomeRecentResponse
  loading: boolean
  loadFailed: boolean
  loggedIn: boolean
}>()

const emit = defineEmits<{
  login: []
  retry: []
  navigate: [url: string]
}>()

const isEmpty = computed(() => {
  return props.recent.challenges.length === 0
    && props.recent.courses.length === 0
    && props.recent.activities.length === 0
})

function formatDate(value: string) {
  return dayjs(value).format('MM-DD')
}

function formatDateTime(value: string) {
  return dayjs(value).format('MM-DD HH:mm')
}
</script>

<template>
  <view class="relative z-20 mx-4 mt-6">
    <view class="mb-4 flex items-center">
      <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
      <text class="text-xl text-[#1a1a1a] font-bold">我的区域</text>
    </view>
    <view class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
      <view
        v-if="!loggedIn"
        class="flex items-center justify-between py-3 text-sm text-[#666]"
        @click="emit('login')"
      >
        <text>登录后查看我的记录</text>
        <text class="i-carbon-chevron-right text-[#999]" />
      </view>
      <view v-else-if="loading" class="flex items-center justify-center gap-2 py-4 text-sm text-[#888]">
        <wd-loading color="#a33327" />
        <text>加载中...</text>
      </view>
      <view
        v-else-if="loadFailed"
        class="py-4 text-center text-sm text-[#a33327]"
        @click="emit('retry')"
      >
        加载失败，点击重试
      </view>
      <view v-else-if="isEmpty" class="py-4 text-center text-sm text-[#999]">
        暂无最近记录
      </view>
      <view v-else class="space-y-4">
        <view v-if="recent.challenges.length > 0">
          <view class="mb-1 flex items-center gap-2 text-sm text-[#555] font-bold">
            <text class="i-carbon-fire text-[#a33327]" />
            <text>打卡挑战</text>
          </view>
          <view
            v-for="item in recent.challenges"
            :key="item.id"
            class="flex items-center gap-3 rounded-md px-2 py-2 active:bg-stone-50"
            @click="emit('navigate', `/pages/practice/challenge-detail?id=${item.id}`)"
          >
            <view class="min-w-0 flex-1">
              <text class="block truncate text-base text-[#1a1a1a]">{{ item.title }}</text>
              <text class="mt-1 block text-xs text-[#888]">{{ formatDate(item.joinedAt) }} 加入</text>
            </view>
            <text class="i-carbon-chevron-right shrink-0 text-sm text-[#999]" />
          </view>
        </view>

        <view v-if="recent.courses.length > 0">
          <view class="mb-1 flex items-center gap-2 text-sm text-[#555] font-bold">
            <text class="i-carbon-video text-[#a33327]" />
            <text>观看课程</text>
          </view>
          <view
            v-for="item in recent.courses"
            :key="item.videoId"
            class="flex items-center gap-3 rounded-md px-2 py-2 active:bg-stone-50"
            @click="emit('navigate', `/pages/courses/video-detail?id=${item.videoId}&collectionId=${item.collectionId}`)"
          >
            <view class="min-w-0 flex-1">
              <text class="block truncate text-base text-[#1a1a1a]">{{ item.title }}</text>
              <text class="mt-1 block truncate text-xs text-[#888]">{{ item.collectionTitle }} · {{ formatDateTime(item.lastViewedAt) }}</text>
            </view>
            <text class="i-carbon-chevron-right shrink-0 text-sm text-[#999]" />
          </view>
        </view>

        <view v-if="recent.activities.length > 0">
          <view class="mb-1 flex items-center gap-2 text-sm text-[#555] font-bold">
            <text class="i-carbon-calendar text-[#a33327]" />
            <text>参与活动</text>
          </view>
          <view
            v-for="item in recent.activities"
            :key="item.id"
            class="flex items-center gap-3 rounded-md px-2 py-2 active:bg-stone-50"
            @click="emit('navigate', `/pages/activities/detail?id=${item.id}`)"
          >
            <view class="min-w-0 flex-1">
              <text class="block truncate text-base text-[#1a1a1a]">{{ item.title }}</text>
              <text class="mt-1 block text-xs text-[#888]">{{ formatDateTime(item.startTime) }} 开始</text>
            </view>
            <text class="i-carbon-chevron-right shrink-0 text-sm text-[#999]" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
