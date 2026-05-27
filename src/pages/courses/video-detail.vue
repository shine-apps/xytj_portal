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

        <!-- Publish to Training Ground (Admin Only) -->
        <view v-if="userStore.isAdmin" class="mb-4">
          <view
            class="flex items-center justify-center gap-2 rounded-lg bg-blue-500 py-2 text-sm text-white active:bg-blue-600"
            @click="publishToTrainingGround"
          >
            <text class="i-carbon-rocket" />
            <text>发布到练功场</text>
          </view>
        </view>

        <!-- View Count -->
        <view class="mb-4 flex items-center text-sm text-gray-400">
          <text class="i-carbon-view mr-1" />
          <text>{{ video.viewCount || 0 }} 次观看</text>
        </view>

        <!-- Navigation Buttons -->
        <view class="flex justify-between gap-4">
          <view
            class="flex flex-1 items-center justify-center rounded-lg bg-gray-100 py-3 transition active:bg-gray-200"
            :class="{ 'opacity-50': !hasPreviousVideo }"
            @click="navigateToPreviousVideo"
          >
            <text class="i-carbon-chevron-left mr-1 text-gray-600" />
            <text class="text-sm text-gray-600">上一个视频</text>
          </view>
          <view
            class="flex flex-1 items-center justify-center rounded-lg bg-gray-100 py-3 transition active:bg-gray-200"
            :class="{ 'opacity-50': !hasNextVideo }"
            @click="navigateToNextVideo"
          >
            <text class="text-sm text-gray-600">下一个视频</text>
            <text class="i-carbon-chevron-right ml-1 text-gray-600" />
          </view>
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
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { createTrainingGroundPost } from '@/api/training-ground'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { recordVideoViewAPI } from '@/service/collections'
import { useCoursesStore } from '@/store/courses'
import { useUserStore } from '@/store/user'
import { setPageShareConfig } from '@/utils/share'

definePage({
  style: {
    navigationBarTitleText: '视频详情',
  },
  excludeLoginPath: true,
})

// const settingsStore = useSettingsStore()
const coursesStore = useCoursesStore()
const userStore = useUserStore()
const videoId = ref('')
const collectionId = ref('')

const video = computed(() => {
  return coursesStore.getVideoById(videoId.value)
})

const collectionTitle = computed(() => {
  return coursesStore.currentCourse?.title || ''
})

const hasPreviousVideo = computed(() => {
  return !!coursesStore.getPreviousVideo(videoId.value)
})

const hasNextVideo = computed(() => {
  return !!coursesStore.getNextVideo(videoId.value)
})

onLoad(async (options) => {
  // await settingsStore.fetchSettings()
  // if (!settingsStore.showVideo) {
  //   uni.switchTab({ url: '/pages/index/index' })
  //   return
  // }

  if (options?.id && options?.collectionId) {
    videoId.value = options.id
    collectionId.value = options.collectionId

    try {
      // 先获取课程详情
      await coursesStore.fetchCourseDetail(collectionId.value)

      // 检查视频是否存在
      if (!video.value) {
        throw new Error('Video not found')
      }

      if (video.value?.title) {
        uni.setNavigationBarTitle({ title: video.value.title })
      }

      recordVideoViewAPI(videoId.value).catch(() => {})

      setPageShareConfig({
        onShareAppMessage: () => ({
          title: video.value?.title || '视频详情',
          path: `/pages/courses/video-detail?id=${videoId.value}&collectionId=${collectionId.value}`,
        }),
        onShareTimeline: () => ({
          title: video.value?.title || '视频详情',
          query: `id=${videoId.value}&collectionId=${collectionId.value}`,
          imageUrl: video.value?.coverUrl || '',
        }),
      })
    }
    catch (e) {
      uni.showToast({ title: 'Failed to load video', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
    }
  }
  else {
    uni.showToast({ title: 'No video ID provided', icon: 'none' })
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
  else if (collectionId.value) {
    console.log('handleClose - 执行 redirectTo 课程详情')
    uni.redirectTo({
      url: `/pages/courses/detail?id=${collectionId.value}`,
    })
  }
  else {
    console.log('handleClose - 执行 switchTab 首页')
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function navigateToCollection() {
  if (!collectionId.value)
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
    url: `/pages/courses/detail?id=${collectionId.value}`,
  })
}

function navigateToPreviousVideo() {
  const previousVideo = coursesStore.getPreviousVideo(videoId.value)
  if (!previousVideo)
    return

  videoId.value = previousVideo.id
  uni.setNavigationBarTitle({ title: previousVideo.title })
}

function navigateToNextVideo() {
  const nextVideo = coursesStore.getNextVideo(videoId.value)
  if (!nextVideo)
    return

  videoId.value = nextVideo.id
  uni.setNavigationBarTitle({ title: nextVideo.title })
}

async function publishToTrainingGround() {
  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  if (!video.value)
    return

  uni.showModal({
    title: '发布到练功场',
    editable: true,
    placeholderText: '请输入发布描述（选填）',
    content: '',
    success: async (res) => {
      if (res.confirm) {
        try {
          await createTrainingGroundPost({
            type: 'VIDEO',
            url: video.value.url,
            description: res.content || undefined,
            source: {
              url: `/pages/courses/video-detail?id=${videoId.value}&collectionId=${collectionId.value}`,
              title: video.value.title || '视频详情',
              type: 'video',
            },
          })
          uni.showToast({ title: '发布成功', icon: 'success' })
        }
        catch (e) {
          console.error('发布失败', e)
          uni.showToast({ title: '发布失败', icon: 'none' })
        }
      }
    },
  })
}
</script>

<style lang="scss" scoped>
</style>
