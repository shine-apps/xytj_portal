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
          <view class="mb-2 flex items-start justify-between gap-2">
            <view class="flex-1 text-xl font-bold">
              {{ coursesStore.currentCourse.title }}
            </view>
            <!-- 订阅状态徽章 -->
            <view
              v-if="isPaid && hasActiveSubscription"
              class="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 font-medium"
            >
              <text class="i-carbon-checkmark mr-0.5" />
              已订阅
            </view>
            <view
              v-else-if="isPaid"
              class="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 font-medium"
            >
              <text class="i-carbon-currency mr-0.5" />
              付费
            </view>
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
          class="mb-3 flex items-center border border-gray-200 rounded-lg bg-white p-3 shadow transition"
          :class="canClickVideo(item) ? 'active:bg-gray-50' : 'opacity-60'"
          @click="onVideoCardClick(item)"
        >
          <view
            class="relative mr-3 h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-200"
            @click.stop="onVideoThumbnailClick(item)"
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
            <!-- 播放图标(可见状态) -->
            <view
              v-if="canClickVideo(item)"
              class="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <text class="i-carbon-play-filled text-xl text-white" />
            </view>
            <!-- 锁形图标(不可访问) -->
            <view
              v-else
              class="absolute inset-0 flex flex-col items-center justify-center bg-black/50"
            >
              <text class="i-carbon-locked text-2xl text-white" />
            </view>
            <!-- 试看标签(未订阅时才显示;已订阅后全部视频可看,无"试看"概念) -->
            <view
              v-if="isPaid && item.isPublic && !hasActiveSubscription"
              class="absolute right-0 top-0 rounded-bl-md bg-green-500 px-1.5 py-0.5 text-[10px] text-white font-medium"
            >
              试看
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
          <!-- 提示文字/箭头 -->
          <view class="ml-2 flex items-center justify-center">
            <text
              v-if="!canClickVideo(item)"
              class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
            >
              订阅后观看
            </text>
            <wd-icon v-else name="arrow-right" size="22px" custom-class="text-gray-400" />
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

    <!-- 底部固定订阅栏 -->
    <view
      v-if="isPaid"
      class="bottom-bar"
      :style="{ paddingBottom: bottomSafeArea }"
    >
      <view class="flex items-center justify-between gap-3 px-4 py-3">
        <!-- 价格 + 状态文字 -->
        <view class="min-w-0 flex-1">
          <template v-if="hasActiveSubscription">
            <view class="mt-1 text-xs text-blue-500 active:opacity-70" @click="goToMySubscriptions">
              查看我的所有订阅 →
            </view>
          </template>
          <template v-else-if="userStore.hasValidLogin">
            <view class="text-base text-gray-900 font-bold">
              订阅此课程
            </view>
            <view class="text-xs text-gray-500">
              有效期 {{ durationDays }} 天,观看全部 {{ totalVideos }} 个视频
            </view>
          </template>
          <template v-else>
            <view class="text-sm text-gray-600">
              登录后可订阅课程
            </view>
          </template>
        </view>

        <!-- 操作按钮 -->
        <view
          v-if="!hasActiveSubscription"
          class="flex-shrink-0 rounded-full px-5 py-2.5 text-sm text-white font-bold shadow"
          :class="userStore.hasValidLogin ? 'bg-amber-500 active:bg-amber-600' : 'bg-blue-500 active:bg-blue-600'"
          :style="{ opacity: subscribing ? 0.7 : 1 }"
          @click="onSubscribeClick"
        >
          <text v-if="subscribing">处理中...</text>
          <text v-else-if="!userStore.hasValidLogin">请先登录</text>
          <text v-else>立即订阅 ¥{{ priceYuan }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ISubscriptionStatus } from '@/api/subscriptions'
import type { IVideo } from '@/service/collections'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { mockCompleteOrderAPI } from '@/api/subscriptions'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { useCoursesStore } from '@/store/courses'
import { useSubscriptionStore } from '@/store/subscription'
import { useUserStore } from '@/store/user'
import { setPageShareConfig } from '@/utils/share'
import { toLoginPage } from '@/utils/toLoginPage'

definePage({
  style: {
    navigationBarTitleText: '课程详情',
  },
  // 课程详情页需要登录检查
  excludeLoginPath: false,
})

const coursesStore = useCoursesStore()
const userStore = useUserStore()
const subscriptionStore = useSubscriptionStore()
const paging = ref<any>(null)
const collectionId = ref('')
const videoList = ref<IVideo[]>([])
const showVideoPlayer = ref(false)
const currentVideo = ref<IVideo | null>(null)
const subscribing = ref(false)
// reload 由 refreshAfterSubscribe 触发时跳过 queryList 内的订阅状态拉取(调用方刚拉取过)
let skipStatusFetch = false

// 订阅状态(从 store 中读取)
const subscriptionStatus = computed<ISubscriptionStatus | null>(() => {
  if (!collectionId.value)
    return null
  return subscriptionStore.statusMap[collectionId.value] || null
})

// 是否为付费课程
const isPaid = computed(() => {
  return !!coursesStore.currentCourse?.isPaid
})

// 价格(元)
const priceYuan = computed(() => {
  const price = subscriptionStatus.value?.price ?? coursesStore.currentCourse?.price ?? 0
  return (price / 100).toFixed(2)
})

// 订阅有效期(天)
const durationDays = computed(() => {
  return subscriptionStatus.value?.durationDays ?? coursesStore.currentCourse?.durationDays ?? 30
})

// 是否已订阅
const hasActiveSubscription = computed(() => {
  return !!subscriptionStatus.value?.hasActiveSubscription
})

// 剩余天数
const remainingDays = computed(() => {
  return subscriptionStatus.value?.remainingDays ?? 0
})

// 视频总数
const totalVideos = computed(() => {
  return videoList.value.length || coursesStore.currentCourse?.videos?.length || 0
})

// 底部安全区
const bottomSafeArea = ref('0px')
// #ifdef MP-WEIXIN
try {
  const sys = uni.getSystemInfoSync()
  const safeBottom = sys.safeAreaInsets?.bottom ?? 0
  bottomSafeArea.value = `${safeBottom}px`
}
catch (e) {
  bottomSafeArea.value = '0px'
}
// #endif

// 构造视频播放列表(供全屏播放时自动播放下一首使用)
const playlist = computed(() => {
  return videoList.value
    .filter(v => canClickVideo(v))
    .map(v => ({
      id: v.id,
      src: v.url,
      poster: v.coverUrl,
      title: v.title,
    }))
})

/**
 * 判断视频卡片是否可点击
 * - 免费课程: 全部可点击
 * - 付费课程: 已订阅用户全部可点击,未订阅用户仅 isPublic 视频可点击
 */
function canClickVideo(video: IVideo): boolean {
  if (!isPaid.value)
    return true
  // 已订阅用户全部可看(优先于列表数据,防止课程缓存中的 isAccessible 过期)
  if (hasActiveSubscription.value)
    return true
  // 付费课程: 信任后端返回的 isAccessible 字段
  if (video.isAccessible === true)
    return true
  // 后端未返回 isAccessible 时,使用 isPublic 兜底
  if (video.isAccessible === undefined && video.isPublic === true)
    return true
  return false
}

onLoad(async (options) => {
  if (options?.id) {
    collectionId.value = options.id
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

    // 付费课程:拉取订阅状态(未登录时后端返回无订阅+课程付费信息;401 则忽略)
    // refreshAfterSubscribe 触发的 reload 会跳过(调用方刚拉取过,避免重复请求)
    if (res.isPaid && !skipStatusFetch) {
      try {
        await subscriptionStore.fetchStatus(collectionId.value, true)
      }
      catch (e) {
        console.warn('Fetch subscription status failed', e)
      }
    }
    skipStatusFetch = false

    paging.value.complete(res.videos || [])
  }
  catch (e) {
    paging.value.complete(false)
  }
}

function onVideoThumbnailClick(video: IVideo) {
  // 受保护视频:点击缩略图也提示需要订阅
  if (!canClickVideo(video)) {
    onSubscribeClick()
    return
  }
  onVideoClick(video)
}

function onVideoCardClick(video: IVideo) {
  if (!canClickVideo(video)) {
    // 受保护:点击卡片等同于"订阅引导"
    onSubscribeClick()
    return
  }
  navigateToVideoDetail(video)
}

function onVideoClick(video: IVideo) {
  currentVideo.value = video
  showVideoPlayer.value = true
}

function onPopupClose() {
  showVideoPlayer.value = false
}

function onVideoEnded() {
  const accessibleList = videoList.value.filter(v => canClickVideo(v))
  const currentIndex = accessibleList.findIndex(v => v.id === currentVideo.value?.id)
  const nextVideo = accessibleList[currentIndex + 1]
  if (nextVideo) {
    currentVideo.value = nextVideo
  }
}

function navigateToVideoDetail(video: IVideo) {
  uni.navigateTo({
    url: `/pages/courses/video-detail?id=${video.id}&collectionId=${video.collectionId}`,
  })
}

function goToMySubscriptions() {
  uni.navigateTo({ url: '/pages/my/subscriptions' })
}

/**
 * 订阅状态变更后刷新:强制重新拉取课程详情(绕过缓存),
 * 再通过 z-paging reload 同步列表与内部分页状态(reload 会命中刚写入的缓存)
 */
async function refreshAfterSubscribe() {
  await coursesStore.fetchCourseDetail(collectionId.value, true)
  // 标记本次 reload 跳过 queryList 内的 fetchStatus(调用方刚拉取过)
  skipStatusFetch = true
  paging.value?.reload()
}

/**
 * 轮询等待订阅激活(真实微信支付回调为异步)
 * 最多查询 3 次,间隔 1.5s;若回调迟迟未到则提前返回,由用户手动刷新
 */
async function waitForSubscriptionActive(): Promise<void> {
  const MAX_RETRIES = 3
  const INTERVAL = 1500
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const status = await subscriptionStore.fetchStatus(collectionId.value, true)
      if (status.hasActiveSubscription)
        return
    }
    catch {
      // 单次查询失败(网络/401)不中断流程,继续重试
    }
    await new Promise(resolve => setTimeout(resolve, INTERVAL))
  }
}

/**
 * 订阅按钮点击入口
 */
async function onSubscribeClick() {
  if (!collectionId.value)
    return

  if (!userStore.hasValidLogin) {
    toLoginPage()
    return
  }

  if (subscribing.value)
    return

  subscribing.value = true
  try {
    const res = await subscriptionStore.subscribe(collectionId.value)

    // 已经订阅(后端直接返回)
    if (res.alreadySubscribed) {
      uni.showToast({ title: '已是订阅用户', icon: 'success' })
      subscriptionStore.invalidate(collectionId.value)
      await subscriptionStore.fetchStatus(collectionId.value, true)
      await refreshAfterSubscribe()
      return
    }

    // 调起微信支付
    if (res.payParams) {
      const paid = await invokeWechatPay(res.payParams, res.mocked === true)
      if (paid) {
        // mock 模式：微信不会真正回调，这里主动完成订单激活订阅
        if (res.mocked && res.orderId) {
          await mockCompleteOrderAPI(res.orderId)
        }
        // 支付成功:清除缓存 + 等待订阅激活 + 重新拉取状态 + 刷新视频列表
        subscriptionStore.invalidate(collectionId.value)
        // 真实支付回调是异步的,后端可能尚未激活订阅,轮询等待
        if (!res.mocked) {
          await waitForSubscriptionActive()
        }
        await subscriptionStore.fetchStatus(collectionId.value, true)
        // 重新加载课程详情,让 isAccessible 字段刷新
        await refreshAfterSubscribe()
        uni.showToast({
          title: hasActiveSubscription.value ? '订阅成功' : '支付成功,订阅生效中',
          icon: hasActiveSubscription.value ? 'success' : 'none',
        })
      }
    }
    else if (res.free) {
      // 免费课程：后端已直接激活订阅，无需支付
      subscriptionStore.invalidate(collectionId.value)
      await subscriptionStore.fetchStatus(collectionId.value, true)
      await refreshAfterSubscribe()
      uni.showToast({ title: '订阅成功', icon: 'success' })
    }
    else {
      uni.showToast({ title: '订阅失败', icon: 'none' })
    }
  }
  catch (e: any) {
    console.error('Subscribe failed', e)
    uni.showToast({
      title: e?.message || '订阅失败',
      icon: 'none',
    })
  }
  finally {
    subscribing.value = false
  }
}

/**
 * 调起微信支付
 * - 真实环境: uni.requestPayment
 * - mock 模式: 仅提示"开发模式",返回 true 让上层走刷新流程
 */
function invokeWechatPay(payParams: import('@/api/subscriptions').IWxPayParams, mocked: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    // mock 模式:直接走弹窗确认
    if (mocked) {
      uni.showModal({
        title: '订阅确认',
        content: '当前为开发模式,点击"确定"将模拟支付成功(实际生产环境需要微信支付)',
        success: (modalRes) => {
          if (modalRes.confirm) {
            resolve(true)
          }
          else {
            resolve(false)
          }
        },
        fail: () => resolve(false),
      })
      return
    }

    // 真实环境
    // #ifdef MP-WEIXIN
    // 注: uni.requestPayment 的类型在 wxpay 下不需要 orderInfo,但联合类型中为必填,故通过 as 收窄
    uni.requestPayment({
      provider: 'wxpay',
      orderInfo: '',
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType,
      paySign: payParams.paySign,
      success: () => resolve(true),
      fail: (err) => {
        console.warn('Wechat pay cancelled or failed', err)
        uni.showToast({ title: '支付已取消', icon: 'none' })
        resolve(false)
      },
    })
    // #endif

    // #ifndef MP-WEIXIN
    uni.showModal({
      title: '支付提示',
      content: '请在微信小程序中完成订阅支付',
      showCancel: false,
    })
    resolve(false)
    // #endif
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

<style lang="scss" scoped>
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background-color: #ffffff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  border-top: 1px solid #f0f0f0;
  /* 让底部栏浮在 z-paging 内容之上 */
}
</style>
