<script setup lang="ts">
import type { PracticeRecordItem } from '@/service/practice'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { getPracticeRecordsAPI, practiceTypeLabel } from '@/service/practice'
import { useUserStore } from '@/store/user'
import { RICE_PAPER_IMAGE } from '@/utils/constants'
import { buildVideoCoverUrl } from '@/utils/cos'
import { formatTime } from '@/utils/dateUtil'
import { setPageShareConfig } from '@/utils/share'
import { toLoginPage } from '@/utils/toLoginPage'

definePage({
  style: {
    navigationBarTitleText: '练功打卡广场',
  },
})

const paging = ref<any>(null)
const checkIns = ref<PracticeRecordItem[]>([])
const avatarErrors = ref<Record<string, boolean>>({})
const userStore = useUserStore()

const SHARE_TITLE = '翔云文武·练功打卡广场'
const SHARE_TEXT = '一起坚持练功，记录每一次成长'

// 首次 onShow 由 z-paging 自动加载，后续返回页面时刷新最新记录
let isFirstShow = true

onLoad(() => {
  setPageShareConfig({
    onShareAppMessage: () => ({
      title: SHARE_TITLE,
      desc: SHARE_TEXT,
      path: '/pages/practice/records',
    }),
    onShareTimeline: () => ({
      title: SHARE_TITLE,
      query: '',
    }),
  })

  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    toLoginPage()
  }
})

// #ifdef H5
// H5 无原生分享菜单：优先调起系统分享面板，不支持时复制链接兜底
async function handleH5Share() {
  const shareUrl = window.location.href
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: shareUrl })
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
// #endif

onShow(() => {
  if (isFirstShow) {
    isFirstShow = false
    return
  }
  paging.value?.reload()
})

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getPracticeRecordsAPI({ page: pageNo, pageSize })
    paging.value?.completeByTotal(res.checkIns, res.total)
  }
  catch (e) {
    console.error('加载全员打卡记录失败', e)
    paging.value?.complete(false)
  }
}

function onAvatarError(recordId: string) {
  avatarErrors.value[recordId] = true
}

function navigateToChallenge(id: string) {
  uni.navigateTo({ url: `/pages/practice/challenge-detail?id=${id}` })
}

function navigateToPracticeHome() {
  uni.navigateTo({ url: '/pages/practice/index' })
}

function previewImage(item: PracticeRecordItem, url: string) {
  const urls = item.medias.filter(m => m.type === 'IMAGE').map(m => m.url)
  uni.previewImage({ urls, current: url })
}

function hasUpdate(item: PracticeRecordItem): boolean {
  return item.updatedAt !== item.createdAt
}
</script>

<template>
  <view class="min-h-screen bg-[#f4efe4] font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
    <z-paging
      ref="paging"
      v-model="checkIns"
      :default-page-size="10"
      empty-view-text="暂无打卡记录"
      @query="queryList"
    >
      <view
        class="pointer-events-none absolute inset-0 opacity-10"
        :style="{ backgroundImage: `url('${RICE_PAPER_IMAGE}')` }"
      />

      <view class="relative z-8 px-4 pb-8 pt-5">
        <view class="mb-5 flex items-center justify-between">
          <text class="block text-2xl text-[#1a1a1a] font-bold tracking-widest">练功打卡广场</text>
          <view class="flex shrink-0 items-center gap-4">
            <!-- #ifdef H5 -->
            <text class="text-sm text-[#a33327] font-medium" @click="handleH5Share">分享</text>
            <!-- #endif -->
            <text class="text-sm text-[#a33327] font-medium underline underline-offset-4" @click="navigateToPracticeHome">去打卡</text>
          </view>
        </view>

        <view class="space-y-4">
          <view
            v-for="item in checkIns"
            :key="item.id"
            class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm"
          >
            <view class="mb-4 flex items-center gap-3">
              <image
                v-if="item.user.image && !avatarErrors[item.id]"
                :src="item.user.image"
                mode="aspectFill"
                class="h-11 w-11 shrink-0 border border-[#e8e4dc] rounded-lg"
                @error="onAvatarError(item.id)"
              />
              <view
                v-else
                class="h-11 w-11 flex shrink-0 items-center justify-center rounded-lg bg-[#a33327] text-lg text-white font-bold"
              >
                {{ item.user.name.slice(0, 1) }}
              </view>
              <view class="min-w-0">
                <text class="block text-base text-[#1a1a1a] font-bold">{{ item.user.name }}</text>
                <text class="mt-0.5 block text-xs text-[#888]">{{ formatTime(item.createdAt) }} 提交</text>
              </view>
            </view>

            <view class="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-t border-[#eee9df] py-3">
              <view>
                <text class="block text-2xs text-[#999]">习练功法</text>
                <text class="mt-0.5 block text-sm text-[#333] font-medium">{{ practiceTypeLabel(item.practiceType) }}</text>
              </view>
              <view>
                <text class="block text-2xs text-[#999]">习练时长</text>
                <text class="mt-0.5 block text-sm text-[#333] font-medium">{{ item.durationMinutes }} 分钟</text>
              </view>
              <view>
                <text class="block text-2xs text-[#999]">关联挑战</text>
                <!-- 关联挑战名称,点击跳转挑战详情页 -->
                <view class="mt-0.5 flex flex-wrap items-center text-sm font-medium">
                  <template v-if="item.challenges.length">
                    <template v-for="(challenge, challengeIndex) in item.challenges" :key="challenge.id">
                      <text class="text-[#a33327] underline underline-offset-2" @click="navigateToChallenge(challenge.id)">{{ challenge.title }}</text>
                      <text v-if="challengeIndex < item.challenges.length - 1" class="text-[#333]">、</text>
                    </template>
                  </template>
                  <text v-else class="text-[#333]">未关联</text>
                </view>
              </view>
              <view>
                <text class="block text-2xs text-[#999]">获得积分</text>
                <text class="mt-0.5 block text-sm text-[#a33327] font-medium">+{{ item.points }} 积分</text>
              </view>
            </view>

            <view v-if="item.notes" class="py-1">
              <text class="block whitespace-pre-wrap break-words text-sm text-[#333] leading-relaxed">{{ item.notes }}</text>
            </view>

            <view v-if="item.medias?.length" class="pb-3">
              <text class="mb-2 block text-sm text-[#555] font-medium">照片/视频</text>
              <view class="grid grid-cols-3 gap-2">
                <template v-for="(media, mediaIndex) in item.medias" :key="`${item.id}-image-${mediaIndex}`">
                  <view
                    v-if="media.type === 'IMAGE'"
                    class="aspect-square overflow-hidden rounded-md bg-[#efece4]"
                    @click="previewImage(item, media.url)"
                  >
                    <image :src="media.url" mode="aspectFill" class="h-full w-full" />
                  </view>
                </template>
              </view>
              <template v-for="(media, mediaIndex) in item.medias" :key="`${item.id}-video-${mediaIndex}`">
                <VideoPlayer
                  v-if="media.type === 'VIDEO'"
                  class="mt-3"
                  :src="media.url"
                  :poster="buildVideoCoverUrl(media.url)"
                  :video-id="`record-video-${item.id}-${mediaIndex}`"
                  :title="practiceTypeLabel(item.practiceType)"
                  :autoplay="false"
                />
              </template>
            </view>

            <view class="border-t border-[#eee9df] pt-3 space-y-2">
              <view v-if="item.location" class="flex items-start gap-1.5 text-xs text-[#666]">
                <text class="i-carbon-location mt-0.5 shrink-0 text-[#a33327]" />
                <text>
                  {{ item.location.address || `已记录位置（${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}）` }}
                </text>
              </view>
              <!-- <view v-if="hasUpdate(item)" class="flex items-center gap-1.5 text-xs text-[#999]">
                <text class="i-carbon-renew shrink-0" />
                <text>更新于 {{ formatTime(item.updatedAt) }}</text>
              </view> -->
            </view>
          </view>
        </view>
      </view>
    </z-paging>
  </view>
</template>
