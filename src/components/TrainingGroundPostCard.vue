<script setup lang="ts">
import type { TrainingGroundPost } from '@/api/training-ground'
import { computed } from 'vue'
import { useUserListStore } from '@/store/userList'
import { getRelativeTime } from '@/utils/dateUtil'

const props = withDefaults(
  defineProps<{
    post: TrainingGroundPost
    showFullContent?: boolean
  }>(),
  {
    showFullContent: false,
  },
)

const emit = defineEmits<{
  (e: 'like', postId: string): void
  (e: 'user-click', userId: string): void
  (e: 'card-click', postId: string): void
}>()

const userListStore = useUserListStore()

const cachedUser = computed(() => {
  return userListStore.getCachedUser(props.post.userId)
})

const userName = computed(() => {
  return cachedUser.value?.name || props.post.user?.name
})

const userImage = computed(() => {
  return cachedUser.value?.image
})

function getVideoCoverUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}ci-process=snapshot&time=1&format=jpg&width=400`
}

function getCompressedImageUrl(url: string, maxWidth: number = 700): string {
  if (!url)
    return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}imageMogr2/thumbnail/${maxWidth}x`
}

function handleLike() {
  emit('like', props.post.id)
}

function handleUserClick() {
  emit('user-click', props.post.userId)
}

function handleCardClick() {
  emit('card-click', props.post.id)
}

function handleImagePreview() {
  uni.previewImage({
    urls: [props.post.url],
    current: props.post.url,
  })
}

function handleVideoPreview() {
  uni.navigateTo({
    url: `/pages/tools/fullscreen-player?src=${encodeURIComponent(props.post.url)}&poster=${encodeURIComponent(getVideoCoverUrl(props.post.url))}&title=${encodeURIComponent(props.post.description || '')}`,
  })
}
</script>

<template>
  <view
    class="mb-4 overflow-hidden rounded-lg bg-white shadow-sm"
    @click="handleCardClick"
  >
    <!-- 图片帖子 -->
    <view v-if="post.type === 'IMAGE'" class="relative w-full bg-gray-100 text-center" @click.stop="handleImagePreview">
      <wd-img
        :src="getCompressedImageUrl(post.url, 700)"
        mode="heightFix"
        class="h-60"
      />
    </view>

    <!-- 视频帖子：封面 + 播放图标 -->
    <view v-else-if="post.type === 'VIDEO'" class="relative w-full bg-gray-100 text-center" @click.stop="handleVideoPreview">
      <wd-img
        :src="getVideoCoverUrl(post.url)"
        mode="heightFix"
        class="h-60"
      />
      <!-- 居中播放图标 -->
      <view
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <view
          class="h-14 w-14 flex items-center justify-center rounded-full bg-black/50"
        >
          <wd-icon name="play" size="28px" color="#fff" />
        </view>
      </view>
    </view>

    <!-- 描述文字 -->
    <view v-if="post.description" class="px-4 pt-3">
      <text
        class="text-sm text-gray-800 leading-relaxed"
        :class="showFullContent ? '' : 'line-clamp-3'"
      >
        {{ post.description }}
      </text>
    </view>

    <!-- 底部信息栏 -->
    <view class="flex items-center justify-between px-4 py-3">
      <!-- 创作者信息 -->
      <view class="flex items-center" @click.stop="handleUserClick">
        <wd-img
          v-if="userImage"
          :src="userImage"
          mode="aspectFill"
          class="avatar-img mr-2 h-8 w-8 rounded-full"
        />
        <view
          v-else
          class="mr-2 h-8 w-8 flex items-center justify-center rounded-full text-xs text-white"
          style="background-color: #a33327"
        >
          {{ (userName || '匿').charAt(0) }}
        </view>
        <view>
          <text class="text-sm text-gray-900 font-medium">
            {{ userName || '匿名用户' }}
          </text>
          <text class="ml-2 text-xs text-gray-400">
            {{ getRelativeTime(post.createdAt) }}
          </text>
        </view>
      </view>

      <!-- 右侧操作 -->
      <view class="flex items-center gap-3">
        <!-- 评论数 -->
        <view class="flex items-center gap-1">
          <text class="i-carbon-chat text-base text-gray-500" />
          <text class="text-xs text-gray-500">
            {{ post.commentCount || 0 }}
          </text>
        </view>

        <!-- 点赞按钮 -->
        <view class="flex items-center gap-1" @click.stop="handleLike">
          <text
            class="text-lg"
            :class="post.isLiked ? 'i-carbon-favorite-filled' : 'i-carbon-favorite'"
            :style="post.isLiked ? { color: '#a33327' } : { color: '#999' }"
          />
          <text
            class="text-xs"
            :style="post.isLiked ? { color: '#a33327' } : { color: '#999' }"
          >
            {{ post.likeCount || 0 }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
:deep(.wd-img__image) {
  width: 100%;
  height: 100%;
}
.avatar-img :deep(.wd-img__image) {
  border-radius: 9999px;
}
</style>
