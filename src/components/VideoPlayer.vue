<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'

interface Props {
  src: string
  poster?: string
  videoId?: string
  containerWidth?: number // 单位是rpx
}

const props = withDefaults(defineProps<Props>(), {
  videoId: 'videoPlayer',
  containerWidth: 0,
})

const emit = defineEmits<{
  close: []
}>()

const isMirrored = ref(false)
const isPlaying = ref(false)
const showControls = ref(true)
const videoOriginalWidth = ref(0)
const videoOriginalHeight = ref(0)
const playbackRate = ref(1.0)
const showPlaybackRatePicker = ref(false)
const isLoop = ref(false)

const playbackRateOptions = [0.5, 0.75, 1.0, 1.25, 1.5]

let hideControlsTimer: ReturnType<typeof setTimeout> | null = null

let videoContext: UniApp.VideoContext | null = null
let componentInstance: any = null

const computedVideoHeight = computed(() => {
  if (videoOriginalWidth.value === 0 || videoOriginalHeight.value === 0)
    return 'auto'
  const width = props.containerWidth || 750 * 0.9
  const aspectRatio = videoOriginalHeight.value / videoOriginalWidth.value
  const height = width * aspectRatio
  console.log('computedVideoHeight: ', width, height)
  return `${height}rpx`
})

function toggleMirror() {
  console.log('toggleMirror', isMirrored.value)
  isMirrored.value = !isMirrored.value
  resetHideControlsTimer()
}

function toggleLoop() {
  isLoop.value = !isLoop.value
  resetHideControlsTimer()
}

function togglePlaybackRatePicker() {
  showPlaybackRatePicker.value = !showPlaybackRatePicker.value
  resetHideControlsTimer()
}

function setPlaybackRate(rate: number) {
  playbackRate.value = rate
  if (videoContext) {
    videoContext.playbackRate(rate)
  }
  showPlaybackRatePicker.value = false
  resetHideControlsTimer()
}

function onPlay() {
  console.log('onPlay')
  isPlaying.value = true
  resetHideControlsTimer()
}

function onPause() {
  console.log('onPause')
  isPlaying.value = false
  resetHideControlsTimer()
}

function onLoadedMetaData(e: any) {
  console.log('onLoadedMetaData', e.detail)
  videoOriginalWidth.value = e.detail.width
  videoOriginalHeight.value = e.detail.height
  console.log('视频元数据:', videoOriginalWidth.value, 'x', videoOriginalHeight.value)
}

function close() {
  videoContext?.exitFullScreen()
  emit('close')
}

function resetHideControlsTimer() {
  showControls.value = true
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
  }
  if (isPlaying.value) {
    hideControlsTimer = setTimeout(() => {
      showControls.value = false
    }, 5000)
  }
}

onMounted(() => {
  componentInstance = getCurrentInstance()?.proxy
  videoContext = uni.createVideoContext(props.videoId, componentInstance)
  console.log('videoContext initialized', videoContext, 'videoId:', props.videoId)
})

onUnmounted(() => {
  clearTimeout(hideControlsTimer)
})
</script>

<template>
  <view class="relative" @click="resetHideControlsTimer">
    <video
      :id="videoId"
      :src="props.src"
      :poster="props.poster || ''"
      autoplay
      object-fit="contain"
      controls
      :loop="isLoop"
      class="w-full"
      :style="{ height: computedVideoHeight }"
      :class="isMirrored ? 'mirror' : ''"
      @play="onPlay"
      @pause="onPause"
      @loadedmetadata="onLoadedMetaData"
    />

    <!-- 非全屏时的镜像按钮 -->
    <view class="flex justify-end gap-2" :class="showControls ? 'opacity-100' : 'opacity-0'">
      <view
        class="rounded-full px-4 py-2"
        :class="isLoop ? 'bg-blue-500/80' : 'bg-black/50'"
        @click.stop="toggleLoop"
      >
        <text class="text-sm text-white">循环</text>
      </view>
      <view
        class="rounded-full px-4 py-2"
        :class="isMirrored ? 'bg-blue-500/80' : 'bg-black/50'"
        @click.stop="toggleMirror"
      >
        <text class="text-sm text-white">镜像</text>
      </view>
      <view
        class="relative rounded-full bg-black/50 px-4 py-2"
        @click.stop="togglePlaybackRatePicker"
      >
        <text class="text-sm text-white">{{ playbackRate }}x</text>
        <!-- 倍速选择器 -->
        <view
          v-if="showPlaybackRatePicker"
          class="absolute bottom-full right-0 mb-2 rounded-lg bg-black/80 p-2"
        >
          <view
            v-for="rate in playbackRateOptions"
            :key="rate"
            class="rounded px-4 py-2 text-center"
            :class="playbackRate === rate ? 'bg-white/20' : ''"
            @click.stop="setPlaybackRate(rate)"
          >
            <text class="text-sm text-white">{{ rate }}x</text>
          </view>
        </view>
      </view>
      <view class="rounded-full bg-black/50 px-4 py-2" @click.stop="close">
        <text class="text-sm text-white">关闭</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mirror {
  transform: scaleX(-1);
}

.transition-opacity {
  transition: opacity 0.3s ease;
}

.fullscreen-mirror-btn {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 9999;

  .btn-content {
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 9999rpx;
    padding: 16rpx 32rpx;
    font-size: 28rpx;
    color: #fff;
  }
}
</style>
