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
    <view class="mb-4 flex items-end justify-between">
      <view class="flex items-center">
        <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
        <text class="text-xl text-[#1a1a1a] font-bold">我的区域</text>
      </view>
      <text class="pb-0.5 text-xs text-[#999]">点击记录查看详情</text>
    </view>

    <view
      v-if="!loggedIn"
      class="flex items-center justify-between border border-[#e8e4dc] rounded-lg bg-[#fffdf9] px-4 py-4 text-sm text-[#666] shadow-sm active:bg-[#f9f5ee]"
      @click="emit('login')"
    >
      <text>登录后查看我的记录</text>
      <text class="i-carbon-chevron-right text-[#a33327]" />
    </view>
    <view
      v-else-if="loading"
      class="flex items-center justify-center gap-2 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] px-4 py-5 text-sm text-[#888] shadow-sm"
    >
      <wd-loading color="#a33327" />
      <text>加载中...</text>
    </view>
    <view
      v-else-if="loadFailed"
      class="border border-[#a33327]/20 rounded-lg bg-[#fffdf9] px-4 py-5 text-center text-sm text-[#a33327] shadow-sm active:bg-[#f9f5ee]"
      @click="emit('retry')"
    >
      加载失败，点击重试
    </view>
    <view
      v-else-if="isEmpty"
      class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] px-4 py-5 text-center text-sm text-[#999] shadow-sm"
    >
      暂无最近记录
    </view>

    <view v-else class="space-y-5">
      <view v-if="recent.challenges.length > 0">
        <view class="mb-2 flex items-center gap-2 px-1">
          <view class="h-7 w-7 flex items-center justify-center rounded-full bg-[#a33327]/8">
            <text class="i-carbon-fire text-sm text-[#a33327]" />
          </view>
          <text class="text-sm text-[#555] font-bold">打卡挑战</text>
          <view class="h-px flex-1 bg-[#e8e4dc]" />
        </view>
        <view class="space-y-2">
          <view
            v-for="item in recent.challenges"
            :key="item.id"
            class="flex items-center gap-3 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-3 shadow-sm transition-all duration-200 active:scale-98 active:border-[#a33327]/40 active:bg-[#f9f5ee]"
            @click="emit('navigate', `/pages/practice/challenge-detail?id=${item.id}`)"
          >
            <view class="h-10 w-10 flex shrink-0 items-center justify-center border border-[#a33327]/15 rounded-full bg-[#a33327]/8">
              <text class="i-carbon-fire text-lg text-[#a33327]" />
            </view>
            <view class="min-w-0 flex-1">
              <text class="block truncate text-[15px] text-[#1a1a1a] font-bold">{{ item.title }}</text>
              <text class="mt-1 block text-xs text-[#888]">{{ formatDate(item.joinedAt) }} 加入</text>
            </view>
            <view class="flex shrink-0 items-center gap-0.5 rounded-full bg-[#a33327]/8 px-2 py-1 text-xs text-[#a33327]">
              <text>查看详情</text>
              <text class="i-carbon-chevron-right" />
            </view>
          </view>
        </view>
      </view>

      <view v-if="recent.courses.length > 0">
        <view class="mb-2 flex items-center gap-2 px-1">
          <view class="h-7 w-7 flex items-center justify-center rounded-full bg-[#a33327]/8">
            <text class="i-carbon-video text-sm text-[#a33327]" />
          </view>
          <text class="text-sm text-[#555] font-bold">观看课程</text>
          <view class="h-px flex-1 bg-[#e8e4dc]" />
        </view>
        <view class="space-y-2">
          <view
            v-for="item in recent.courses"
            :key="item.videoId"
            class="flex items-center gap-3 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-3 shadow-sm transition-all duration-200 active:scale-98 active:border-[#a33327]/40 active:bg-[#f9f5ee]"
            @click="emit('navigate', `/pages/courses/video-detail?id=${item.videoId}&collectionId=${item.collectionId}`)"
          >
            <image
              v-if="item.coverUrl"
              :src="item.coverUrl"
              class="h-11 w-11 shrink-0 border border-[#e8e4dc] rounded-md"
              mode="aspectFill"
            />
            <view
              v-else
              class="h-11 w-11 flex shrink-0 items-center justify-center border border-[#a33327]/15 rounded-md bg-[#a33327]/8"
            >
              <text class="i-carbon-video text-lg text-[#a33327]" />
            </view>
            <view class="min-w-0 flex-1">
              <text class="block truncate text-[15px] text-[#1a1a1a] font-bold">{{ item.title }}</text>
              <text class="mt-1 block truncate text-xs text-[#888]">{{ item.collectionTitle }} · {{ formatDateTime(item.lastViewedAt) }}</text>
            </view>
            <view class="flex shrink-0 items-center gap-0.5 rounded-full bg-[#a33327]/8 px-2 py-1 text-xs text-[#a33327]">
              <text>查看详情</text>
              <text class="i-carbon-chevron-right" />
            </view>
          </view>
        </view>
      </view>

      <view v-if="recent.activities.length > 0">
        <view class="mb-2 flex items-center gap-2 px-1">
          <view class="h-7 w-7 flex items-center justify-center rounded-full bg-[#a33327]/8">
            <text class="i-carbon-calendar text-sm text-[#a33327]" />
          </view>
          <text class="text-sm text-[#555] font-bold">参与活动</text>
          <view class="h-px flex-1 bg-[#e8e4dc]" />
        </view>
        <view class="space-y-2">
          <view
            v-for="item in recent.activities"
            :key="item.id"
            class="flex items-center gap-3 border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-3 shadow-sm transition-all duration-200 active:scale-98 active:border-[#a33327]/40 active:bg-[#f9f5ee]"
            @click="emit('navigate', `/pages/activities/detail?id=${item.id}`)"
          >
            <view class="h-10 w-10 flex shrink-0 items-center justify-center border border-[#a33327]/15 rounded-full bg-[#a33327]/8">
              <text class="i-carbon-calendar text-lg text-[#a33327]" />
            </view>
            <view class="min-w-0 flex-1">
              <text class="block truncate text-[15px] text-[#1a1a1a] font-bold">{{ item.title }}</text>
              <text class="mt-1 block text-xs text-[#888]">{{ formatDateTime(item.startTime) }} 开始</text>
            </view>
            <view class="flex shrink-0 items-center gap-0.5 rounded-full bg-[#a33327]/8 px-2 py-1 text-xs text-[#a33327]">
              <text>查看详情</text>
              <text class="i-carbon-chevron-right" />
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
