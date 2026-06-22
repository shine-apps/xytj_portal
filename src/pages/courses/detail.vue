<template>
  <view class="h-full bg-gray-50">
    <z-paging ref="paging" v-model="videoList" :auto="false" @query="queryList">
      <template #top>
        <view v-if="coursesStore.currentCourse" class="mb-2 bg-white p-4 shadow-sm">
          <image
            v-if="coursesStore.currentCourse.coverUrl"
            :src="coursesStore.currentCourse.coverUrl"
            mode="aspectFill"
            class="mb-3 h-48 w-full rounded-lg"
          />
          <view class="mb-2 text-xl font-bold">
            {{ coursesStore.currentCourse.title }}
          </view>
          <view v-if="coursesStore.currentCourse.description" class="mb-2 text-sm text-gray-500">
            {{ coursesStore.currentCourse.description }}
          </view>
          <view class="flex items-center justify-between text-xs text-gray-400">
            <text>创建于: {{ formatDate(coursesStore.currentCourse.createdAt) }}</text>
            <text>{{ coursesStore.currentCourse.videos?.length || 0 }} 个视频</text>
          </view>
        </view>
        <view class="px-4 py-2 text-sm text-gray-500 font-medium">
          视频列表
        </view>
      </template>

      <view class="px-4 pb-4">
        <view
          v-for="item in videoList"
          :key="item.id"
          class="mb-3 flex items-center border border-gray-200 rounded-lg bg-white p-3 shadow transition active:bg-gray-50"
          @click="navigateToVideoDetail(item)"
        >
          <view
            class="relative mr-3 h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-200"
            @click.stop="onVideoClick(item)"
          >
            <image
              v-if="item.coverUrl"
              :src="item.coverUrl"
              mode="aspectFill"
              class="h-full w-full"
            />
            <view v-else class="h-full w-full flex items-center justify-center text-gray-400">
              <text class="i-carbon-video text-2xl" />
            </view>
            <view class="absolute inset-0 flex items-center justify-center bg-black/20">
              <text class="i-carbon-play-filled text-xl text-white" />
            </view>
          </view>
          <view class="min-w-0 flex-1">
            <view class="line-clamp-2 mb-1 text-sm font-bold">
              {{ item.title }}
            </view>
            <view class="flex justify-between text-xs text-gray-400">
              <text>{{ formatSize(item.size) }}</text>
              <text class="flex items-center">
                <text class="i-carbon-view mr-0.5" />
                {{ item.viewCount || 0 }}
              </text>
              <text>{{ formatDate(item.createdAt) }}</text>
            </view>
          </view>
          <!-- Action Buttons -->
          <view class="ml-4 flex items-center justify-center">
            <wd-icon name="arrow-right" size="22px" custom-class="text-gray-400" />
          </view>
        </view>
      </view>
    </z-paging>

    <!-- Video Player Modal -->
    <wd-popup
      v-model="showVideoPlayer"
      custom-style="box-shadow: none; padding: 0;"
      :close-on-click-modal="true"
      closable
      hide-when-close
      @close="onPopupClose"
    >
      <view class="w-[90vw] overflow-hidden rounded-lg bg-black">
        <VideoPlayer
          v-if="showVideoPlayer && currentVideo"
          :key="currentVideo.id"
          :src="currentVideo.url"
          :poster="currentVideo.coverUrl"
          :title="currentVideo.title"
          :playlist="playlist"
          :video-id="currentVideo.id"
          @close="onPopupClose"
          @ended="onVideoEnded"
        />
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import type { IVideo } from '@/service/collections'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { useCoursesStore } from '@/store/courses'
// import { useSettingsStore } from '@/store/settings'
import { setPageShareConfig } from '@/utils/share'

definePage({
  style: {
    navigationBarTitleText: '课程详情',
  },
  // 课程详情页需要登录检查
  excludeLoginPath: false,
})

// const settingsStore = useSettingsStore()
const coursesStore = useCoursesStore()
const paging = ref<any>(null)
const collectionId = ref('')
const videoList = ref<IVideo[]>([])
const showVideoPlayer = ref(false)
const currentVideo = ref<IVideo | null>(null)

// 构造视频播放列表（供全屏播放时自动播放下一首使用）
const playlist = computed(() => {
  return videoList.value.map(v => ({
    id: v.id,
    src: v.url,
    poster: v.coverUrl,
    title: v.title,
  }))
})

onLoad(async (options) => {
  // await settingsStore.fetchSettings()
  // if (!settingsStore.showVideo) {
  //   uni.switchTab({ url: '/pages/index/index' })
  //   return
  // }

  if (options?.id) {
    collectionId.value = options.id
    // Manually trigger refresh after getting ID
    setTimeout(() => {
      paging.value?.reload()
    }, 100)
  }
  else {
    uni.showToast({ title: 'Invalid Course ID', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

async function queryList(pageNo: number, pageSize: number) {
  if (!collectionId.value) {
    paging.value.complete([])
    return
  }

  if (pageNo > 1) {
    paging.value.complete([])
    return
  }

  try {
    const res = await coursesStore.fetchCourseDetail(collectionId.value)
    uni.setNavigationBarTitle({ title: res.title })

    setPageShareConfig({
      onShareAppMessage: () => ({
        title: res.title,
        path: `/pages/courses/detail?id=${collectionId.value}`,
      }),
      onShareTimeline: () => ({
        title: res.title,
        query: `id=${collectionId.value}`,
        imageUrl: res.coverUrl || '',
        summary: res.description || '',
      }),
    })

    paging.value.complete(res.videos || [])
  }
  catch (e) {
    paging.value.complete(false)
  }
}

function onVideoClick(video: IVideo) {
  currentVideo.value = video
  showVideoPlayer.value = true
}

function onPopupClose() {
  showVideoPlayer.value = false
}

function onVideoEnded() {
  const currentIndex = videoList.value.findIndex(v => v.id === currentVideo.value?.id)
  const nextVideo = videoList.value[currentIndex + 1]
  if (nextVideo) {
    currentVideo.value = nextVideo
  }
}

function navigateToVideoDetail(video: IVideo) {
  // Navigate to video detail page with video ID
  uni.navigateTo({
    url: `/pages/courses/video-detail?id=${video.id}&collectionId=${video.collectionId}`,
  })
}

onUnload(() => {
  coursesStore.clearCurrentCourse()
})

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

function formatSize(bytes: number) {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}
</script>
