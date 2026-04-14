<script setup lang="ts">
import type { Coach } from '@/api/coach'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getCoachById } from '@/api/coach'

definePage({
  name: 'coach-detail',
  style: {
    navigationBarTitleText: '教练主页',
  },
})

const coach = ref<Coach | null>(null)
const loading = ref(true)

onLoad(async (options) => {
  if (options && options.id) {
    try {
      const res = await getCoachById(options.id)
      // Assume request either unwrap or res.data
      coach.value = (res as any).data || res
    }
    catch (e) {
      uni.showToast({ title: '获取数据失败', icon: 'none' })
    }
    finally {
      loading.value = false
    }
  }
})

function goBack() {
  uni.navigateBack()
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
          :src="coach.photo || coach.avatar || '/static/default-avatar.png'" class="h-full w-full object-cover"
          mode="aspectFill"
        />
        <!-- 渐变阴影 -->
        <view class="absolute inset-0 from-black/40 via-transparent to-black/80 bg-gradient-to-b" />

        <!-- 自定义导航栏 -->
        <view class="absolute top-0 z-50 w-full flex items-center px-4 pt-12">
          <view
            class="h-10 w-10 flex items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md"
            @tap="goBack"
          >
            <view class="i-heroicons-arrow-left text-xl" />
          </view>
        </view>

        <!-- 底部信息区 -->
        <view class="absolute bottom-0 w-full p-6 text-center text-white">
          <text class="text-3xl font-bold tracking-widest">{{ coach.name }}</text>
          <view v-if="coach.title" class="mt-3">
            <text class="inline-block rounded-full bg-white/20 px-4 py-1 text-sm backdrop-blur">
              {{ coach.title }}
            </text>
          </view>
        </view>
      </view>

      <!-- 详情内容区 -->
      <view class="relative z-10 min-h-[50vh] rounded-t-3xl bg-white p-6 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] -mt-6">
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
      </view>
    </template>

    <view v-else class="h-screen flex flex-col items-center justify-center text-gray-400">
      <view class="i-heroicons-face-frown mb-4 text-5xl" />
      <text>教练信息不存在</text>
    </view>
  </view>
</template>
