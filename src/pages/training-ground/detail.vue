<script setup lang="ts">
import type { TrainingGroundComment as CommentType, TrainingGroundPost } from '@/api/training-ground'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { deleteComment, deleteTrainingGroundPost, getComments, getTrainingGroundPost, toggleLike } from '@/api/training-ground'
import TrainingGroundComment from '@/components/TrainingGroundComment.vue'
import { useUserStore } from '@/store/user'
import { useUserListStore } from '@/store/userList'
import { getRelativeTime } from '@/utils/dateUtil'

definePage({
  style: {
    navigationBarTitleText: '详情',
  },
})

const userStore = useUserStore()
const userListStore = useUserListStore()

const postId = ref('')
const post = ref<TrainingGroundPost | null>(null)
const loading = ref(true)
const showComment = ref(false)
const comments = ref<CommentType[]>([])

const postUserImage = computed(() => {
  return post.value ? userListStore.getCachedUser(post.value.userId)?.image : undefined
})

const postUserName = computed(() => {
  if (!post.value)
    return ''
  return userListStore.getCachedUser(post.value.userId)?.name || post.value.user.name || ''
})

function getCommentUserImage(comment: CommentType) {
  return userListStore.getCachedUser(comment.userId)?.image
}

function getCommentUserName(comment: CommentType) {
  return userListStore.getCachedUser(comment.userId)?.name || comment.user.name || ''
}

onLoad((options) => {
  if (options?.id) {
    postId.value = options.id
    fetchPost()
  }
})

function getCompressedImageUrl(url: string, maxWidth: number = 700): string {
  if (!url)
    return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}imageMogr2/thumbnail/${maxWidth}x`
}

async function fetchPost() {
  loading.value = true
  try {
    const res = await getTrainingGroundPost(postId.value)
    post.value = res
    await userListStore.fetchUserList([res.userId])
    const cachedName = userListStore.getCachedUser(res.userId)?.name || res.user?.name
    if (cachedName) {
      uni.setNavigationBarTitle({
        title: `${cachedName}的帖子`,
      })
    }
    fetchComments()
  }
  catch (e) {
    console.error('加载帖子失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function fetchComments() {
  try {
    const res = await getComments(postId.value, {
      page: 1,
      limit: 100,
    })
    comments.value = res.comments
    const commentUserIds = res.comments.map(c => c.userId)
    if (commentUserIds.length > 0) {
      userListStore.fetchUserList(commentUserIds)
    }
  }
  catch (e) {
    console.error('加载评论失败', e)
  }
}

function getVideoCoverUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}ci-process=snapshot&time=1&format=jpg&width=400`
}

function playVideo() {
  if (!post.value)
    return
  uni.navigateTo({
    url: `/pages/tools/fullscreen-player?src=${encodeURIComponent(post.value.url)}&poster=${encodeURIComponent(getVideoCoverUrl(post.value.url))}&title=${encodeURIComponent(post.value.description || '')}`,
  })
}

async function handleLike() {
  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  if (!post.value)
    return

  try {
    const res = await toggleLike(post.value.id)
    post.value.isLiked = res.liked
    post.value.likeCount += res.liked ? 1 : -1
  }
  catch (e) {
    console.error('点赞失败', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function openComment() {
  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  showComment.value = true
}

function onCommentSubmitted() {
  fetchComments()
  if (post.value) {
    post.value.commentCount += 1
  }
}

function confirmDeleteComment(commentId: string) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条评论吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteComment(postId.value, commentId)
          uni.showToast({ title: '删除成功', icon: 'success' })
          comments.value = comments.value.filter(c => c.id !== commentId)
          if (post.value) {
            post.value.commentCount -= 1
          }
        }
        catch (e) {
          console.error('删除评论失败', e)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

async function handleDeletePost() {
  try {
    await deleteTrainingGroundPost(postId.value)
    uni.showToast({ title: '删除成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  }
  catch (e) {
    console.error('删除失败', e)
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

function canManagePost(): boolean {
  if (!userStore.hasValidLogin || !post.value)
    return false
  return post.value.userId === userStore.userInfo?.userId || userStore.isAdmin
}

function canDeleteComment(comment: CommentType): boolean {
  if (!userStore.hasValidLogin)
    return false
  return comment.userId === userStore.userInfo?.userId || userStore.isAdmin
}

function isLoggedIn(): boolean {
  return userStore.hasValidLogin
}
</script>

<template>
  <view class="min-h-screen bg-gray-50">
    <view v-if="loading" class="flex items-center justify-center py-20">
      <wd-loading />
    </view>

    <template v-else-if="post">
      <view class="bg-white px-4 py-2">
        <view v-if="post.type === 'IMAGE'" class="w-full text-center">
          <wd-img
            :src="getCompressedImageUrl(post.url)"
            :enable-preview="true"
            :preview-src="post.url"
            mode="heightFix"
            class="h-60"
          />
        </view>

        <view v-else-if="post.type === 'VIDEO'" class="relative w-full text-center" @click="playVideo">
          <wd-img
            :src="getVideoCoverUrl(post.url)"
            mode="widthFix"
            class="w-80%"
          />
          <view class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <view class="h-16 w-16 flex items-center justify-center rounded-full bg-black/50">
              <wd-icon name="play" size="32px" color="#fff" />
            </view>
          </view>
        </view>
      </view>

      <view class="mb-2 bg-white px-4 py-3">
        <view class="flex items-center justify-between">
          <view class="flex items-center">
            <wd-img
              v-if="postUserImage"
              :src="postUserImage"
              mode="aspectFill"
              class="avatar-img mr-3 h-10 w-10 rounded-full"
            />
            <view
              v-else
              class="mr-3 h-10 w-10 flex items-center justify-center rounded-full text-sm text-white"
              style="background-color: #a33327"
            >
              {{ (postUserName || '匿').charAt(0) }}
            </view>
            <view>
              <text class="block text-base text-gray-900 font-medium">
                {{ postUserName || '匿名用户' }}
              </text>
              <text class="text-xs text-gray-400">
                {{ getRelativeTime(post.createdAt) }}
              </text>
            </view>
          </view>

          <wd-button
            v-if="canManagePost()"
            type="warning"
            size="small"
            plain
            @click="handleDeletePost"
          >
            删除
          </wd-button>
        </view>
      </view>

      <view v-if="post.description" class="mb-2 bg-white px-4 py-3">
        <text class="text-sm text-gray-800 leading-relaxed">
          {{ post.description }}
        </text>
      </view>

      <view class="mb-2 flex items-center gap-6 bg-white px-4 py-3">
        <view class="flex items-center gap-1" @click="handleLike">
          <text
            class="text-xl"
            :class="post.isLiked ? 'i-carbon-favorite-filled' : 'i-carbon-favorite'"
            :style="post.isLiked ? { color: '#a33327' } : { color: '#999' }"
          />
          <text
            class="text-sm"
            :style="post.isLiked ? { color: '#a33327' } : { color: '#999' }"
          >
            {{ post.likeCount || 0 }}
          </text>
        </view>

        <view class="flex items-center gap-1" @click="openComment">
          <text class="i-carbon-chat text-xl text-gray-400" />
          <text class="text-sm text-gray-400">
            {{ post.commentCount || 0 }}
          </text>
        </view>
      </view>

      <view class="bg-white px-4 py-3">
        <view
          class="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2"
          @click="openComment"
        >
          <text class="text-sm text-gray-400">
            {{ isLoggedIn() ? '写下你的评论...' : '请登录后评论' }}
          </text>
        </view>
      </view>

      <view class="mt-2 bg-white">
        <view class="border-b border-gray-100 px-4 py-3">
          <text class="text-base text-gray-900 font-medium">评论</text>
          <text class="ml-2 text-sm text-gray-400">({{ post.commentCount || 0 }})</text>
        </view>

        <view class="px-4">
          <view
            v-if="comments.length === 0"
            class="flex flex-col items-center justify-center py-12"
          >
            <text class="i-carbon-chat mb-2 text-3xl text-gray-300" />
            <text class="text-sm text-gray-400">暂无评论，快来抢沙发吧</text>
          </view>

          <view
            v-for="comment in comments"
            :key="comment.id"
            class="border-b border-gray-50 py-3 last:border-0"
          >
            <view class="flex items-start justify-between">
              <view class="flex flex-1 items-start gap-2">
                <wd-img
                  v-if="getCommentUserImage(comment)"
                  :src="getCommentUserImage(comment)"
                  mode="aspectFill"
                  class="avatar-img mt-0.5 h-8 w-8 flex-shrink-0 rounded-full"
                />
                <view
                  v-else
                  class="mt-0.5 h-8 w-8 flex flex-shrink-0 items-center justify-center rounded-full text-xs text-white"
                  style="background-color: #a33327"
                >
                  {{ (getCommentUserName(comment) || '匿').charAt(0) }}
                </view>

                <view class="min-w-0 flex-1">
                  <view class="mb-1 flex items-center gap-2">
                    <text class="text-sm text-gray-900 font-medium">
                      {{ getCommentUserName(comment) || '匿名用户' }}
                    </text>
                    <text class="text-xs text-gray-400">
                      {{ getRelativeTime(comment.createdAt) }}
                    </text>
                  </view>

                  <text class="break-all text-sm text-gray-700 leading-relaxed">
                    {{ comment.content }}
                  </text>
                </view>
              </view>

              <wd-button
                v-if="canDeleteComment(comment)"
                type="icon"
                icon="delete"
                size="small"
                custom-class="border-none!"
                @click="confirmDeleteComment(comment.id)"
              />
            </view>
          </view>
        </view>
      </view>

      <view class="h-6" />
    </template>

    <TrainingGroundComment
      v-model:visible="showComment"
      :post-id="postId"
      @submitted="onCommentSubmitted"
    />
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
