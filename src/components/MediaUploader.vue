<script setup lang="ts">
import type { PracticeMediaType } from '@/service/practice'
import { computed } from 'vue'
import { buildVideoCoverUrl } from '@/utils/cos'

/** 媒体条目：本地待上传（localPath）或已上传（remoteUrl，编辑时回填） */
export interface MediaItem {
  type: PracticeMediaType
  localPath?: string
  remoteUrl?: string
  size?: number
  mimeType?: string
  uploading?: boolean
}

const props = withDefaults(defineProps<{
  /** v-model 绑定的媒体列表 */
  modelValue: MediaItem[]
  /** 最大图片数量 */
  maxImages?: number
  /** 最大视频数量 */
  maxVideos?: number
  /** 单文件大小上限（字节），默认 20MB */
  maxFileSize?: number
  /** 视频文件大小上限（字节），默认 100MB；chooseMedia 返回原始视频，需更宽松上限 */
  maxVideoSize?: number
  /** 禁用选择/删除/预览交互（如父组件提交上传中） */
  disabled?: boolean
  /** 区块标题文案 */
  label?: string
}>(), {
  maxImages: 9,
  maxVideos: 1,
  maxFileSize: 20 * 1024 * 1024,
  maxVideoSize: 200 * 1024 * 1024,
  disabled: false,
  label: '照片/视频（选填）',
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: MediaItem[]): void
}>()

const items = computed(() => props.modelValue)

function toast(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function videoCount() {
  return items.value.filter(m => m.type === 'VIDEO').length
}

/**
 * 前端格式校验：优先 MIME（H5 可从 File 对象拿到），
 * 否则按扩展名判断（小程序/App 的临时路径自带扩展名）；两者都无法识别时不拦截
 */
function isAllowedMedia(mime: string, path: string, name: string, kind: 'image' | 'video'): boolean {
  if (mime) {
    const m = mime.toLowerCase()
    return kind === 'image' ? ['image/jpeg', 'image/png'].includes(m) : m === 'video/mp4'
  }
  const ref = `${name} ${path}`.toLowerCase()
  const match = ref.match(/\.([a-z0-9]+)(?:[?#\s]|$)/)
  if (!match) {
    return true
  }
  const ext = match[1]
  const allowed = kind === 'image' ? ['jpg', 'jpeg', 'png'] : ['mp4']
  return allowed.includes(ext)
}

function handleChooseError(e: any) {
  const msg = e?.errMsg || ''
  // 用户取消选择（含来源选择 ActionSheet 取消）不提示
  if (msg.includes('cancel')) {
    return
  }
  console.error('选择文件失败', e)
  // 权限拒绝：引导用户去设置开启
  if (msg.includes('auth deny') || msg.includes('authorize')) {
    toast('请在设置中开启相册/相机权限')
    return
  }
  // 其余真实错误提示用户
  toast('选择文件失败，请重试')
}

function addMedia() {
  if (props.disabled) {
    return
  }
  const actions: string[] = [
    `选择图片（最多${props.maxImages}张）`,
    `选择视频（最多${props.maxVideos}个）`,
  ]
  // 微信小程序额外支持从聊天记录选择
  // #ifdef MP-WEIXIN
  actions.push('从微信消息中选择')
  // #endif

  uni.showActionSheet({
    itemList: actions,
    success: ({ tapIndex }) => {
      if (tapIndex === 0) {
        chooseImages()
      }
      else if (tapIndex === 1) {
        chooseVideo()
      }
      // #ifdef MP-WEIXIN
      else if (tapIndex === 2) {
        chooseFromMessage()
      }
      // #endif
    },
  })
}

async function chooseImages() {
  const remaining = props.maxImages - items.value.length
  if (remaining <= 0) {
    toast(`媒体最多 ${props.maxImages} 个`)
    return
  }
  try {
    const newItems: MediaItem[] = []
    // #ifdef MP-WEIXIN
    // 微信小程序：chooseImage 已停止维护，使用 chooseMedia
    for (const f of (await uni.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
    })).tempFiles) {
      const path = f.tempFilePath
      // chooseMedia 无原生 File 对象，走扩展名校验
      if (!isAllowedMedia('', path, '', 'image')) {
        toast('图片仅支持 JPG / PNG 格式')
        continue
      }
      const size = Number(f.size) || 0
      if (size > props.maxFileSize) {
        toast(`单个文件不能超过 ${props.maxFileSize / 1024 / 1024}MB`)
        continue
      }
      newItems.push({ type: 'IMAGE', localPath: path, size })
    }
    // #endif

    // #ifndef MP-WEIXIN
    const imgRes = await uni.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
    })
    for (let i = 0; i < imgRes.tempFilePaths.length; i++) {
      const path = imgRes.tempFilePaths[i]
      // H5 端 tempFiles 里带有原生 File 对象，用于 MIME 校验
      const raw = (imgRes.tempFiles?.[i] as any)?.file as File | undefined
      const mime = raw?.type || ''
      const name = raw?.name || ''
      if (!isAllowedMedia(mime, path, name, 'image')) {
        toast('图片仅支持 JPG / PNG 格式')
        continue
      }
      let size = Number(imgRes.tempFiles?.[i]?.size) || 0
      if (!size) {
        try {
          size = (await uni.getFileInfo({ filePath: path })).size ?? 0
        }
        catch {
          size = 0
        }
      }
      if (size > props.maxFileSize) {
        toast(`单个文件不能超过 ${props.maxFileSize / 1024 / 1024}MB`)
        continue
      }
      newItems.push({ type: 'IMAGE', localPath: path, size, mimeType: mime || undefined })
    }
    // #endif

    if (newItems.length) {
      emit('update:modelValue', [...items.value, ...newItems])
    }
  }
  catch (e: any) {
    handleChooseError(e)
  }
}

async function chooseVideo() {
  if (videoCount() >= props.maxVideos) {
    toast(`视频最多 ${props.maxVideos} 个`)
    return
  }
  try {
    let path = ''
    let size = 0
    let mime = ''
    let name = ''

    // #ifdef MP-WEIXIN
    // 微信小程序：使用 chooseMedia 选择视频（与项目内 TrainingGroundPublish.vue 保持一致）
    const mediaRes: any = await uni.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 600,
    })
    path = mediaRes.tempFiles[0].tempFilePath
    size = Number(mediaRes.tempFiles[0].size) || 0
    // #endif

    // #ifndef MP-WEIXIN
    const videoRes = await uni.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 600,
      compressed: true,
    })
    path = videoRes.tempFilePath
    size = Number(videoRes.size) || 0
    const raw = (videoRes as any).file as File | undefined
    mime = raw?.type || ''
    name = (videoRes as any).name || ''
    // #endif

    if (!isAllowedMedia(mime, path, name, 'video')) {
      toast('视频仅支持 MP4 格式')
      return
    }
    if (size > props.maxVideoSize) {
      toast(`单个视频不能超过 ${props.maxVideoSize / 1024 / 1024}MB`)
      return
    }
    emit('update:modelValue', [...items.value, { type: 'VIDEO', localPath: path, size, mimeType: mime || undefined }])
  }
  catch (e: any) {
    handleChooseError(e)
  }
}

/**
 * 微信小程序专属：从聊天记录中选择图片/视频
 * 使用 uni.chooseMessageFile，一次可多选混合图片和视频
 * 需在结果中分别校验图片/视频的数量上限
 */
// #ifdef MP-WEIXIN
async function chooseFromMessage() {
  const remaining = props.maxImages - items.value.length
  if (remaining <= 0) {
    toast(`媒体最多 ${props.maxImages} 个`)
    return
  }
  try {
    // 注意：extension 仅在 type == 'file' 时有效，type: 'all' 下由下方 file.type 兜底过滤
    const res: any = await uni.chooseMessageFile({
      count: remaining,
      type: 'all',
    })
    const newItems: MediaItem[] = []
    let videoAddedCount = 0
    for (const file of res.tempFiles) {
      // type 过滤：chooseMessageFile 可能返回 file 类型（如 pdf），提示后跳过
      if (file.type !== 'image' && file.type !== 'video') {
        toast('仅支持图片/视频文件')
        continue
      }
      if (file.type === 'image') {
        // 图片数量上限校验：已达上限则跳过当前文件，仍处理后续其他类型文件
        const imageCount = newItems.filter(i => i.type === 'IMAGE').length
        const currentImageTotal = items.value.filter(i => i.type === 'IMAGE').length + imageCount
        if (currentImageTotal >= props.maxImages) {
          toast(`图片最多 ${props.maxImages} 张`)
          continue
        }
        // chooseMessageFile 无 MIME，走扩展名校验
        if (!isAllowedMedia('', file.path, file.name, 'image')) {
          toast('图片仅支持 JPG / PNG 格式')
          continue
        }
        if (file.size > props.maxFileSize) {
          toast(`单个文件不能超过 ${props.maxFileSize / 1024 / 1024}MB`)
          continue
        }
        newItems.push({
          type: 'IMAGE',
          localPath: file.path,
          size: file.size,
        })
      }
      else {
        // 视频数量上限校验：已达上限则跳过当前文件，仍处理后续其他类型文件
        const currentVideoTotal = videoCount() + videoAddedCount
        if (currentVideoTotal >= props.maxVideos) {
          toast(`视频最多 ${props.maxVideos} 个`)
          continue
        }
        if (!isAllowedMedia('', file.path, file.name, 'video')) {
          toast('视频仅支持 MP4 格式')
          continue
        }
        if (file.size > props.maxVideoSize) {
          toast(`单个视频不能超过 ${props.maxVideoSize / 1024 / 1024}MB`)
          continue
        }
        newItems.push({
          type: 'VIDEO',
          localPath: file.path,
          size: file.size,
        })
        videoAddedCount++
      }
    }
    if (newItems.length) {
      emit('update:modelValue', [...items.value, ...newItems])
    }
  }
  catch (e: any) {
    handleChooseError(e)
  }
}
// #endif

function removeMedia(index: number) {
  if (props.disabled) {
    return
  }
  const next = [...items.value]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function previewMedia(item: MediaItem) {
  if (props.disabled || item.uploading) {
    return
  }
  if (item.type === 'IMAGE') {
    const urls = items.value
      .filter(m => m.type === 'IMAGE')
      .map(m => m.remoteUrl || m.localPath || '')
      .filter(Boolean)
    const current = item.remoteUrl || item.localPath || ''
    if (urls.length && current) {
      uni.previewImage({ urls, current })
    }
  }
  else if (item.remoteUrl) {
    uni.navigateTo({
      url: `/pages/tools/fullscreen-player?src=${encodeURIComponent(item.remoteUrl)}&poster=${encodeURIComponent(buildVideoCoverUrl(item.remoteUrl))}`,
    })
  }
}
</script>

<template>
  <view>
    <view class="mb-2 block text-sm text-[#555] font-medium">
      {{ label }}
    </view>
    <view class="mb-2 block text-2xs text-[#999]">
      图片≤{{ maxImages }}张、视频≤{{ maxVideos }}个，支持 JPG/PNG/MP4，图片不超过 {{ props.maxFileSize / 1024 / 1024 }}MB、视频不超过 {{ props.maxVideoSize / 1024 / 1024 }}MB
    </view>
    <view class="grid grid-cols-3 gap-2">
      <view
        v-for="(item, index) in items"
        :key="index"
        class="relative aspect-square overflow-hidden rounded-md bg-[#efece4]"
        @click="previewMedia(item)"
      >
        <image
          v-if="item.type === 'IMAGE'"
          :src="item.remoteUrl || item.localPath"
          mode="aspectFill"
          class="h-full w-full"
        />
        <template v-else>
          <image
            v-if="item.remoteUrl"
            :src="buildVideoCoverUrl(item.remoteUrl)"
            mode="aspectFill"
            class="h-full w-full"
          />
          <view v-else class="h-full w-full flex items-center justify-center bg-[#3a3a3a]">
            <text class="i-carbon-video text-2xl text-white/80" />
          </view>
          <view v-if="item.remoteUrl" class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <view class="h-8 w-8 flex items-center justify-center rounded-full bg-black/50">
              <text class="i-carbon-play-filled-alt text-sm text-white" />
            </view>
          </view>
        </template>
        <!-- 上传中遮罩 -->
        <view v-if="item.uploading" class="absolute inset-0 flex items-center justify-center bg-black/40">
          <wd-loading color="#fff" />
        </view>
        <!-- 删除 -->
        <view
          v-if="!disabled"
          class="absolute right-1 top-1 h-5 w-5 flex items-center justify-center rounded-full bg-black/50"
          @click.stop="removeMedia(index)"
        >
          <text class="i-carbon-close text-2xs text-white" />
        </view>
      </view>
      <!-- 添加按钮 -->
      <view
        v-if="items.length < maxImages && !disabled"
        class="aspect-square flex flex-col items-center justify-center border-2 border-[#e8e4dc] rounded-md border-dashed bg-[#faf8f3]"
        @click="addMedia"
      >
        <text class="i-carbon-add text-2xl text-[#b8b3ab]" />
        <text class="mt-1 text-2xs text-[#999]">添加</text>
      </view>
    </view>
  </view>
</template>
