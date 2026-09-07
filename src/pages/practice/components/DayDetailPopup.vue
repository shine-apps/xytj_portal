<script setup lang="ts">
import type { PracticeCheckIn, PracticeCheckInMedia } from '@/service/practice'
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { createTrainingGroundPost } from '@/api/training-ground'
import { deleteCheckInAPI, practiceTypeLabel } from '@/service/practice'

const props = defineProps<{
  visible: boolean
  checkIn: PracticeCheckIn | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'deleted', checkIn: PracticeCheckIn): void
  (e: 'edit', checkIn: PracticeCheckIn): void
}>()

const deleting = ref(false)
const sharing = ref(false)

const dateTitle = computed(() => {
  if (!props.checkIn) {
    return ''
  }
  return dayjs(props.checkIn.checkInDate.slice(0, 10)).format('YYYY年M月D日')
})

const isToday = computed(() => {
  if (!props.checkIn) {
    return false
  }
  return props.checkIn.checkInDate.slice(0, 10) === dayjs().format('YYYY-MM-DD')
})

const hasMedia = computed(() => (props.checkIn?.medias?.length ?? 0) > 0)

function close() {
  emit('update:visible', false)
}

function videoCover(url: string) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}ci-process=snapshot&time=1&format=jpg&width=400`
}

function onMediaClick(media: PracticeCheckInMedia, index: number) {
  if (!props.checkIn) {
    return
  }
  if (media.type === 'IMAGE') {
    const urls = props.checkIn.medias.filter(m => m.type === 'IMAGE').map(m => m.url)
    uni.previewImage({ urls, current: media.url })
  }
  else {
    uni.navigateTo({
      url: `/pages/tools/fullscreen-player?src=${encodeURIComponent(media.url)}&poster=${encodeURIComponent(videoCover(media.url))}`,
    })
  }
}

/** 删除本次打卡（确认后调用 deleteCheckInAPI，由父页面刷新数据） */
function handleDelete() {
  const checkIn = props.checkIn
  if (!checkIn || deleting.value) {
    return
  }
  uni.showModal({
    title: '删除打卡',
    content: `确定删除 ${dateTitle.value} 的打卡记录吗？对应积分将被扣除。`,
    success: async (res) => {
      if (!res.confirm) {
        return
      }
      deleting.value = true
      try {
        await deleteCheckInAPI(checkIn.checkInDate.slice(0, 10))
        uni.showToast({ title: '已删除', icon: 'success' })
        emit('deleted', checkIn)
        close()
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

/** 分享到练功场：以当日首个媒体作为帖子内容，无媒体时不可分享 */
async function handleShare() {
  const checkIn = props.checkIn
  if (!checkIn || sharing.value) {
    return
  }
  const media = checkIn.medias?.[0]
  if (!media) {
    uni.showToast({ title: '需包含照片或视频才能分享', icon: 'none' })
    return
  }
  sharing.value = true
  try {
    await createTrainingGroundPost({
      type: media.type,
      url: media.url,
      description: `练拳打卡 · ${practiceTypeLabel(checkIn.practiceType)} · ${checkIn.durationMinutes}分钟`,
      source: {
        type: 'practice-checkin',
        checkInId: checkIn.id,
        url: '/pages/practice/index',
        title: '练拳打卡',
      },
    })
    uni.showToast({ title: '已分享到练功场', icon: 'success' })
  }
  catch (e) {
    console.error('分享到练功场失败', e)
  }
  finally {
    sharing.value = false
  }
}

function handleEdit() {
  if (props.checkIn) {
    emit('edit', props.checkIn)
    close()
  }
}
</script>

<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    custom-style="height: 72vh; border-radius: 16px 16px 0 0; z-index: 1100;"
    @close="close"
  >
    <view v-if="checkIn" class="h-full flex flex-col">
      <!-- 标题栏 -->
      <view class="flex items-center justify-between border-b border-[#eee9df] px-4 py-3">
        <text class="text-lg text-[#1a1a1a] font-bold">{{ isToday ? '今日打卡' : dateTitle }}</text>
        <wd-button type="icon" icon="close" size="small" @click="close" />
      </view>

      <scroll-view scroll-y class="flex-1 px-4 py-4">
        <!-- 概要 -->
        <view class="mb-4 flex items-center justify-between border border-[#e8e4dc] rounded-lg bg-[#faf8f3] px-4 py-3">
          <text class="text-sm text-[#1a1a1a] font-medium">{{ practiceTypeLabel(checkIn.practiceType) }}</text>
          <view class="flex items-center gap-3 text-sm text-[#555]">
            <view class="flex items-center gap-1">
              <text class="i-carbon-time" />
              <text>{{ checkIn.durationMinutes }} 分钟</text>
            </view>
            <text class="text-[#a33327] font-medium">+{{ checkIn.points }} 积分</text>
          </view>
        </view>

        <!-- 笔记 -->
        <view v-if="checkIn.notes" class="mb-4">
          <text class="mb-1 block text-sm text-[#555] font-medium">心得笔记</text>
          <text class="block text-sm text-[#333] leading-relaxed">{{ checkIn.notes }}</text>
        </view>

        <!-- 媒体 -->
        <view v-if="hasMedia" class="mb-4">
          <text class="mb-2 block text-sm text-[#555] font-medium">照片/视频</text>
          <view class="grid grid-cols-3 gap-2">
            <view
              v-for="(media, index) in checkIn.medias"
              :key="index"
              class="relative aspect-square overflow-hidden rounded-md bg-[#efece4]"
              @click="onMediaClick(media, index)"
            >
              <image
                v-if="media.type === 'IMAGE'"
                :src="media.url"
                mode="aspectFill"
                class="h-full w-full"
              />
              <template v-else>
                <image :src="videoCover(media.url)" mode="aspectFill" class="h-full w-full" />
                <view class="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <view class="h-8 w-8 flex items-center justify-center rounded-full bg-black/50">
                    <text class="i-carbon-play-filled-alt text-sm text-white" />
                  </view>
                </view>
              </template>
            </view>
          </view>
        </view>

        <!-- 位置 -->
        <view v-if="checkIn.location" class="mb-2 flex items-center gap-1">
          <text class="i-carbon-location text-sm text-[#a33327]" />
          <text class="text-xs text-[#666]">
            {{ checkIn.location.address || `已记录位置（${checkIn.location.latitude.toFixed(4)}, ${checkIn.location.longitude.toFixed(4)}）` }}
          </text>
        </view>
      </scroll-view>

      <!-- 操作区 -->
      <view class="border-t border-[#eee9df] px-4 py-3 space-y-2" style="padding-bottom: calc(12px + env(safe-area-inset-bottom))">
        <view class="flex gap-3">
          <wd-button
            class="flex-1"
            plain
            :loading="sharing"
            :disabled="!hasMedia"
            custom-style="background-color: #fffdf9; color: #a33327; border-color: #a33327;"
            @click="handleShare"
          >
            <view class="flex items-center justify-center gap-1">
              <text class="i-carbon-share" />
              <text>分享到练功场</text>
            </view>
          </wd-button>
          <wd-button
            class="flex-1"
            plain
            :loading="deleting"
            custom-style="background-color: #fffdf9; color: #999; border-color: #ddd;"
            @click="handleDelete"
          >
            <view class="flex items-center justify-center gap-1">
              <text class="i-carbon-trash-can" />
              <text>删除打卡</text>
            </view>
          </wd-button>
        </view>
        <text v-if="!hasMedia" class="block text-center text-2xs text-[#999]">需包含照片或视频才能分享到练功场</text>
        <wd-button
          v-if="isToday"

          plain block
          custom-style="background-color: #fffdf9; color: #555; border-color: #e8e4dc;"
          @click="handleEdit"
        >
          <view class="flex items-center justify-center gap-1">
            <text class="i-carbon-edit" />
            <text>修改今日打卡</text>
          </view>
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>
