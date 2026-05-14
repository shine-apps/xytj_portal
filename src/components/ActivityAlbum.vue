<script setup lang="ts">
import type { IActivityAlbum } from '@/service/album'
import { computed, ref } from 'vue'
import useZPaging from 'z-paging/components/z-paging/js/hooks/useZPaging.js'
import { createAlbumAPI, deleteAlbumAPI, getActivityAlbumsAPI, updateAlbumDescriptionAPI } from '@/service/album'
import { useUserStore } from '@/store/user'
import { uploadToCos } from '@/utils/cos'
import { formatTime } from '@/utils/dateUtil'
import VideoPlayer from './VideoPlayer.vue'

interface IPendingUpload {
  id: string
  tempFilePath: string
  previewUrl: string
  type: 'IMAGE' | 'VIDEO'
  size: number
  status: 'pending' | 'uploading' | 'success' | 'failed'
  progress: number
  error?: string
}

const props = defineProps<{
  activityId: string
  isActivityAdmin: boolean
}>()

const userStore = useUserStore()

const paging = ref<any>(null)
const albums = ref<IActivityAlbum[]>([])
const pendingUploads = ref<IPendingUpload[]>([])
const showActionSheet = ref(false)

// 视频播放器状态
const showVideoPlayer = ref(false)
const currentVideoUrl = ref('')

// 类似mixins，如果是页面滚动务必要写这一行，并传入当前ref绑定的paging，注意此处是paging，而非paging.value
useZPaging(paging)

// 加载数据 (z-paging query callback)
async function queryList(pageNo: number, pageSize: number) {
  if (!props.activityId) {
    paging.value?.complete([])
    return
  }

  try {
    const res = await getActivityAlbumsAPI(props.activityId, { page: pageNo, limit: pageSize })
    paging.value?.complete(res)
  }
  catch (e) {
    console.error('加载相册失败', e)
    paging.value?.complete([])
  }
}

// 刷新数据
function onRefresh() {
  paging.value?.reload()
}

// 显示操作菜单
function showUploadOptions() {
  showActionSheet.value = true
}

// 选择图片或视频
function chooseMedia() {
  showActionSheet.value = false
  uni.chooseMedia({
    count: 9,
    mediaType: ['image', 'video'],
    sourceType: ['album', 'camera'],
    maxDuration: 60,
    success: (res) => {
      for (const file of res.tempFiles) {
        const isVideo = file.fileType === 'video'
        const size = file.size
        const tempFilePath = file.tempFilePath

        const pendingItem: IPendingUpload = {
          id: tempFilePath,
          tempFilePath,
          previewUrl: tempFilePath,
          type: isVideo ? 'VIDEO' : 'IMAGE',
          size,
          status: 'pending',
          progress: 0,
        }
        pendingUploads.value.push(pendingItem)
        uploadAndCreateAlbum(pendingItem.id)
      }
    },
    fail: (err) => {
      console.error('选择媒体失败', err)
    },
  })
}

// 上传文件并创建相册记录
async function uploadAndCreateAlbum(pendingId: string) {
  const pendingItem = pendingUploads.value.find(p => p.id === pendingId)
  if (!pendingItem)
    return

  pendingItem.status = 'uploading'
  pendingItem.progress = 50

  try {
    const { url } = await uploadToCos(pendingItem.tempFilePath)
    pendingItem.progress = 80
    const album = await createAlbumRecord(pendingItem.type, url, pendingItem.size)
    if (album) {
      pendingItem.status = 'success'
      pendingItem.progress = 100
      pendingUploads.value = pendingUploads.value.filter(p => p.id !== pendingId)
      albums.value = [album, ...albums.value]
      uni.showToast({ title: '上传成功', icon: 'success' })
    }
    else {
      throw new Error('创建记录失败')
    }
  }
  catch (e) {
    console.error('上传失败', e)
    pendingItem.status = 'failed'
    pendingItem.error = '上传失败'
    uni.showToast({ title: '上传失败', icon: 'none' })
  }
}

// 重试上传
function retryUpload(pendingId: string) {
  const pendingItem = pendingUploads.value.find(p => p.id === pendingId)
  if (pendingItem) {
    pendingItem.status = 'pending'
    pendingItem.progress = 0
    pendingItem.error = undefined
    uploadAndCreateAlbum(pendingId)
  }
}

// 创建相册记录
async function createAlbumRecord(type: 'IMAGE' | 'VIDEO', url: string, size: number, description?: string): Promise<IActivityAlbum | null> {
  if (!props.activityId)
    return null

  let coverUrl = ''
  if (type === 'IMAGE') {
    coverUrl = `${url}?imageMogr2/thumbnail/512x`
  }
  else if (type === 'VIDEO') {
    coverUrl = `${url}?ci-process=snapshot&time=1`
  }
  try {
    const album = await createAlbumAPI(props.activityId, { type, url, size, description, coverUrl })
    return album
  }
  catch (e) {
    console.error('创建记录失败', e)
    uni.showToast({ title: '上传失败', icon: 'none' })
    return null
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

// 编辑描述
function editDescription(album: IActivityAlbum) {
  uni.showModal({
    title: '编辑描述',
    content: album.description || '',
    editable: true,
    placeholderText: '请输入描述',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateAlbumDescriptionAPI(props.activityId, album.id, res.content)
          uni.showToast({ title: '修改成功', icon: 'success' })
          album.description = res.content
        }
        catch (e) {
          console.error('修改描述失败', e)
          uni.showToast({ title: '修改失败', icon: 'none' })
        }
      }
    },
  })
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
  if (props.isActivityAdmin)
    return true
  const userId = userStore.userInfo?.userId
  if (!userId)
    return false
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

const actionList = computed(() => {
  // #ifdef MP-WEIXIN
  return [
    { name: '从微信消息中选择' },
    { name: '选择照片/视频' },
  ]
  // #endif
})

const hasPendingUploads = computed(() => pendingUploads.value.some(p => p.status === 'uploading' || p.status === 'pending'))

function onActionSelect({ item }: { item: { name: string } }) {
  if (item.name === '从微信消息中选择') {
    chooseFromMessage()
  }
  else if (item.name === '选择照片/视频') {
    chooseMedia()
  }
}

function chooseFromMessage() {
  // #ifdef MP-WEIXIN
  wx.chooseMessageFile({
    count: 20,
    type: 'all',
    extension: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'mov'],
    success: (res) => {
      showActionSheet.value = false
      for (const file of res.tempFiles) {
        const pendingItem: IPendingUpload = {
          id: file.path,
          tempFilePath: file.path,
          previewUrl: file.path,
          type: file.type === 'image' ? 'IMAGE' : 'VIDEO',
          size: file.size,
          status: 'pending',
          progress: 0,
        }
        pendingUploads.value.push(pendingItem)
        uploadAndCreateAlbum(pendingItem.id)
      }
    },
    fail: (err) => {
      console.error('从消息选择图片失败', err)
      showActionSheet.value = false
    },
  })
  // #endif
}

// 初始化加载数据
onMounted(() => {
  console.log('ActivityAlbum mounted')
})
</script>

<template>
  <view class="h-full min-h-400px flex flex-col">
    <!-- 相册列表 -->
    <z-paging
      ref="paging"
      v-model="albums"
      use-page-scroll
      refresher-enabled
      @query="queryList"
    >
      <!-- 头部刷新栏 -->
      <view class="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-3">
        <text class="text-sm text-gray-500">
          当前加载 {{ albums.length }} 条记录
        </text>
        <wd-button
          type="icon"
          size="small"
          @click="onRefresh"
        >
          <text class="i-carbon-renew text-lg" />
        </wd-button>
      </view>

      <!-- 空状态 -->
      <view v-if="albums.length === 0 && pendingUploads.length === 0" class="flex flex-col items-center gap-3 py-15">
        <text class="i-carbon-camera text-4xl text-gray-300" />
        <text class="text-sm text-gray-500">暂无照片或视频</text>
        <text class="text-xs text-gray-400">点击底部按钮上传</text>
      </view>

      <!-- 待上传项列表 -->
      <view v-if="pendingUploads.length > 0" class="flex flex-col">
        <view
          v-for="pending in pendingUploads"
          :key="pending.id"
          class="rounded-xl bg-white px-8 py-2 shadow-sm"
        >
          <view class="mb-2.5 flex items-center gap-2.5">
            <view class="h-9 w-9 flex items-center justify-center rounded-full bg-gray-100">
              <text class="text-sm text-gray-500 font-medium">
                {{ userStore.userInfo?.nickname?.charAt(0) || 'U' }}
              </text>
            </view>
            <view class="flex flex-1 flex-col gap-0.5">
              <text class="text-sm text-gray-800 font-medium">{{ userStore.userInfo?.nickname || '我' }}</text>
              <text class="text-xs text-gray-400">上传中...</text>
            </view>
          </view>

          <!-- 媒体预览 -->
          <view class="relative overflow-hidden rounded-lg bg-gray-100">
            <!-- 图片 -->
            <image
              v-if="pending.type === 'IMAGE'"
              :src="pending.previewUrl"
              class="block w-full"
              mode="widthFix"
              lazy-load
            />
            <!-- 视频 -->
            <view v-else-if="pending.type === 'VIDEO'" class="relative">
              <image
                :src="pending.previewUrl"
                class="block w-full"
                mode="widthFix"
                lazy-load
              />
              <view class="absolute inset-0 flex items-center justify-center bg-black/30">
                <view class="h-15 w-15 flex items-center justify-center rounded-full bg-white/90">
                  <text class="i-carbon-play-filled-alt text-2xl text-gray-800" />
                </view>
              </view>
            </view>

            <!-- 上传中: 显示进度条 -->
            <view v-if="pending.status === 'uploading'" class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
              <wd-loading size="24px" color="white" />
              <wd-progress :percentage="pending.progress" :show-text="true" />
            </view>

            <!-- 上传失败: 显示重试按钮 -->
            <view v-if="pending.status === 'failed'" class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
              <text class="text-sm text-white">{{ pending.error || '上传失败' }}</text>
              <wd-button size="small" type="warning" @click="retryUpload(pending.id)">
                重试
              </wd-button>
            </view>

            <!-- 上传成功: 显示对勾 -->
            <view v-if="pending.status === 'success'" class="absolute inset-0 flex items-center justify-center bg-black/30">
              <view class="h-15 w-15 flex items-center justify-center rounded-full bg-green-500/80">
                <text class="i-carbon-checkmark-filled text-2xl text-white" />
              </view>
            </view>
          </view>

          <!-- 文件信息 -->
          <view class="mt-2.5 flex justify-between border-t border-gray-100 pt-2.5">
            <text class="text-xs text-gray-500">{{ pending.type === 'IMAGE' ? '照片' : '视频' }}</text>
            <text v-if="pending.size > 0" class="text-xs text-gray-400">{{ formatSize(pending.size) }}</text>
          </view>
          <wd-divider dashed />
        </view>
      </view>

      <!-- 已上传列表内容 -->
      <view v-if="albums.length > 0" class="flex flex-col">
        <view
          v-for="(album, index) in albums"
          :key="album.id"
          class="rounded-xl bg-white px-8 py-2 shadow-sm"
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
            <view v-if="canDelete(album)">
              <wd-button type="icon" size="small" @click="editDescription(album)">
                <text class="i-carbon-edit text-gray-400" />
              </wd-button>
              <wd-button type="icon" size="small" @click="deleteAlbum(album)">
                <text class="i-carbon-trash-can text-gray-400" />
              </wd-button>
            </view>
          </view>

          <!-- 描述 -->
          <view v-if="album.description" class="mb-2.5 flex items-center justify-between text-sm text-gray-800 leading-relaxed">
            <text class="flex-1">{{ album.description || '' }}</text>
          </view>

          <!-- 媒体内容 -->
          <view class="relative overflow-hidden rounded-lg bg-gray-100" @click="previewMedia(index)">
            <!-- 图片 -->
            <image
              v-if="album.type === 'IMAGE'"
              :src="album.coverUrl || `${album.url}?imageMogr2/thumbnail/512x`"
              class="block w-full"
              mode="widthFix"
              lazy-load
            />
            <!-- 视频 -->
            <view v-else-if="album.type === 'VIDEO'" class="relative">
              <image
                :src="album.coverUrl || `${album.url}?ci-process=snapshot&time=1`"
                class="block w-full"
                mode="widthFix"
                lazy-load
              />
              <view class="absolute inset-0 flex items-center justify-center bg-black/30">
                <view class="h-15 w-15 flex items-center justify-center rounded-full bg-white/90">
                  <text class="i-carbon-play-filled-alt text-2xl text-gray-800" />
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
          <wd-divider dashed />
        </view>
      </view>
    </z-paging>

    <!-- 上传按钮 -->
    <view
      v-if="isActivityAdmin"
      class="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 py-3" :style="{ paddingBottom: `calc(12px + env(safe-area-inset-bottom))` }"
    >
      <button
        class="h-11 w-full flex items-center justify-center gap-1.5 rounded-full border-none bg-#a33327 text-base text-white font-medium active:opacity-80 disabled:opacity-60"
        :disabled="hasPendingUploads"
        @click="showUploadOptions"
      >
        <text class="i-carbon-add text-lg" />
        <text>{{ hasPendingUploads ? '上传中...' : '上传照片/视频' }}</text>
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
      :close-on-click-modal="true"
      custom-style="box-shadow: none; padding: 0;"
      closable
      hide-when-close
      @after-leave="closeVideoPlayer"
    >
      <view class="w-[90vw] overflow-hidden rounded-lg bg-black">
        <VideoPlayer
          v-if="currentVideoUrl"
          :src="currentVideoUrl"
          video-id="albumVideoPlayer"
          @close="closeVideoPlayer"
        />
      </view>
    </wd-popup>
  </view>
</template>
