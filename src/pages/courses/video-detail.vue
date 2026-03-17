<template>
  <view class="h-full bg-gray-50">
    <view v-if="video" class="bg-white">
      <!-- Video Player -->
      <view v-if="isPurchased || collectionPrice === 0" class="relative aspect-video w-full bg-black">
        <video
          :src="video.url"
          :poster="video.coverUrl || ''"
          autoplay
          controls
          object-fit="contain"
          class="h-full w-full"
        />
      </view>
      <view v-else class="relative aspect-video w-full bg-black flex items-center justify-center">
        <view class="text-center text-white">
          <text class="text-xl font-bold mb-2 block">需要购买才能观看</text>
          <button 
            class="mt-4 px-6 py-2 rounded-lg bg-blue-500 text-white font-medium"
            @click="navigateToCollection"
          >
            去购买
          </button>
        </view>
      </view>

      <!-- Video Info -->
      <view class="p-4">
        <view class="mb-3 text-xl text-gray-900 font-bold">
          {{ video.title }}
        </view>

        <!-- Course Link -->
        <view v-if="collectionTitle" class="mb-4 text-sm text-gray-500">
          所属课程: <text class="text-blue-500 active:opacity-70" @click="navigateToCollection">{{ collectionTitle }}</text>
        </view>
        
        <!-- Price Info -->
        <view v-if="collectionPrice > 0" class="mb-4">
          <view class="text-sm text-gray-500">
            价格: <text class="text-red-500 font-bold">¥{{ collectionPrice }}</text>
          </view>
          <view v-if="isPurchased" class="text-sm text-green-500">
            状态: 已购买
          </view>
          <view v-else class="text-sm text-yellow-500">
            状态: 未购买
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
import type { IVideo } from '@/service/collections'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getCollectionDetailAPI, checkPurchaseAPI } from '@/service/collections'

definePage({
  style: {
    navigationBarTitleText: '视频详情',
  },
  // 视频详情页需要登录检查
  excludeLoginPath: false,
})

const video = ref<IVideo | null>(null)
const collectionTitle = ref('')
const isPurchased = ref(false)
const collectionPrice = ref(0)

onLoad((options) => {
  if (options?.video) {
    try {
      // Parse video data passed from navigation
      video.value = JSON.parse(decodeURIComponent(options.video))
      // Update navigation title
      if (video.value?.title) {
        uni.setNavigationBarTitle({ title: video.value.title })
      }
      
      // Check purchase status if collectionId is available
      if (video.value?.collectionId) {
        checkPurchaseStatus(video.value.collectionId)
      }
    }
    catch (e) {
      uni.showToast({ title: 'Invalid video data', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
    }

    if (options.collectionTitle) {
      collectionTitle.value = decodeURIComponent(options.collectionTitle)
    }
  }
  else {
    uni.showToast({ title: 'No video data provided', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})

async function checkPurchaseStatus(collectionId: string) {
  try {
    // Get collection detail to get price
    const collectionDetail = await getCollectionDetailAPI(collectionId)
    collectionPrice.value = collectionDetail.price
    
    // Check if user has purchased this collection
    if (collectionDetail.price > 0) {
      const purchaseStatus = await checkPurchaseAPI(collectionId)
      isPurchased.value = purchaseStatus.purchased
    } else {
      isPurchased.value = true // Free collections are always accessible
    }
  } catch (error) {
    console.error('Error checking purchase status:', error)
  }
}

function navigateToCollection() {
  if (!video.value?.collectionId) return

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
