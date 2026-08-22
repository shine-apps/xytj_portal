<template>
  <view class="h-full bg-gray-50">
    <!-- 视频已解锁,正常播放 -->
    <view v-if="!loading && accessAllowed && video" class="bg-white">
      <!-- Video Player -->
      <VideoPlayer
        :src="video.url"
        :poster="video.coverUrl || ''"
        :title="video.title"
        :container-width="750"
        :video-id="videoId"
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

    <!-- 订阅引导卡片(无权访问时) -->
    <view v-else-if="!loading && !accessAllowed" class="subscription-guide p-6">
      <view class="mx-auto max-w-md flex flex-col items-center rounded-2xl bg-white p-8 shadow-lg">
        <view class="mb-4 h-20 w-20 flex items-center justify-center rounded-full bg-amber-100">
          <text class="i-carbon-locked text-4xl text-amber-500" />
        </view>
        <view class="mb-2 text-center text-xl text-gray-900 font-bold">
          订阅后观看完整课程
        </view>
        <view v-if="collectionTitle" class="mb-3 text-center text-sm text-gray-600">
          《{{ collectionTitle }}》
        </view>
        <view class="mb-6 text-center text-sm text-gray-500 leading-relaxed">
          本课程为付费订阅课程,订阅后可观看全部视频内容。
        </view>

        <!-- 价格 / 时长信息 -->
        <view v-if="priceLabel" class="mb-6 w-full rounded-lg bg-gray-50 p-4">
          <view class="mb-2 flex items-center justify-between">
            <text class="text-sm text-gray-500">订阅价格</text>
            <text class="text-2xl text-amber-500 font-bold">{{ priceLabel }}</text>
          </view>
          <view v-if="durationLabel" class="flex items-center justify-between">
            <text class="text-sm text-gray-500">有效期</text>
            <text class="text-sm text-gray-700 font-medium">{{ durationLabel }}</text>
          </view>
        </view>

        <!-- 订阅按钮 -->
        <view
          v-if="!userStore.hasValidLogin"
          class="mb-3 w-full rounded-full bg-blue-500 py-3 text-center text-base text-white font-bold shadow active:bg-blue-600"
          @click="onLoginClick"
        >
          请先登录
        </view>
        <view
          v-else
          class="mb-3 w-full rounded-full bg-amber-500 py-3 text-center text-base text-white font-bold shadow active:bg-amber-600"
          :style="{ opacity: subscribing ? 0.7 : 1 }"
          @click="onSubscribeClick"
        >
          <text v-if="subscribing">处理中...</text>
          <text v-else>立即订阅</text>
        </view>

        <!-- 返回课程详情 -->
        <view
          v-if="collectionId"
          class="mt-2 text-sm text-blue-500 active:opacity-70"
          @click="navigateToCollection"
        >
          返回课程详情
        </view>
        <view
          v-else
          class="mt-2 text-sm text-gray-500 active:opacity-70"
          @click="handleClose"
        >
          返回
        </view>

        <!-- 失败原因提示 -->
        <view
          v-if="accessReason === 'subscription_expired'"
          class="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700"
        >
          <text class="i-carbon-warning mr-1" />
          您的订阅已过期,续订后可继续观看。
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
import { mockCompleteOrderAPI } from '@/api/subscriptions'
import type { AccessReason, ISubscriptionStatus } from '@/api/subscriptions'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { createTrainingGroundPost } from '@/api/training-ground'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { recordVideoViewAPI } from '@/service/collections'
import { useCoursesStore } from '@/store/courses'
import { useSubscriptionStore } from '@/store/subscription'
import { useUserStore } from '@/store/user'
import { setPageShareConfig } from '@/utils/share'
import { toLoginPage } from '@/utils/toLoginPage'

definePage({
  style: {
    navigationBarTitleText: '视频详情',
  },
  excludeLoginPath: false,
})

const coursesStore = useCoursesStore()
const userStore = useUserStore()
const subscriptionStore = useSubscriptionStore()
const videoId = ref('')
const collectionId = ref('')
const loading = ref(true)
const accessAllowed = ref(false)
const accessReason = ref<AccessReason | null>(null)
const subscribing = ref(false)

const video = computed(() => {
  return coursesStore.getVideoById(videoId.value)
})

const collectionTitle = computed(() => {
  return coursesStore.currentCourse?.title || ''
})

const hasPreviousVideo = computed(() => {
  // 仅在有访问权限时,才能正常切换上一个/下一个
  return accessAllowed.value && !!coursesStore.getPreviousVideo(videoId.value)
})

const hasNextVideo = computed(() => {
  return accessAllowed.value && !!coursesStore.getNextVideo(videoId.value)
})

const priceLabel = computed(() => {
  const status = subscriptionStore.statusMap[collectionId.value] as ISubscriptionStatus | undefined
  const price = status?.price ?? coursesStore.currentCourse?.price ?? 0
  if (!price)
    return ''
  return `¥${(price / 100).toFixed(2)}`
})

const durationLabel = computed(() => {
  const status = subscriptionStore.statusMap[collectionId.value] as ISubscriptionStatus | undefined
  const days = status?.durationDays ?? coursesStore.currentCourse?.durationDays ?? 0
  if (!days)
    return ''
  return `${days} 天`
})

onLoad(async (options) => {
  if (options?.id && options?.collectionId) {
    videoId.value = options.id
    collectionId.value = options.collectionId

    try {
      // 先获取课程详情
      await coursesStore.fetchCourseDetail(collectionId.value)

      if (!video.value) {
        throw new Error('Video not found')
      }

      if (video.value?.title) {
        uni.setNavigationBarTitle({ title: video.value.title })
      }

      // 鉴权:服务端强制校验(管理员/视频作者/公开试看/有效订阅 全部允许)
      try {
        const access = await subscriptionStore.fetchAccess(videoId.value, true)
        accessReason.value = access.reason

        // 视频作者本人或管理员:后端会放行(allowed=true)
        // 课程未付费:也是 allowed=true (reason=public 或 not_paid)
        // 视频是公开试看:reason=public
        // 已订阅:reason=active_subscription
        accessAllowed.value = access.allowed

        if (access.allowed) {
          // 记录观看
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
        else {
          // 无权限: 顺便拉一下课程订阅状态,获取价格信息
          if (userStore.hasValidLogin) {
            try {
              await subscriptionStore.fetchStatus(collectionId.value, true)
            }
            catch (e) {
              console.warn('Fetch subscription status failed', e)
            }
          }
        }
      }
      catch (e) {
        // 获取权限信息失败(可能未登录):兜底允许(交给后端流地址鉴权)
        // 但更安全的做法是: 默认拒绝
        console.warn('Fetch video access failed', e)
        // 未登录用户:允许试看公开视频,否则需要登录
        if (!userStore.hasValidLogin) {
          // 未登录:引导登录
          accessAllowed.value = false
          accessReason.value = 'not_subscribed'
        }
        else {
          // 其它错误:保守起见拒绝
          accessAllowed.value = false
          accessReason.value = 'not_subscribed'
        }
      }

      loading.value = false
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
  if (pages.length > 1) {
    uni.navigateBack()
  }
  else if (collectionId.value) {
    uni.redirectTo({
      url: `/pages/courses/detail?id=${collectionId.value}`,
    })
  }
  else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

function navigateToCollection() {
  if (!collectionId.value)
    return

  const pages = getCurrentPages()
  if (pages.length > 1) {
    const prevPage = pages[pages.length - 2]
    if (prevPage.route?.includes('pages/courses/detail')) {
      uni.navigateBack()
      return
    }
  }

  uni.navigateTo({
    url: `/pages/courses/detail?id=${collectionId.value}`,
  })
}

function navigateToPreviousVideo() {
  if (!accessAllowed.value)
    return
  const previousVideo = coursesStore.getPreviousVideo(videoId.value)
  if (!previousVideo)
    return

  videoId.value = previousVideo.id
  uni.setNavigationBarTitle({ title: previousVideo.title })
}

function navigateToNextVideo() {
  if (!accessAllowed.value)
    return
  const nextVideo = coursesStore.getNextVideo(videoId.value)
  if (!nextVideo)
    return

  videoId.value = nextVideo.id
  uni.setNavigationBarTitle({ title: nextVideo.title })
}

function onLoginClick() {
  toLoginPage()
}

async function onSubscribeClick() {
  if (!collectionId.value || subscribing.value)
    return
  if (!userStore.hasValidLogin) {
    toLoginPage()
    return
  }

  subscribing.value = true
  try {
    const res = await subscriptionStore.subscribe(collectionId.value)

    if (res.alreadySubscribed) {
      uni.showToast({ title: '已是订阅用户', icon: 'success' })
      subscriptionStore.invalidate(collectionId.value)
      await subscriptionStore.fetchStatus(collectionId.value, true)
      await coursesStore.fetchCourseDetail(collectionId.value)
      // 重新检查当前视频权限
      const access = await subscriptionStore.fetchAccess(videoId.value, true)
      accessReason.value = access.reason
      accessAllowed.value = access.allowed
      return
    }

    if (res.payParams) {
      const paid = await invokeWechatPay(res.payParams, res.mocked === true)
      if (paid) {
        // mock 模式：微信不会真正回调，这里主动完成订单激活订阅
        if (res.mocked && res.orderId) {
          await mockCompleteOrderAPI(res.orderId)
        }
        subscriptionStore.invalidate(collectionId.value)
        await subscriptionStore.fetchStatus(collectionId.value, true)
        await coursesStore.fetchCourseDetail(collectionId.value)
        // 重新拉取当前视频的访问权限
        const access = await subscriptionStore.fetchAccess(videoId.value, true)
        accessReason.value = access.reason
        accessAllowed.value = access.allowed
        uni.showToast({ title: '订阅成功', icon: 'success' })
      }
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

function invokeWechatPay(payParams: import('@/api/subscriptions').IWxPayParams, mocked: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    if (mocked) {
      uni.showModal({
        title: '订阅确认',
        content: '当前为开发模式,点击"确定"将模拟支付成功(实际生产环境需要微信支付)',
        success: (modalRes) => {
          if (modalRes.confirm)
            resolve(true)
          else
            resolve(false)
        },
        fail: () => resolve(false),
      })
      return
    }

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
            url: video.value!.url,
            description: res.content || undefined,
            source: {
              url: `/pages/courses/video-detail?id=${videoId.value}&collectionId=${collectionId.value}`,
              title: video.value!.title || '视频详情',
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
.subscription-guide {
  min-height: 100vh;
  background-color: #f7f8fa;
}
</style>
