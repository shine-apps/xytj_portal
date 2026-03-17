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
          <view class="mb-3 flex items-center justify-between">
            <view class="text-xs text-gray-400">
              创建于: {{ formatDate(collection.createdAt) }}
            </view>
            <view class="text-lg font-bold" :class="collection.price > 0 ? 'text-red-500' : 'text-green-500'">
              {{ collection.price > 0 ? `¥${collection.price}` : '免费' }}
            </view>
          </view>
          <view class="flex items-center justify-between text-xs text-gray-400">
            <text>{{ collection.videos?.length || 0 }} 个视频</text>
            <text v-if="isPurchased" class="text-green-500">已购买</text>
          </view>
          <view v-if="collection.price > 0 && !isPurchased" class="mt-3">
            <button
              class="w-full rounded-lg bg-blue-500 py-2 text-white font-medium"
              @click="handlePurchase"
            >
              立即购买
            </button>
          </view>
        </view>
        <view v-if="!isPurchased && collection?.price > 0" class="bg-yellow-50 px-4 py-4 text-center text-yellow-700">
          您还未购买此课程，请先购买后查看内容
        </view>
        <view v-else class="px-4 py-2 text-sm text-gray-500 font-medium">
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
import { checkPurchaseAPI, getCollectionDetailAPI, purchaseCollectionAPI } from '@/service/collections'
import { createOrderAPI, processWechatPayment } from '@/service/payment'

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
const isPurchased = ref(false)
const isLoading = ref(false)

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

    // Check if user has purchased this collection
    if (res.price > 0) {
      const purchaseStatus = await checkPurchaseAPI(collectionId.value)
      isPurchased.value = purchaseStatus.purchased
    }
    else {
      isPurchased.value = true // Free collections are always accessible
    }

    // Only show videos if purchased or free
    if (isPurchased.value || res.price === 0) {
      paging.value.complete(res.videos || [])
    }
    else {
      paging.value.complete([])
    }
  }
  catch (e) {
    paging.value.complete(false)
  }
}

async function handlePurchase() {
  if (!collectionId.value || !collection.value)
    return

  isLoading.value = true
  try {
    // Create payment order
    const orderResponse = await createOrderAPI(collectionId.value)

    // Process WeChat payment
    const paymentSuccess = await processWechatPayment(orderResponse.payParams)

    if (paymentSuccess) {
      // Create purchase record
      await purchaseCollectionAPI(collectionId.value)

      // Update purchase status
      isPurchased.value = true

      // Reload video list
      setTimeout(() => {
        paging.value?.reload()
      }, 100)

      uni.showToast({ title: '购买成功', icon: 'success' })
    }
  }
  catch (error) {
    console.error('Purchase failed:', error)
    uni.showToast({ title: '购买失败，请重试', icon: 'none' })
  }
  finally {
    isLoading.value = false
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
