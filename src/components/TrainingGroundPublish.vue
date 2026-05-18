<script setup lang="ts">
import type { TrainingGroundMediaType } from '@/api/training-ground'
import { ref, watch } from 'vue'
import { createTrainingGroundPost } from '@/api/training-ground'
import { uploadToCos } from '@/utils/cos'

const props = defineProps<{
  visible: boolean
  preselectedFilePath?: string
  preselectedMediaType?: TrainingGroundMediaType
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'published'): void
  (e: 'clearPreselected'): void
}>()

// 步骤：0-选择类型和文件，1-上传中，2-编辑描述
const currentStep = ref(0)
const mediaType = ref<TrainingGroundMediaType>('IMAGE')
const selectedFilePath = ref('')
const selectedFileTempPath = ref('')
const uploadedUrl = ref('')
const uploadedKey = ref('')
const description = ref('')
const isUploading = ref(false)
const uploadProgress = ref(0)
const isSubmitting = ref(false)
// 上传到 COS
let progressTimer: ReturnType<typeof setInterval> | null = null
watch(() => props.visible, (newVal) => {
  if (newVal && props.preselectedFilePath) {
    mediaType.value = props.preselectedMediaType || 'IMAGE'
    selectedFileTempPath.value = props.preselectedFilePath
    selectedFilePath.value = props.preselectedFilePath
    currentStep.value = 1
    startUpload()
  }
})

// 关闭弹窗
function close() {
  emit('update:visible', false)
  emit('clearPreselected')
  resetForm()
}

// 重置表单
function resetForm() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  currentStep.value = 0
  mediaType.value = 'IMAGE'
  selectedFilePath.value = ''
  selectedFileTempPath.value = ''
  uploadedUrl.value = ''
  uploadedKey.value = ''
  description.value = ''
  isUploading.value = false
  uploadProgress.value = 0
  isSubmitting.value = false
}

// 切换媒体类型
function switchMediaType(type: TrainingGroundMediaType) {
  mediaType.value = type
  selectedFilePath.value = ''
  selectedFileTempPath.value = ''
}

// 选择媒体文件
async function chooseMedia() {
  try {
    const sourceType: Array<'album' | 'camera'> = ['album', 'camera']
    if (mediaType.value === 'IMAGE') {
      const res = await uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType,
      })
      const tempFilePath = res.tempFilePaths[0]
      // 获取文件信息检查大小
      const fileInfo = await uni.getFileInfo({ filePath: tempFilePath })
      // 10MB = 10 * 1024 * 1024
      if (fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
        uni.showToast({ title: '图片大小不能超过10MB', icon: 'none' })
        return
      }
      selectedFileTempPath.value = tempFilePath
      selectedFilePath.value = tempFilePath
      // 自动开始上传
      await startUpload()
    }
    else {
      let videoPath = ''
      let videoSize = 0

      // #ifdef MP-WEIXIN
      const res: any = await uni.chooseMedia({
        count: 1,
        mediaType: ['video'],
        sourceType,
        maxDuration: 60,
      })
      videoPath = res.tempFiles[0].tempFilePath
      videoSize = res.tempFiles[0].size
      // #endif

      // #ifndef MP-WEIXIN
      const videoRes = await uni.chooseVideo({
        sourceType,
        maxDuration: 60,
        compressed: true,
      })
      videoPath = videoRes.tempFilePath
      videoSize = videoRes.size
      // #endif

      // 100MB = 100 * 1024 * 1024
      if (videoSize && videoSize > 100 * 1024 * 1024) {
        uni.showToast({ title: '视频大小不能超过100MB', icon: 'none' })
        return
      }
      selectedFileTempPath.value = videoPath
      selectedFilePath.value = videoPath
      await startUpload()
    }
  }
  catch (e: any) {
    console.error('选择文件失败', e)
    if (e.errMsg && !e.errMsg.includes('cancel')) {
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    }
  }
}

function cancelUpload() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  isUploading.value = false
  uploadProgress.value = 0
  currentStep.value = 0
}

async function startUpload() {
  if (!selectedFileTempPath.value) {
    uni.showToast({ title: '请先选择文件', icon: 'none' })
    return
  }

  isUploading.value = true
  uploadProgress.value = 30

  try {
    progressTimer = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10
      }
    }, 200)

    const result = await uploadToCos(selectedFileTempPath.value)
    clearInterval(progressTimer)
    progressTimer = null
    uploadProgress.value = 100
    uploadedUrl.value = result.url
    uploadedKey.value = result.key
    currentStep.value = 2
  }
  catch (e) {
    console.error('上传失败', e)
    uni.showToast({ title: '上传失败，请重试', icon: 'none' })
    currentStep.value = 0
  }
  finally {
    if (progressTimer) {
      clearInterval(progressTimer)
      progressTimer = null
    }
    isUploading.value = false
    uploadProgress.value = 0
  }
}

// 提交发布
async function handleSubmit() {
  if (!uploadedUrl.value) {
    uni.showToast({ title: '请先上传文件', icon: 'none' })
    return
  }

  isSubmitting.value = true
  try {
    await createTrainingGroundPost({
      type: mediaType.value,
      url: uploadedUrl.value,
      description: description.value.trim() || undefined,
    })
    uni.showToast({ title: '发布成功', icon: 'success' })
    emit('published')
    close()
  }
  catch (e) {
    console.error('发布失败', e)
    uni.showToast({ title: '发布失败，请重试', icon: 'none' })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    custom-style="height: 85vh; border-radius: 16px 16px 0 0; z-index: 1100;"
    @close="close"
  >
    <view class="h-full flex flex-col">
      <!-- 标题栏 -->
      <view class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <text class="text-lg text-gray-900 font-bold">发布帖子</text>
        <wd-button
          type="icon"
          icon="close"
          size="small"
          @click="close"
        />
      </view>

      <!-- 内容区域 -->
      <view class="flex-1 overflow-y-auto px-4 py-4">
        <!-- 步骤1：选择类型 -->
        <view v-if="currentStep === 0" class="flex flex-col items-center">
          <!-- 类型切换 -->
          <view class="mb-6 w-full flex overflow-hidden border border-gray-200 rounded-lg">
            <view
              class="flex-1 cursor-pointer py-3 text-center text-sm transition-colors"
              :class="mediaType === 'IMAGE' ? 'bg-[#a33327] text-white font-medium' : 'bg-white text-gray-600'"
              @click="switchMediaType('IMAGE')"
            >
              图片
            </view>
            <view
              class="flex-1 cursor-pointer py-3 text-center text-sm transition-colors"
              :class="mediaType === 'VIDEO' ? 'bg-[#a33327] text-white font-medium' : 'bg-white text-gray-600'"
              @click="switchMediaType('VIDEO')"
            >
              视频
            </view>
          </view>

          <!-- 上传说明 -->
          <view class="mb-4 text-xs text-gray-400">
            <template v-if="mediaType === 'IMAGE'">
              支持 JPG、PNG 格式，大小不超过 10MB
            </template>
            <template v-else>
              支持 MP4 格式，大小不超过 100MB，时长不超过 60 秒
            </template>
          </view>

          <!-- 选择文件按钮 -->
          <view
            class="mb-4 h-40 w-full flex flex-col items-center justify-center border-2 border-gray-300 rounded-lg border-dashed bg-gray-50"
            @click="chooseMedia"
          >
            <text class="mb-2 text-3xl text-gray-300" :class="mediaType === 'IMAGE' ? 'i-carbon-image' : 'i-carbon-video'" />
            <text class="text-sm text-gray-400">
              {{ mediaType === 'IMAGE' ? '点击选择图片' : '点击选择视频' }}
            </text>
          </view>
        </view>

        <!-- 步骤2：上传中 -->
        <view v-if="currentStep === 1" class="flex flex-col items-center justify-center py-12">
          <wd-loading />
          <text class="mt-4 text-sm text-gray-500">正在上传...</text>
          <view class="mt-4 w-full">
            <wd-progress
              :percentage="uploadProgress"
              color="#a33327"
              hide-cancel
            />
          </view>
          <view class="mt-6">
            <text
              class="cursor-pointer text-sm text-[#a33327]"
              @click="cancelUpload"
            >
              取消上传
            </text>
          </view>
        </view>

        <!-- 步骤3：编辑描述 -->
        <view v-if="currentStep === 2">
          <!-- 预览 -->
          <view class="mb-4 flex justify-center">
            <view v-if="mediaType === 'IMAGE'" class="w-full overflow-hidden rounded-lg">
              <image
                :src="uploadedUrl"
                mode="aspectFit"
                class="h-auto w-full"
              />
            </view>
            <view v-else class="relative w-full overflow-hidden rounded-lg">
              <image
                :src="`${uploadedUrl}?ci-process=snapshot&time=1&format=jpg&width=400`"
                mode="aspectFit"
                class="h-auto w-full"
              />
              <view class="pointer-events-none absolute inset-0 flex items-center justify-center">
                <view class="h-12 w-12 flex items-center justify-center rounded-full bg-black/50">
                  <view
                    class="ml-1 h-0 w-0 border-y-8 border-l-14 border-y-transparent border-l-white"
                    style="border-top-width: 8px; border-bottom-width: 8px; border-left-width: 14px"
                  />
                </view>
              </view>
            </view>
          </view>

          <!-- 描述输入 -->
          <view class="mb-4">
            <text class="mb-2 block text-sm text-gray-700 font-medium">添加描述</text>
            <textarea
              v-model="description"
              class="w-full border border-gray-200 rounded-lg bg-gray-50 p-3 text-sm text-gray-800"
              style="min-height: 120px"
              placeholder="分享你的练功心得..."
              :maxlength="500"
            />
            <text class="mt-1 block text-right text-xs text-gray-400">
              {{ description.length }}/500
            </text>
          </view>
        </view>
      </view>

      <!-- 底部按钮 -->
      <view
        v-if="currentStep === 0 || currentStep === 2"
        class="border-t border-gray-100 px-4 py-3"
        style="padding-bottom: calc(12px + 50px + env(safe-area-inset-bottom))"
      >
        <!-- 步骤0：取消按钮 -->
        <wd-button
          v-if="currentStep === 0"
          block
          custom-style="background-color: #f5f5f5; color: #666;"
          @click="close"
        >
          取消
        </wd-button>

        <!-- 步骤2：取消 + 发布按钮 -->
        <view v-if="currentStep === 2" class="flex gap-3">
          <wd-button
            class="flex-1"
            custom-style="background-color: #f5f5f5; color: #666;"
            @click="close"
          >
            取消
          </wd-button>
          <wd-button
            class="flex-1"
            type="primary"
            :loading="isSubmitting"
            custom-style="background-color: #a33327; border-color: #a33327;"
            @click="handleSubmit"
          >
            发布
          </wd-button>
        </view>
      </view>
    </view>
  </wd-popup>
</template>

<style scoped>
:deep(.wd-img__image) {
  width: 100%;
  height: 100%;
}
</style>
