<script setup lang="ts">
import type { IActivityAlbum } from '@/service/album'
import { ref } from 'vue'
import useUpload from '@/hooks/useUpload'
import { createAlbumAPI, deleteAlbumAPI, getActivityAlbumsAPI } from '@/service/album'
import { useUserStore } from '@/store/user'
import { formatTime } from '@/utils/dateUtil'

const props = defineProps<{
  activityId: string
  isActivityAdmin: boolean
}>()

const userStore = useUserStore()

const albums = ref<IActivityAlbum[]>([])
const loading = ref(false)
const refreshing = ref(false)
const showActionSheet = ref(false)
const currentPage = ref(1)
const pageSize = 10
const hasMore = ref(true)

// 视频播放器状态
const showVideoPlayer = ref(false)
const currentVideoUrl = ref('')

// 图片上传 hook
const imageUpload = useUpload({
  fileType: 'image',
  maxSize: 10 * 1024 * 1024, // 10MB
  success: (res) => {
    createAlbumRecord('IMAGE', res.url, res.size)
  },
  error: (err) => {
    console.error('图片上传失败', err)
    // 用户可能取消上传，不显示错误提示
    if (err)
      uni.showToast({ title: '上传失败', icon: 'none' })
  },
})

// 视频上传 hook
const videoUpload = useUpload({
  fileType: 'video',
  maxSize: 100 * 1024 * 1024, // 100MB
  success: (res) => {
    createAlbumRecord('VIDEO', res.url, res.size)
  },
  error: (err) => {
    console.error('视频上传失败', err)
    // 用户可能取消上传，不显示错误提示
    if (err)
      uni.showToast({ title: '上传失败', icon: 'none' })
  },
})

// 加载数据
async function loadData(page: number = 1, isRefresh: boolean = false) {
  if (!props.activityId)
    return

  if (isRefresh) {
    refreshing.value = true
  }
  else {
    loading.value = true
  }

  try {
    const res = await getActivityAlbumsAPI(props.activityId, { page, limit: pageSize })

    if (isRefresh || page === 1) {
      albums.value = res
    }
    else {
      albums.value = [...albums.value, ...res]
    }

    hasMore.value = res.length === pageSize
    currentPage.value = page
  }
  catch (e) {
    console.error('加载相册失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
    refreshing.value = false
  }
}

// 刷新数据
async function onRefresh() {
  await loadData(1, true)
}

// 加载更多
async function loadMore() {
  if (!hasMore.value || loading.value)
    return
  await loadData(currentPage.value + 1)
}

// 显示操作菜单
function showUploadOptions() {
  showActionSheet.value = true
}

watch(() => imageUpload.loading, (value) => {
  if (value) {
    uni.showLoading({
      title: '图片上传中',
      mask: true,
    })
  }
  else {
    uni.hideLoading()
  }
})

watch(() => videoUpload.loading, (value) => {
  if (value) {
    uni.showLoading({
      title: '视频上传中',
      mask: true,
    })
  }
  else {
    uni.hideLoading()
  }
})

// 选择图片
function chooseImage() {
  uni.showLoading({
    title: '图片上传中',
    mask: true,
  })
  imageUpload.run()
  showActionSheet.value = false
}

// 选择视频
function chooseVideo() {
  uni.showLoading({
    title: '视频上传中',
    mask: true,
  })
  videoUpload.run()
  uni.hideLoading()
  showActionSheet.value = false
}

// 创建相册记录
async function createAlbumRecord(type: 'IMAGE' | 'VIDEO', url: string, size: number) {
  if (!props.activityId)
    return

  try {
    await createAlbumAPI(props.activityId, { type, url, size })

    uni.showToast({ title: '上传成功', icon: 'success' })
    // 刷新列表
    onRefresh()
  }
  catch (e) {
    console.error('创建记录失败', e)
    uni.showToast({ title: '上传失败', icon: 'none' })
  }
}

// 预览媒体
function previewMedia(index: number) {
  const album = albums.value[index]
  if (!album)
    return

  if (album.type === 'IMAGE') {
    const urls = albums.value.filter(a => a.type === 'IMAGE').map(a => a.url)
    const imageIndex = albums.value.filter((a, i) => i <= index && a.type === 'IMAGE').length - 1
    uni.previewImage({
      urls,
      current: imageIndex,
    })
  }
  else if (album.type === 'VIDEO') {
    currentVideoUrl.value = album.url
    showVideoPlayer.value = true
  }
}

// 关闭视频播放器
function closeVideoPlayer() {
  showVideoPlayer.value = false
  currentVideoUrl.value = ''
}

// 删除相册
async function deleteAlbum(album: IActivityAlbum) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个文件吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteAlbumAPI(props.activityId, album.id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          onRefresh()
        }
        catch (e) {
          console.error('删除失败', e)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

// 判断是否可以删除
function canDelete(album: IActivityAlbum): boolean {
  // 管理员可以删除
  if (props.isActivityAdmin)
    return true
  const userId = userStore.userInfo?.userId
  if (!userId)
    return false
  // 上传者本人可以删除
  if (album.userId === userId)
    return true
  return false
}

// 格式化文件大小
function formatSize(size: number): string {
  if (size < 1024)
    return `${size}B`
  if (size < 1024 * 1024)
    return `${(size / 1024).toFixed(1)}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

const actionList = ref([
  { name: '拍照' },
  { name: '从相册选择' },
  { name: '选择视频' },
])

function onActionSelect({ item }: { item: { name: string } }) {
  if (item.name === '拍照' || item.name === '从相册选择') {
    chooseImage()
  }
  else if (item.name === '选择视频') {
    chooseVideo()
  }
}

// 初始化加载数据
onMounted(() => {
  console.log('ActivityAlbum mounted')
  loadData(1)
})
</script>

<template>
  <view class="h-full min-h-400px flex flex-col">
    <!-- 头部刷新栏 -->
    <view class="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
      <text class="text-sm text-gray-500">
        共 {{ albums.length }} 条记录
      </text>
      <wd-button
        type="icon"
        size="small"
        :loading="refreshing"
        @click="onRefresh"
      >
        <text class="i-carbon-renew text-lg" />
      </wd-button>
    </view>

    <!-- 相册列表 -->
    <scroll-view
      scroll-y
      class="flex-1 overflow-y-auto pb-20"
      @scrolltolower="loadMore"
    >
      <!-- 空状态 -->
      <view v-if="albums.length === 0 && !loading" class="flex flex-col items-center gap-3 py-15">
        <text class="i-carbon-camera text-4xl text-gray-300" />
        <text class="text-sm text-gray-500">暂无照片或视频</text>
        <text class="text-xs text-gray-400">点击底部按钮上传</text>
      </view>

      <!-- 列表内容 -->
      <view v-else class="flex flex-col gap-4 p-4">
        <view
          v-for="(album, index) in albums"
          :key="album.id"
          class="rounded-xl bg-white p-3 shadow-sm"
        >
          <!-- 用户信息 -->
          <view class="mb-2.5 flex items-center gap-2.5">
            <view class="h-9 w-9 flex items-center justify-center rounded-full bg-gray-100">
              <text class="text-sm text-gray-500 font-medium">
                {{ (album.user?.nickname || 'U').charAt(0) }}
              </text>
            </view>
            <view class="flex flex-1 flex-col gap-0.5">
              <text class="text-sm text-gray-800 font-medium">{{ album.user?.nickname || '未知用户' }}</text>
              <text class="text-xs text-gray-400">{{ formatTime(album.createdAt) }}</text>
            </view>
            <view v-if="canDelete(album)" class="p-2 opacity-70 active:opacity-100" @click="deleteAlbum(album)">
              <text class="i-carbon-trash-can text-gray-400" />
            </view>
          </view>

          <!-- 描述 -->
          <view v-if="album.description" class="mb-2.5 text-sm text-gray-800 leading-relaxed">
            <text>{{ album.description }}</text>
          </view>

          <!-- 媒体内容 -->
          <view class="relative overflow-hidden rounded-lg bg-gray-100" @click="previewMedia(index)">
            <!-- 图片 -->
            <image
              v-if="album.type === 'IMAGE'"
              :src="album.url"
              class="block w-full"
              mode="widthFix"
              lazy-load
            />
            <!-- 视频 -->
            <view v-else-if="album.type === 'VIDEO'" class="relative">
              <image
                :src="album.coverUrl || album.url"
                class="block w-full"
                mode="widthFix"
                lazy-load
              />
              <view class="absolute inset-0 flex items-center justify-center bg-black/30">
                <view class="h-15 w-15 flex items-center justify-center rounded-full bg-white/90">
                  <text class="i-carbon-play-filled-alt text-2xl text-white" />
                </view>
              </view>
              <view v-if="album.duration" class="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5">
                <text class="text-xs text-white">{{ Math.floor(album.duration / 60) }}:{{ String(album.duration % 60).padStart(2, '0') }}</text>
              </view>
            </view>
          </view>

          <!-- 文件信息 -->
          <view class="mt-2.5 flex justify-between border-t border-gray-100 pt-2.5">
            <text class="text-xs text-gray-500">{{ album.type === 'IMAGE' ? '照片' : '视频' }}</text>
            <text v-if="album.size > 0" class="text-xs text-gray-400">{{ formatSize(album.size) }}</text>
          </view>
        </view>

        <!-- 加载更多 -->
        <view class="flex items-center justify-center py-5">
          <wd-button
            v-if="hasMore && !loading"
            type="text"
            size="small"
            @click="loadMore"
          >
            查看更多
          </wd-button>
          <wd-loading v-if="loading" size="20px" />
          <text v-if="!hasMore && albums.length > 0" class="text-xs text-gray-400">
            没有更多了
          </text>
        </view>
      </view>
    </scroll-view>

    <!-- 上传按钮 -->
    <view
      v-if="isActivityAdmin"
      class="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 py-3" :style="{ paddingBottom: `calc(12px + env(safe-area-inset-bottom))` }"
    >
      <button
        class="h-11 w-full flex items-center justify-center gap-1.5 rounded-full border-none bg-#a33327 text-base text-white font-medium active:opacity-80 disabled:opacity-60"
        :disabled="imageUpload.loading.value || videoUpload.loading.value"
        @click="showUploadOptions"
      >
        <text class="i-carbon-add text-lg" />
        <text>{{ imageUpload.loading.value || videoUpload.loading.value ? '上传中...' : '上传照片/视频' }}</text>
      </button>
    </view>

    <!-- 操作菜单 -->
    <wd-action-sheet
      v-model="showActionSheet"
      :actions="actionList"
      title="选择上传方式"
      @select="onActionSelect"
    />

    <!-- 视频播放器弹窗 -->
    <wd-popup
      v-model="showVideoPlayer"
      position="center"
      :z-index="200"
      :close-on-click-modal="true"
      closable
      round
      hide-when-close
      custom-style="background: #000;"
      @after-leave="closeVideoPlayer"
    >
      <view class="relative w-85vw">
        <video
          v-if="currentVideoUrl"
          :src="currentVideoUrl"
          class="w-full rounded-lg"
          style="max-height: 70vh;"
          controls
          autoplay
          object-fit="contain"
        />
      </view>
    </wd-popup>
  </view>
</template>
