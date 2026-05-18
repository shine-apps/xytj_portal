<script setup lang="ts">
import type { TrainingGroundPost } from '@/api/training-ground'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getTrainingGroundPosts, toggleLike } from '@/api/training-ground'
import TrainingGroundPostCard from '@/components/TrainingGroundPostCard.vue'
import { useUserStore } from '@/store/user'
import { useUserListStore } from '@/store/userList'

definePage({
  style: {
    navigationBarTitleText: '用户帖子',
  },
})

const userStore = useUserStore()
const userListStore = useUserListStore()

const paging = ref<any>(null)
const posts = ref<TrainingGroundPost[]>([])
const targetUserId = ref('')
const targetUserName = ref('')

onLoad((options) => {
  if (options?.userId) {
    targetUserId.value = options.userId
  }
})

// 分页加载
async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getTrainingGroundPosts({
      page: pageNo,
      limit: pageSize,
      userId: targetUserId.value,
    })
    paging.value?.complete(res.posts)
    posts.value = pageNo === 1
      ? res.posts
      : [...posts.value, ...res.posts]

    const userIds = [...new Set(res.posts.map(p => p.userId))]
    if (userIds.length > 0) {
      await userListStore.fetchUserList(userIds)
    }

    if (pageNo === 1 && res.posts.length > 0) {
      const cachedName = userListStore.getCachedUser(res.posts[0].userId)?.name || res.posts[0].user?.name || ''
      targetUserName.value = cachedName
      uni.setNavigationBarTitle({
        title: cachedName
          ? `${cachedName}的练功动态`
          : '用户帖子',
      })
    }
  }
  catch (e) {
    console.error('加载失败', e)
    paging.value?.complete(false)
  }
}

// 点赞
async function handleLike(postId: string) {
  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    const res = await toggleLike(postId)
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.isLiked = res.liked
      post.likeCount += res.liked ? 1 : -1
    }
  }
  catch (e) {
    console.error('点赞失败', e)
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}

// 点击卡片 - 跳转详情
function handleCardClick(postId: string) {
  uni.navigateTo({
    url: `/pages/training-ground/detail?id=${postId}`,
  })
}
</script>

<template>
  <view class="h-full bg-gray-50">
    <z-paging
      ref="paging"
      v-model="posts"
      @query="queryList"
    >
      <view class="px-4 pt-4">
        <!-- 空状态 -->
        <view
          v-if="posts.length === 0"
          class="flex flex-col items-center justify-center py-20"
        >
          <text class="i-carbon-image-search mb-3 text-5xl text-gray-300" />
          <text class="text-base text-gray-400">暂未发布任何动态</text>
        </view>

        <!-- 帖子卡片列表 -->
        <TrainingGroundPostCard
          v-for="post in posts"
          :key="post.id"
          :post="post"
          @like="handleLike"
          @card-click="handleCardClick"
        />
      </view>
    </z-paging>
  </view>
</template>
