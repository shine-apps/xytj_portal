<script setup lang="ts">
import type { TrainingGroundMediaType, TrainingGroundPost } from '@/api/training-ground'
import { ref } from 'vue'
import { getTrainingGroundPosts, toggleLike } from '@/api/training-ground'
import TrainingGroundPostCard from '@/components/TrainingGroundPostCard.vue'
import TrainingGroundPublish from '@/components/TrainingGroundPublish.vue'
import { useSettingsStore } from '@/store/settings'
import { useUserStore } from '@/store/user'
import { useUserListStore } from '@/store/userList'

definePage({
  style: {
    navigationBarTitleText: '练功场',
  },
})

const userStore = useUserStore()
const userListStore = useUserListStore()
const settingsStore = useSettingsStore()

const paging = ref<any>(null)
const posts = ref<TrainingGroundPost[]>([])
const showPublish = ref(false)
const preselectedFilePath = ref('')
const preselectedMediaType = ref<TrainingGroundMediaType>('IMAGE')

// 分页加载
async function queryList(pageNo: number, pageSize: number) {
  try {
    await settingsStore.fetchSettings()
    if (!settingsStore.showVideo) {
      uni.switchTab({
        url: '/pages/index/index',
      })
      return
    }

    const res = await getTrainingGroundPosts({
      page: pageNo,
      limit: pageSize,
    })

    const filteredPosts = res.posts
    paging.value?.complete(filteredPosts)
    posts.value = pageNo === 1
      ? filteredPosts
      : [...posts.value, ...filteredPosts]

    const userIds = Array.from(new Set(filteredPosts.map(p => p.userId)))
    if (userIds.length > 0) {
      await userListStore.fetchUserList(userIds)
    }
  }
  catch (e) {
    console.error('加载失败', e)
    paging.value?.complete(false)
  }
}

// 点赞/取消点赞
async function handleLike(postId: string) {
  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    const res = await toggleLike(postId)
    // 更新本地状态
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

// 点击用户
function handleUserClick(userId: string) {
  uni.navigateTo({
    url: `/pages/training-ground/user-posts?userId=${userId}`,
  })
}

// 点击卡片 - 跳转详情页
function handleCardClick(postId: string) {
  uni.navigateTo({
    url: `/pages/training-ground/detail?id=${postId}`,
  })
}

// 平台差异化：发布按钮点击处理
function handlePublishClick() {
  if (!userStore.isAdmin) {
    uni.showToast({ title: '仅管理员可发布', icon: 'none' })
    return
  }

  // #ifdef MP-WEIXIN
  uni.showActionSheet({
    itemList: ['从微信消息中选择', '从相册中选择'],
    success: (res) => {
      if (res.tapIndex === 0) {
        selectFromWechatMessage()
      }
      else if (res.tapIndex === 1) {
        selectFromAlbum()
      }
    },
    fail: (err) => {
      console.error('取消选择', err)
    },
  })
  // #endif

  // #ifndef MP-WEIXIN
  uni.showActionSheet({
    itemList: ['图片', '视频'],
    success: (res) => {
      if (res.tapIndex === 0) {
        selectImage()
      }
      else if (res.tapIndex === 1) {
        selectVideo()
      }
    },
    fail: (err) => {
      console.error('取消选择', err)
    },
  })
  // #endif
}

// #ifdef MP-WEIXIN
// 从微信消息中选择
async function selectFromWechatMessage() {
  try {
    const res: any = await uni.chooseMessageFile({
      count: 1,
      type: 'all',
    })
    const file = res.tempFiles[0]
    if (file.type === 'image') {
      preselectedMediaType.value = 'IMAGE'
    }
    else if (file.type === 'video') {
      preselectedMediaType.value = 'VIDEO'
    }
    else {
      uni.showToast({ title: '请选择图片或视频文件', icon: 'none' })
      return
    }
    preselectedFilePath.value = file.path
    showPublish.value = true
  }
  catch (e: any) {
    if (!e.errMsg?.includes('cancel')) {
      console.error('选择文件失败', e)
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    }
  }
}

// 从相册中选择
async function selectFromAlbum() {
  try {
    const res: any = await uni.chooseMedia({
      count: 1,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
    })
    const file = res.tempFiles[0]
    preselectedMediaType.value = file.fileType === 'image' ? 'IMAGE' : 'VIDEO'

    if (file.fileType === 'image' && file.size > 10 * 1024 * 1024) {
      uni.showToast({ title: '图片大小不能超过10MB', icon: 'none' })
      return
    }
    if (file.fileType === 'video' && file.size > 100 * 1024 * 1024) {
      uni.showToast({ title: '视频大小不能超过100MB', icon: 'none' })
      return
    }

    preselectedFilePath.value = file.tempFilePath
    showPublish.value = true
  }
  catch (e: any) {
    if (!e.errMsg?.includes('cancel')) {
      console.error('选择文件失败', e)
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    }
  }
}
// #endif

// #ifndef MP-WEIXIN
// 选择图片
async function selectImage() {
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    const tempFilePath = res.tempFilePaths[0]
    const fileInfo = await uni.getFileInfo({ filePath: tempFilePath })
    if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
      uni.showToast({ title: '图片大小不能超过10MB', icon: 'none' })
      return
    }
    preselectedMediaType.value = 'IMAGE'
    preselectedFilePath.value = tempFilePath
    showPublish.value = true
  }
  catch (e: any) {
    if (!e.errMsg?.includes('cancel')) {
      console.error('选择图片失败', e)
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  }
}

// 选择视频
async function selectVideo() {
  try {
    const videoRes = await uni.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      compressed: true,
    })
    if (videoRes.size && videoRes.size > 100 * 1024 * 1024) {
      uni.showToast({ title: '视频大小不能超过100MB', icon: 'none' })
      return
    }
    preselectedMediaType.value = 'VIDEO'
    preselectedFilePath.value = videoRes.tempFilePath
    showPublish.value = true
  }
  catch (e: any) {
    if (!e.errMsg?.includes('cancel')) {
      console.error('选择视频失败', e)
      uni.showToast({ title: '选择视频失败', icon: 'none' })
    }
  }
}
// #endif

// 清除预设文件
function clearPreselected() {
  preselectedFilePath.value = ''
  preselectedMediaType.value = 'IMAGE'
}

// 发布成功回调
function onPublished() {
  paging.value?.reload()
}
</script>

<template>
  <view class="h-full bg-gray-50">
    <!-- 帖子列表 -->
    <z-paging ref="paging" v-model="posts" @query="queryList">
      <template #empty>
        <!-- 空状态 -->
        <view v-if="posts.length === 0" class="flex flex-col items-center justify-center py-20">
          <text class="i-carbon-image-search mb-3 text-5xl text-gray-300" />
          <text class="mb-1 text-base text-gray-400">暂无练功动态</text>
          <text class="text-sm text-gray-300">快来发布第一条吧</text>
        </view>
      </template>
      <view class="px-4 pt-2">
        <!-- 帖子卡片列表 -->
        <TrainingGroundPostCard
          v-for="post in posts" :key="post.id" :post="post" @like="handleLike"
          @user-click="handleUserClick" @card-click="handleCardClick"
        />
      </view>
    </z-paging>

    <!-- 底部居中发布按钮 -->
    <view
      v-show="!showPublish && userStore.isAdmin"
      class="fixed bottom-20 left-1/2 z-50 flex items-center gap-1 rounded-full bg-[#a33327] px-6 py-3 text-sm text-white font-medium shadow-lg -translate-x-1/2 active:scale-95"
      @click="handlePublishClick"
    >
      <text class="i-carbon-add text-lg" />
      <text>发布</text>
    </view>

    <!-- 发布弹窗 -->
    <TrainingGroundPublish
      v-model:visible="showPublish" :preselected-file-path="preselectedFilePath"
      :preselected-media-type="preselectedMediaType" @published="onPublished" @clear-preselected="clearPreselected"
    />
  </view>
</template>
