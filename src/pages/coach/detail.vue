<script setup lang="ts">
import type { Coach } from '@/api/coach'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getCoachById } from '@/api/coach'
import { setPageShareConfig } from '@/utils/share'

definePage({
  name: 'coach-detail',
  style: {
    navigationBarTitleText: '教练主页',
  },
  excludeLoginPath: true,
})

const coach = ref<Coach | null>(null)
const loading = ref(true)

onLoad(async (options) => {
  if (options && options.id) {
    try {
      const res = await getCoachById(options.id)
      // Assume request either unwrap or res.data
      coach.value = (res as any).data || res
      // 设置自定义分享
      setPageShareConfig({
        onShareAppMessage: () => {
          if (!coach.value)
            return {}
          const title = coach.value.title
            ? `${coach.value.name}-${coach.value.title}`
            : coach.value.name
          return {
            title,
            path: `/pages/coach/detail?id=${coach.value.id}`,
          }
        },
        onShareTimeline: () => {
          if (!coach.value)
            return {}
          const title = coach.value.title
            ? `${coach.value.name}-${coach.value.title}`
            : coach.value.name
          return {
            title,
            query: `id=${coach.value.id}`,
          }
        },
      })
    }
    catch (e) {
      uni.showToast({ title: '获取数据失败', icon: 'none' })
    }
    finally {
      loading.value = false
    }
  }
})

function goToCoachList() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    const prevPage = pages[pages.length - 2]
    if (prevPage.route === 'pages/coach/index') {
      uni.navigateBack()
      return
    }
  }
  uni.navigateTo({
    url: '/pages/coach/index',
  })
}

function goToHome() {
  uni.switchTab({
    url: '/pages/index/index',
  })
}
</script>

<template>
  <view class="min-h-screen bg-gray-50 pb-10">
    <view v-if="loading" class="h-screen flex items-center justify-center">
      <wd-loading />
    </view>

    <template v-else-if="coach">
      <!-- 顶部图片与返回键 -->
      <view class="relative aspect-video w-full">
        <image
          :src="coach.photo || coach.avatar || '/static/image/default-avatar.png'" class="h-full w-full object-cover"
          mode="aspectFill"
        />
        <!-- 渐变阴影 -->
        <view class="absolute inset-0 from-black/40 via-transparent to-black/80 bg-gradient-to-b" />

        <!-- 底部信息区 -->
        <view class="absolute bottom-0 w-full p-6 text-left text-white">
          <text class="text-3xl font-bold tracking-widest">{{ coach.name }}</text>
          <view v-if="coach.title" class="mt-3">
            <text class="inline-block rounded-full bg-white/20 px-4 py-1 text-sm backdrop-blur">
              {{ coach.title }}
            </text>
          </view>
        </view>
      </view>

      <!-- 详情内容区 -->
      <view class="relative z-10 min-h-[50vh] rounded-t-3xl bg-white p-6 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <view class="mx-auto mb-8 h-1.5 w-12 rounded-full bg-gray-200" />

        <view class="mb-6 flex items-center gap-2">
          <view class="h-5 w-1 rounded-full bg-primary" />
          <text class="text-lg text-gray-800 font-bold tracking-wider">个人简介</text>
        </view>

        <view class="text-[15px] text-gray-600 leading-8 tracking-wide">
          <!-- 富文本展示 -->
          <rich-text v-if="coach.description" :nodes="coach.description" />
          <text v-else class="text-gray-400 italic">暂无介绍内容</text>
        </view>

        <!-- 底部导航链接 -->
        <view class="mb-4 mt-12 flex justify-center gap-4">
          <view
            class="flex items-center gap-1 border border-gray-200 rounded-full bg-gray-50 px-5 py-2 text-sm text-gray-500 transition-colors active:bg-gray-100"
            @tap="goToCoachList"
          >
            <text>更多教练</text>
            <view class="i-carbon-chevron-right text-xs" />
          </view>

          <view
            class="lex items-center gap-1 border border-gray-200 rounded-full bg-gray-50 px-5 py-2 text-sm text-gray-500 transition-colors active:bg-gray-100"
            @tap="goToHome"
          >
            <view class="i-carbon-home text-xs" />
            <text>翔云主页</text>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="h-screen flex flex-col items-center justify-center text-gray-400">
      <view class="i-carbon-error mb-4 text-5xl" />
      <text>教练信息不存在</text>
    </view>
  </view>
</template>
