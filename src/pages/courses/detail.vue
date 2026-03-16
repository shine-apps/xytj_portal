<template>
  <view class="h-full bg-gray-50">
    <z-paging ref="paging" v-model="videoList" :auto="false" @query="queryList">
      <template #top>
        <view v-if="collection" class="mb-2 bg-white p-4 shadow-sm">
          <image
            v-if="collection.coverUrl"
            :src="collection.coverUrl"
            mode="aspectFill"
            class="mb-3 h-48 w-full rounded-lg"
          />
          <view class="mb-2 text-xl font-bold">
            {{ collection.title }}
          </view>
          <view v-if="collection.description" class="mb-2 text-sm text-gray-500">
            {{ collection.description }}
          </view>
          <view class="flex items-center justify-between text-xs text-gray-400">
            <text>创建于: {{ formatDate(collection.createdAt) }}</text>
            <text>{{ collection.videos?.length || 0 }} 个视频</text>
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
          class="mb-3 flex items-center rounded-lg bg-white p-3 shadow-sm transition active:bg-gray-50"
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
      custom-style="background: transparent; box-shadow: none; padding: 0;"
      :close-on-click-modal="true"
      @close="onPopupClose"
    >
      <view class="w-[90vw] overflow-hidden rounded-lg bg-black">
        <video
          v-if="showVideoPlayer && currentVideo"
          :src="currentVideo.url"
          :poster="currentVideo.coverUrl || ''"
          autoplay
          controls
          object-fit="contain"
          class="aspect-video w-full"
        />
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import type { ICollectionDetail, IVideo } from '@/service/collections'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { ref } from 'vue'
import { getCollectionDetailAPI } from '@/service/collections'

definePage({
  style: {
    navigationBarTitleText: '课程详情',
  },
  // 课程详情页需要登录检查
  excludeLoginPath: false,
})

const paging = ref<any>(null)
const collectionId = ref('')
const collection = ref<ICollectionDetail | null>(null)
const videoList = ref<IVideo[]>([])
const showVideoPlayer = ref(false)
const currentVideo = ref<IVideo | null>(null)

onLoad((options) => {
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

  // Since the API returns the detail with all videos, we only fetch once
  if (pageNo > 1) {
    paging.value.complete([])
    return
  }

  try {
    const res = await getCollectionDetailAPI(collectionId.value)
    collection.value = res
    // Update navigation title
    uni.setNavigationBarTitle({ title: res.title })
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
  // Video will be destroyed due to v-if
  showVideoPlayer.value = false
}

function navigateToVideoDetail(video: IVideo) {
  // Navigate to video detail page with video data and collection title
  const collectionTitle = collection.value?.title || ''
  uni.navigateTo({
    url: `/pages/courses/video-detail?video=${encodeURIComponent(JSON.stringify(video))}&collectionTitle=${encodeURIComponent(collectionTitle)}`,
  })
}

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

<style lang="scss" scoped>
</style>
