<script setup lang="ts">
import { onLoad, onResize, onUnload } from '@dcloudio/uni-app'
import { computed, getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'

definePage({
  style: {
    navigationStyle: 'custom',
    pageOrientation: 'auto',
    navigationBarTextStyle: 'white',
  },
})

// 页面参数
const videoSrc = ref('')
const poster = ref('')
const title = ref('')

// 视频状态
const isPlaying = ref(false)
const isMirrored = ref(false)
const playbackRate = ref(1.0)
const isLoop = ref(false)
const showControls = ref(true)
const isLandscape = ref(false) // 根据窗口宽高比判断横竖屏
const showPlaybackRatePicker = ref(false)

// 进度条相关
const currentTime = ref(0) // 当前播放时间（秒）
const duration = ref(0) // 视频总时长（秒）
const progress = ref(0) // 播放进度（0-100）
const isDragging = ref(false) // 是否正在拖动进度条

// 视频原始尺寸
const videoOriginalWidth = ref(0)
const videoOriginalHeight = ref(0)

// 倍速选项
const playbackRateOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

// 控制按钮自动隐藏定时器
let hideControlsTimer: ReturnType<typeof setTimeout> | null = null

// 视频上下文
let videoContext: UniApp.VideoContext | null = null
let componentInstance: any = null

// 监听窗口大小变化以适配横竖屏
onResize((res) => {
  isLandscape.value = res.size.windowWidth > res.size.windowHeight
})

// 接收页面参数
onLoad((options) => {
  console.log('options:', options)
  if (options) {
    videoSrc.value = decodeURIComponent(options.src || '')
    poster.value = decodeURIComponent(options.poster || '')
    title.value = decodeURIComponent(options.title || '')
  }

  // 初始化屏幕方向判断
  const systemInfo = uni.getSystemInfoSync()
  isLandscape.value = systemInfo.windowWidth > systemInfo.windowHeight
})

// 页面卸载时清理
onUnload(() => {
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
  }
})

onMounted(() => {
  componentInstance = getCurrentInstance()?.proxy
  videoContext = uni.createVideoContext('fullscreenVideo', componentInstance)
})

onUnmounted(() => {
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
  }
})

// 视频元数据加载完成，判断屏幕方向
function onLoadedMetaData(e: any) {
  videoOriginalWidth.value = e.detail.width
  videoOriginalHeight.value = e.detail.height

  // 这里的 isLandscape 已经由 onLoad 和 onWindowResize 根据窗口大小实时更新，
  // 不再根据视频本身的宽高比来强制设置横竖屏，以尊重用户的屏幕旋转设置
}

// 播放/暂停切换
function togglePlay() {
  if (isPlaying.value) {
    videoContext?.pause()
  }
  else {
    videoContext?.play()
  }
}

// 镜像切换
function toggleMirror() {
  isMirrored.value = !isMirrored.value
  resetHideControlsTimer()
}

// 循环播放切换
function toggleLoop() {
  isLoop.value = !isLoop.value
  resetHideControlsTimer()
}

// 显示/隐藏倍速选择器
function togglePlaybackRatePicker() {
  showPlaybackRatePicker.value = !showPlaybackRatePicker.value
  resetHideControlsTimer()
}

// 设置播放速率
function setPlaybackRate(rate: number) {
  playbackRate.value = rate
  videoContext?.playbackRate(rate)
  showPlaybackRatePicker.value = false
  resetHideControlsTimer()
}

// 退出全屏
function exitFullscreen() {
  videoContext?.pause()
  // 返回上一页
  uni.navigateBack()
}

// 播放事件
function onPlay() {
  isPlaying.value = true
  resetHideControlsTimer()
}

// 暂停事件
function onPause() {
  isPlaying.value = false
  resetHideControlsTimer()
}

// 视频播放结束事件
function onEnded() {
  // 重置播放进度为0
  currentTime.value = 0
  progress.value = 0
  // 设置播放状态为暂停
  isPlaying.value = false
  // 重置控制按钮显示状态
  resetHideControlsTimer()
  // 确保控制按钮显示
  showControls.value = true
}

// 时间更新事件
function onTimeUpdate(e: any) {
  if (!isDragging.value) {
    currentTime.value = e.detail.currentTime
    duration.value = e.detail.duration
    if (duration.value > 0) {
      progress.value = (currentTime.value / duration.value) * 100
    }
  }
}

// 进度条拖动中
function onProgressChanging(e: any) {
  const value = e.detail.value
  progress.value = value
  currentTime.value = (value / 100) * duration.value
  showControls.value = true
}

// 进度条拖动结束
function onProgressChange(e: any) {
  const value = e.detail.value
  progress.value = value
  const seekTime = (value / 100) * duration.value
  if (videoContext && duration.value > 0) {
    videoContext.seek(seekTime)
  }
  resetHideControlsTimer()
}

// 格式化时间为 MM:SS 格式
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 重置控制按钮隐藏定时器
function resetHideControlsTimer() {
  showControls.value = true
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
  }
  if (isPlaying.value) {
    hideControlsTimer = setTimeout(() => {
      showControls.value = false
      showPlaybackRatePicker.value = false
    }, 5000)
  }
}
</script>

<template>
  <view
    v-if="videoSrc"
    class="fixed inset-0 z-[9999] h-screen w-screen flex items-center justify-center bg-black transition-opacity duration-300"
    :class="isLandscape ? 'flex-row' : 'flex-col'"
    @click="resetHideControlsTimer"
  >
    <!-- 视频元素 -->
    <video
      id="fullscreenVideo"
      :src="videoSrc"
      :poster="poster"
      autoplay
      object-fit="contain"
      :controls="false"
      :show-fullscreen-btn="false"
      :show-play-btn="false"
      :show-center-play-btn="false"
      :show-progress="false"
      :enable-progress-gesture="false"
      :loop="isLoop"
      class="h-full w-full object-contain"
      :class="isMirrored ? 'mirror-video' : ''"
      @play="onPlay"
      @pause="onPause"
      @loadedmetadata="onLoadedMetaData"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
    />

    <!-- 中央播放/暂停按钮 -->
    <view
      class="absolute left-1/2 top-1/2 z-10 transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2"
      :class="showControls ? 'opacity-100' : 'opacity-0'"
    >
      <view
        class="h-[60px] w-[60px] flex items-center justify-center border-2 border-white rounded-full bg-black/60 transition-transform duration-200 active:scale-110"
        @click.stop="togglePlay"
      >
        <text class="text-[24px] text-white" :class="isPlaying ? 'i-carbon-pause' : 'i-carbon-play'" />
      </view>
    </view>

    <!-- 顶部标题栏 -->
    <view
      class="absolute left-0 right-0 top-0 z-10 h-[60px] flex items-center from-black/80 to-transparent bg-gradient-to-b px-[15px] py-[10px] transition-opacity duration-300"
      :class="showControls ? 'opacity-100' : 'opacity-0'"
    >
      <view class="h-[30px] w-[30px] flex items-center justify-center active:opacity-70" @click.stop="exitFullscreen">
        <text class="i-carbon-arrow-left text-[20px] text-white" />
      </view>
      <text v-if="title" class="ml-[10px] flex-1 truncate text-[16px] text-white">{{ title }}</text>
    </view>

    <!-- 底部控制区域 -->
    <view
      class="absolute bottom-0 left-0 right-0 z-10 from-black/80 to-transparent bg-gradient-to-t transition-opacity duration-300 pb-safe"
      :class="[isLandscape ? 'px-[20px] py-[10px]' : 'px-[15px] py-[10px]', showControls ? 'opacity-100' : 'opacity-0']"
    >
      <!-- 进度条 -->
      <view class="mb-[10px]">
        <!-- 时间显示 -->
        <view class="mb-[5px] flex justify-between text-[12px] text-white/80">
          <text>{{ formatTime(currentTime) }}</text>
          <text>{{ formatTime(duration) }}</text>
        </view>

        <!-- 进度条 -->
        <view class="w-full">
          <slider
            :value="progress"
            :min="0"
            :max="100"
            :step="0.1"
            active-color="#fff"
            background-color="rgba(255, 255, 255, 0.2)"
            :block-size="12"
            block-color="#fff"
            @change="onProgressChange"
            @changing="onProgressChanging"
          />
        </view>
      </view>

      <!-- 控制按钮 -->
      <view class="flex items-center gap-[20px]" :class="isLandscape ? 'justify-end' : 'justify-center'">
        <!-- 循环播放按钮 -->
        <view
          class="relative min-w-[40px] flex flex-col items-center justify-center rounded-md px-[10px] py-[5px] transition-colors duration-200 active:bg-white/10"
          :class="isLoop ? 'bg-white/20' : ''"
          @click.stop="toggleLoop"
        >
          <text class="i-carbon:loop mb-[2px] text-[18px] text-white" />
          <text class="text-[11px] text-white">循环</text>
        </view>

        <!-- 镜像按钮 -->
        <view
          class="relative min-w-[40px] flex flex-col items-center justify-center rounded-md px-[10px] py-[5px] transition-colors duration-200 active:bg-white/10"
          :class="isMirrored ? 'bg-white/20' : ''"
          @click.stop="toggleMirror"
        >
          <text class="i-carbon:ibm-engineering-requirements-doors-next mb-[2px] text-[18px] text-white" />
          <text class="text-[11px] text-white">镜像</text>
        </view>

        <!-- 倍速按钮 -->
        <view class="relative min-w-[40px] flex flex-col items-center justify-center rounded-md px-[10px] py-[5px] transition-colors duration-200 active:bg-white/10" @click.stop="togglePlaybackRatePicker">
          <text class="i-carbon-timer mb-[2px] text-[18px] text-white" />
          <text class="text-[11px] text-white">{{ playbackRate }}x</text>

          <!-- 倍速选择器 -->
          <view
            v-if="showPlaybackRatePicker"
            class="absolute bottom-[100%] left-1/2 z-[1000] mb-[10px] max-w-[150px] min-w-[70px] border border-[#333] rounded-lg bg-black/95 p-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.5)] -translate-x-1/2"
            :class="isLandscape ? 'max-h-[150px] overflow-y-auto' : ''"
          >
            <view
              v-for="rate in playbackRateOptions"
              :key="rate"
              class="rounded px-[12px] py-[8px] text-center transition-colors duration-200 active:bg-white/10"
              :class="playbackRate === rate ? 'bg-white/20' : ''"
              @click.stop="setPlaybackRate(rate)"
            >
              <text class="text-[14px] text-white">{{ rate }}x</text>
            </view>
          </view>
        </view>

        <!-- 退出按钮 -->
        <view class="relative min-w-[40px] flex flex-col items-center justify-center rounded-md px-[10px] py-[5px] transition-colors duration-200 active:bg-white/10" @click.stop="exitFullscreen">
          <text class="i-carbon-close mb-[2px] text-[18px] text-white" />
          <text class="text-[11px] text-white">退出</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* 修复视频镜像类名 */
.mirror-video {
  transform: scaleX(-1);
}

/* 自定义slider样式 */
:deep(.uni-slider) {
  height: 4px;
  border-radius: 2px;
}

:deep(.uni-slider-rail) {
  height: 4px;
  border-radius: 2px;
}

:deep(.uni-slider-fill) {
  height: 4px;
  border-radius: 2px;
}

:deep(.uni-slider-handle) {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.4);
}
</style>
