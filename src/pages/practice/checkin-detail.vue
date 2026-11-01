<script setup lang="ts">
import type { PracticeRecordItem } from '@/service/practice'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { deleteCheckInAPI, getPracticeRecordAPI, practiceTypeLabel } from '@/service/practice'
import { useUserStore } from '@/store/user'
import { buildVideoCoverUrl } from '@/utils/cos'
import { formatTime, shanghaiToday } from '@/utils/dateUtil'
import { setPageShareConfig } from '@/utils/share'

definePage({
  style: {
    navigationBarTitleText: '打卡详情',
  },
})

const recordId = ref('')
const checkIn = ref<PracticeRecordItem | null>(null)
const loading = ref(false)
const avatarError = ref(false)
const deleting = ref(false)
const userStore = useUserStore()

/** 本人当天的打卡才可编辑、删除（编辑页仅支持编辑今日打卡） */
const isOwnTodayCheckIn = computed(() => {
  if (!checkIn.value || !userStore.hasValidLogin)
    return false
  return checkIn.value.userId === userStore.userInfo.userId
    && checkIn.value.checkInDate.slice(0, 10) === shanghaiToday()
})

const pageTitle = computed(() => {
  if (!checkIn.value)
    return '打卡详情'
  const [, month, day] = checkIn.value.checkInDate.slice(0, 10).split('-').map(Number)
  return `${checkIn.value.user.name} ${month}月${day}号的练功打卡`
})

const fullDate = computed(() => {
  if (!checkIn.value)
    return ''
  const [year, month, day] = checkIn.value.checkInDate.slice(0, 10).split('-').map(Number)
  return `${year}年${month}月${day}日`
})

const shareDescription = computed(() => {
  if (!checkIn.value)
    return '一起记录每日练功，共修身心'
  return `${practiceTypeLabel(checkIn.value.practiceType)} · ${checkIn.value.durationMinutes}分钟 · 获得${checkIn.value.points}积分`
})

const shareImage = computed(() => {
  return checkIn.value?.medias.find(media => media.type === 'IMAGE')?.url
})

onLoad((options) => {
  recordId.value = options?.id?.trim() || ''
  setPageShareConfig({
    onShareAppMessage: () => ({
      title: pageTitle.value,
      desc: shareDescription.value,
      path: `/pages/practice/checkin-detail?id=${recordId.value}`,
      imageUrl: shareImage.value,
    }),
    onShareTimeline: () => ({
      title: pageTitle.value,
      query: `id=${recordId.value}`,
      imageUrl: shareImage.value,
    }),
  })
  if (recordId.value)
    loadDetail()
})

// 编辑打卡后返回本页时刷新最新内容
onShow(() => {
  if (recordId.value && checkIn.value)
    loadDetail()
})

async function loadDetail() {
  if (!recordId.value || loading.value)
    return
  loading.value = true
  try {
    checkIn.value = await getPracticeRecordAPI(recordId.value)
    avatarError.value = false
    uni.setNavigationBarTitle({ title: pageTitle.value })
  }
  catch (e) {
    // 刷新失败时保留已展示内容，仅首次加载失败才显示错误页
    console.error('加载打卡详情失败', e)
  }
  finally {
    loading.value = false
  }
}

function navigateToChallenge(id: string) {
  uni.navigateTo({ url: `/pages/practice/challenge-detail?id=${id}` })
}

function previewImage(url: string) {
  if (!checkIn.value)
    return
  const urls = checkIn.value.medias.filter(media => media.type === 'IMAGE').map(media => media.url)
  uni.previewImage({ urls, current: url })
}

function handleEdit() {
  uni.navigateTo({ url: '/pages/practice/checkin?edit=1' })
}

function handleDelete() {
  const record = checkIn.value
  if (!record || deleting.value)
    return
  uni.showModal({
    title: '删除打卡',
    content: `确定删除 ${fullDate.value} 的打卡记录吗？对应积分将被扣除。`,
    success: async (res) => {
      if (!res.confirm)
        return
      deleting.value = true
      try {
        await deleteCheckInAPI(record.checkInDate.slice(0, 10))
        uni.showToast({ title: '已删除', icon: 'success' })
        uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/practice/index' }) })
      }
      catch (e) {
        console.error('删除打卡失败', e)
      }
      finally {
        deleting.value = false
      }
    },
  })
}

async function handleShare() {
  if (!checkIn.value || typeof window === 'undefined')
    return
  const shareUrl = window.location.href
  if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
    try {
      await (navigator as any).share({
        title: pageTitle.value,
        text: shareDescription.value,
        url: shareUrl,
      })
      return
    }
    catch {
      // 用户取消或调起失败，走复制链接兜底
    }
  }
  uni.setClipboardData({
    data: shareUrl,
    success: () => uni.showToast({ title: '链接已复制，快去分享吧', icon: 'none' }),
  })
}
</script>

<template>
  <view class="min-h-screen bg-[#fffdf9] pb-32 font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
    <view v-if="loading && !checkIn" class="flex flex-col items-center justify-center py-24">
      <wd-loading color="#a33327" />
      <text class="mt-3 text-sm text-[#888]">墨迹晕染中…</text>
    </view>

    <view v-else-if="!checkIn" class="flex flex-col items-center justify-center px-5 py-24">
      <text class="text-sm text-[#888]">打卡详情加载失败</text>
      <view
        class="mt-4 border border-[#a33327]/60 rounded-full px-6 py-2 text-sm text-[#a33327]"
        @click="loadDetail"
      >
        重新加载
      </view>
    </view>

    <template v-else>
      <view class="px-5 pb-6 pt-7">
        <text class="block text-xs text-[#9c6b3f] tracking-[0.2em]">{{ fullDate }} · 每日精进</text>
        <text class="mt-2 block text-2xl text-[#1a1a1a] font-bold leading-snug">{{ pageTitle }}</text>

        <view class="mt-6 flex items-center gap-3">
          <image
            v-if="checkIn.user.image && !avatarError"
            :src="checkIn.user.image"
            mode="aspectFill"
            class="h-10 w-10 shrink-0 border border-[#e8e4dc] rounded-full"
            @error="avatarError = true"
          />
          <view
            v-else
            class="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-[#a33327] text-base text-white font-bold"
          >
            {{ checkIn.user.name.slice(0, 1) }}
          </view>
          <view class="min-w-0">
            <text class="block text-sm text-[#333] font-medium">{{ checkIn.user.name }}</text>
            <text class="mt-0.5 block text-xs text-[#999]">{{ formatTime(checkIn.createdAt) }} 提交</text>
          </view>
        </view>
      </view>

      <view class="mx-5 flex border-b border-t border-[#eee9df] py-4">
        <view class="min-w-0 flex-1 text-center">
          <text class="block text-2xs text-[#999]">习练功法</text>
          <text class="mt-1.5 block break-words text-sm text-[#333] font-medium">{{ practiceTypeLabel(checkIn.practiceType) }}</text>
        </view>
        <view class="flex-1 border-l border-[#eee9df] text-center">
          <text class="block text-2xs text-[#999]">习练时长</text>
          <view class="mt-1">
            <text class="text-lg text-[#333] font-bold">{{ checkIn.durationMinutes }}</text>
            <text class="ml-1 text-xs text-[#777]">分钟</text>
          </view>
        </view>
        <view class="flex-1 border-l border-[#eee9df] text-center">
          <text class="block text-2xs text-[#999]">获得积分</text>
          <view class="mt-1">
            <text class="text-lg text-[#a33327] font-bold">+{{ checkIn.points }}</text>
            <text class="ml-1 text-xs text-[#a33327]">积分</text>
          </view>
        </view>
      </view>

      <view class="px-5">
        <view v-if="checkIn.notes" class="border-b border-[#eee9df] py-6">
          <view class="mb-3 flex items-center gap-2">
            <view class="h-4 w-0.5 bg-[#a33327]" />
            <text class="text-base text-[#1a1a1a] font-bold">心得笔记</text>
          </view>
          <text class="block whitespace-pre-wrap break-words text-sm text-[#3f3f3f] leading-7">{{ checkIn.notes }}</text>
        </view>

        <view v-if="checkIn.challenges.length" class="border-b border-[#eee9df] py-5">
          <view class="mb-2 flex items-center gap-2">
            <view class="h-4 w-0.5 bg-[#a33327]" />
            <text class="text-base text-[#1a1a1a] font-bold">关联挑战</text>
          </view>
          <view
            v-for="challenge in checkIn.challenges"
            :key="challenge.id"
            class="flex items-center gap-2 border-b border-[#f2eee6] py-3 last:border-b-0 active:opacity-70"
            @click="navigateToChallenge(challenge.id)"
          >
            <text class="i-carbon-flag shrink-0 text-sm text-[#a33327]" />
            <text class="min-w-0 flex-1 break-words text-sm text-[#444]">{{ challenge.title }}</text>
            <text class="i-carbon-chevron-right shrink-0 text-sm text-[#b8a880]" />
          </view>
        </view>

        <view v-if="checkIn.medias?.length" class="py-5">
          <view class="mb-3 flex items-center gap-2">
            <view class="h-4 w-0.5 bg-[#a33327]" />
            <text class="text-base text-[#1a1a1a] font-bold">照片/视频</text>
            <text class="text-xs text-[#999]">{{ checkIn.medias.length }} 项</text>
          </view>
          <view class="grid grid-cols-3 gap-2">
            <template v-for="(media, mediaIndex) in checkIn.medias" :key="`${checkIn.id}-image-${mediaIndex}`">
              <view
                v-if="media.type === 'IMAGE'"
                class="aspect-square overflow-hidden rounded-md bg-[#efece4]"
                @click="previewImage(media.url)"
              >
                <image :src="media.url" mode="aspectFill" class="h-full w-full" />
              </view>
            </template>
          </view>
          <template v-for="(media, mediaIndex) in checkIn.medias" :key="`${checkIn.id}-video-${mediaIndex}`">
            <VideoPlayer
              v-if="media.type === 'VIDEO'"
              class="mt-4"
              :src="media.url"
              :poster="buildVideoCoverUrl(media.url)"
              :video-id="`checkin-detail-video-${checkIn.id}-${mediaIndex}`"
              :title="pageTitle"
              :autoplay="false"
            />
          </template>
        </view>
      </view>

      <view v-if="checkIn.location" class="mx-5 flex items-start gap-2 border-t border-[#eee9df] py-4 text-xs text-[#777]">
        <text class="i-carbon-location mt-0.5 shrink-0 text-sm text-[#a33327]" />
        <text class="leading-relaxed">
          {{ checkIn.location.address || `已记录位置（${checkIn.location.latitude.toFixed(4)}, ${checkIn.location.longitude.toFixed(4)}）` }}
        </text>
      </view>

      <view class="fixed bottom-0 left-0 right-0 z-40 border-t border-[#eee9df] bg-[#fffdf9]/95 px-5 pt-3" style="padding-bottom: calc(env(safe-area-inset-bottom) + 12px)">
        <view class="flex gap-3">
          <button
            v-if="isOwnTodayCheckIn"
            class="m-0 flex flex-1 items-center justify-center gap-1 border border-[#d9d2c3] rounded-full bg-transparent py-3 text-sm text-[#555] font-medium leading-normal after:border-0"
            @click="handleEdit"
          >
            <text class="i-carbon-edit text-base text-[#555]" />
            <text>编辑</text>
          </button>
          <button
            v-if="isOwnTodayCheckIn"
            class="m-0 flex flex-1 items-center justify-center gap-1 border border-[#d9d2c3] rounded-full bg-transparent py-3 text-sm text-[#888] font-medium leading-normal after:border-0"
            @click="handleDelete"
          >
            <text class="i-carbon-trash-can text-base text-[#888]" />
            <text>删除</text>
          </button>
          <button
            open-type="share"
            class="m-0 flex flex-1 items-center justify-center gap-2 rounded-full bg-[#a33327] py-3 text-base text-white font-bold leading-normal after:border-0"
            @click="handleShare"
          >
            <text class="i-carbon-share text-base text-white" />
            <text>{{ isOwnTodayCheckIn ? '分享' : '分享打卡' }}</text>
          </button>
        </view>
      </view>
    </template>
  </view>
</template>
