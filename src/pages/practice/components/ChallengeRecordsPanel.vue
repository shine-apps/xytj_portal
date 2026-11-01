<script setup lang="ts">
import type { PracticeRecordItem } from '@/service/practice'
import { ref } from 'vue'
import useZPaging from 'z-paging/components/z-paging/js/hooks/useZPaging.js'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { getPracticeRecordsAPI, practiceTypeLabel } from '@/service/practice'
import { useUserStore } from '@/store/user'
import { buildVideoCoverUrl } from '@/utils/cos'
import { formatTime } from '@/utils/dateUtil'

const props = defineProps<{
  challengeId: string
  active: boolean
}>()

const userStore = useUserStore()
const paging = ref<any>(null)
const checkIns = ref<PracticeRecordItem[]>([])
const avatarErrors = ref<Record<string, boolean>>({})

useZPaging(paging)

async function queryList(pageNo: number, pageSize: number) {
  if (!props.challengeId || !userStore.hasValidLogin) {
    paging.value?.completeByTotal([], 0)
    return
  }

  try {
    const res = await getPracticeRecordsAPI({
      page: pageNo,
      pageSize,
      challengeId: props.challengeId,
    })
    paging.value?.completeByTotal(res.checkIns, res.total)
  }
  catch (e) {
    console.error('加载挑战打卡记录失败', e)
    paging.value?.complete(false)
  }
}

function reload() {
  paging.value?.reload()
}

function onAvatarError(recordId: string) {
  avatarErrors.value[recordId] = true
}

function navigateToChallenge(id: string) {
  uni.navigateTo({ url: `/pages/practice/challenge-detail?id=${id}` })
}

function navigateToCheckIn(id: string) {
  uni.navigateTo({ url: `/pages/practice/checkin-detail?id=${id}` })
}

function getCheckInShareTitle(item: PracticeRecordItem) {
  const [, month, day] = item.checkInDate.slice(0, 10).split('-').map(Number)
  return `${item.user.name} ${month}月${day}号的练功打卡`
}

function getCheckInShareImage(item: PracticeRecordItem) {
  return item.medias.find(media => media.type === 'IMAGE')?.url || ''
}

function previewImage(item: PracticeRecordItem, url: string) {
  const urls = item.medias.filter(m => m.type === 'IMAGE').map(m => m.url)
  uni.previewImage({ urls, current: url })
}

defineExpose({ reload })
</script>

<template>
  <z-paging
    ref="paging"
    v-model="checkIns"
    use-page-scroll
    class="min-h-300px"
    :default-page-size="10"
    :loading-more-enabled="active"
    :refresher-enabled="active"
    :empty-view-text="userStore.hasValidLogin ? '暂无关联打卡记录' : '所有用户的打卡信息只有登录才能查看'"
    @query="queryList"
  >
    <view class="p-3 space-y-4">
      <view
        v-for="item in checkIns"
        :key="item.id"
        class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm active:opacity-70"
        @click="navigateToCheckIn(item.id)"
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
          <view class="ml-auto flex shrink-0 items-center gap-3">
            <!-- #ifdef MP-WEIXIN -->
            <button
              open-type="share"
              class="m-0 flex items-center gap-1 border-0 bg-transparent p-0 text-xs text-[#a33327] leading-normal after:border-0"
              :data-check-in-id="item.id"
              :data-share-title="getCheckInShareTitle(item)"
              :data-share-image="getCheckInShareImage(item)"
              @click.stop
            >
              <text class="i-carbon-share text-sm" />
              <text>分享</text>
            </button>
            <!-- #endif -->
            <text class="i-carbon-chevron-right text-base text-[#b8a880]" />
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
            <view class="mt-0.5 flex flex-wrap items-center text-sm font-medium">
              <template v-if="item.challenges.length">
                <view v-for="(challenge, challengeIndex) in item.challenges" :key="challenge.id">
                  <text class="text-[#a33327] underline underline-offset-2" @click.stop="navigateToChallenge(challenge.id)">{{ challenge.title }}</text>
                  <text v-if="challengeIndex < item.challenges.length - 1" class="text-[#333]">、</text>
                </view>
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
                @click.stop="previewImage(item, media.url)"
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
              :video-id="`challenge-record-video-${item.id}-${mediaIndex}`"
              :title="practiceTypeLabel(item.practiceType)"
              :autoplay="false"
              @click.stop
            />
          </template>
        </view>

        <view v-if="item.location" class="border-t border-[#eee9df] pt-3">
          <view class="flex items-start gap-1.5 text-xs text-[#666]">
            <text class="i-carbon-location mt-0.5 shrink-0 text-[#a33327]" />
            <text>
              {{ item.location.address || `已记录位置（${item.location.latitude.toFixed(4)}, ${item.location.longitude.toFixed(4)}）` }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </z-paging>
</template>
