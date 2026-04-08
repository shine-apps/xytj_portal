<template>
  <view class="h-full bg-gray-50">
    <view v-if="video" class="bg-white">
      <!-- Video Player -->
      <VideoPlayer
        :src="video.url"
        :poster="video.coverUrl || ''"
        :container-width="750"
        @close="handleClose"
      />

      <!-- Video Info -->
      <view class="p-4">
        <view class="mb-3 text-xl text-gray-900 font-bold">
          {{ video.title }}
        </view>

        <!-- Course Link -->
        <view v-if="collectionTitle" class="mb-4 text-sm text-gray-500">
          所属课程: <text class="text-blue-500 active:opacity-70" @click="navigateToCollection">{{ collectionTitle }}</text>
        </view>
      </view>
    </view>

    <!-- Loading State -->
    <view v-else class="h-full flex items-center justify-center">
      <text class="text-gray-500">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { IVideo } from '@/service/collections'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { useSettingsStore } from '@/store/settings'
import { setPageShareConfig } from '@/utils/share'

definePage({
  style: {
    navigationBarTitleText: '视频详情',
  },
  excludeLoginPath: true,
})

const settingsStore = useSettingsStore()
const video = ref<IVideo | null>(null)
const collectionTitle = ref('')

onLoad(async (options) => {
  await settingsStore.fetchSettings()
  if (!settingsStore.showVideo) {
    uni.switchTab({ url: '/pages/index/index' })
    return
  }

  if (options?.video) {
    if (options.collectionTitle) {
      collectionTitle.value = decodeURIComponent(options.collectionTitle)
    }

    try {
      video.value = JSON.parse(decodeURIComponent(options.video))
      if (video.value?.title) {
        uni.setNavigationBarTitle({ title: video.value.title })
      }

      const videoData = encodeURIComponent(options.video)
      const collectionTitleParam = collectionTitle.value ? encodeURIComponent(collectionTitle.value) : ''

      setPageShareConfig({
        onShareAppMessage: () => ({
          title: video.value?.title || '视频详情',
          path: `/pages/courses/video-detail?video=${videoData}${collectionTitleParam ? `&collectionTitle=${collectionTitleParam}` : ''}`,
        }),
        onShareTimeline: () => ({
          title: video.value?.title || '视频详情',
          query: `video=${videoData}${collectionTitleParam ? `&collectionTitle=${collectionTitleParam}` : ''}`,
          imageUrl: video.value?.coverUrl || '',
        }),
      })
    }
    catch (e) {
      uni.showToast({ title: 'Invalid video data', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
  }
  else {
    uni.showToast({ title: 'No video data provided', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

function handleClose() {
  const pages = getCurrentPages()
  console.log('handleClose - 页面栈长度:', pages.length)
  console.log('handleClose - 页面栈:', pages.map(p => p.route))

  if (pages.length > 1) {
    console.log('handleClose - 执行 navigateBack')
    uni.navigateBack()
  }
  else if (video.value?.collectionId) {
    console.log('handleClose - 执行 redirectTo 课程详情')
    uni.redirectTo({
      url: `/pages/courses/detail?id=${video.value.collectionId}`,
    })
  }
  else {
    console.log('handleClose - 执行 switchTab 首页')
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function navigateToCollection() {
  if (!video.value?.collectionId)
    return

  const pages = getCurrentPages()
  if (pages.length > 1) {
    const prevPage = pages[pages.length - 2]
    // Check if previous page is the collection detail page for this video
    // Note: uniapp route doesn't include leading slash usually
    if (prevPage.route?.includes('pages/courses/detail')) {
      // We can't easily check options on previous page instance in all platforms,
      // but typically if we came from courses/detail, it's the right one.
      // Let's just navigateBack to avoid stacking same pages.
      uni.navigateBack()
      return
    }
  }

  uni.navigateTo({
    url: `/pages/courses/detail?id=${video.value.collectionId}`,
  })
}
</script>

<style lang="scss" scoped>
</style>
