<script lang="ts" setup>
import type { BannerItem } from '@/store/settings'
import { computed } from 'vue'
import { useToast } from 'wot-design-uni'
import useSettingsReady from '@/hooks/useSettingsReady'
import { useSettingsStore } from '@/store/settings'
import { isPageTabbar } from '@/tabbar/store'

defineOptions({
  name: 'Home',
})
definePage({
  type: 'home',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '翔云文武',
  },
})

const toast = useToast()
const settingsStore = useSettingsStore()
// 等 settings 就绪（有缓存立即渲染，无缓存等待拉取完成）后再渲染页面
const { isReady } = useSettingsReady()

const baseFeatures = [
  {
    title: '线下活动',
    desc: '线下活动报名',
    icon: 'i-carbon-calendar',
    url: '/pages/activities/activities',
    showKey: null,
  },
  {
    title: '视频课程',
    desc: '传统武术视频教学',
    icon: 'i-carbon-video',
    url: '/pages/courses/courses',
    showKey: 'showVideo' as const,
  },
  {
    title: '请老师上课',
    desc: '邀请老师来上课',
    icon: 'i-carbon-user-speaker',
    url: '/pages/teacher-invitations/create',
    showKey: null,
  },
  {
    title: '教练团队',
    desc: '专业教练团队展示',
    icon: 'i-carbon-group',
    url: '/pages/coach/index',
    showKey: null,
  },
  {
    title: '文章资讯',
    desc: '太极文化文章资讯',
    icon: 'i-carbon-document',
    url: '/pages/articles/list',
    showKey: null,
  },
  {
    title: '练功场',
    desc: '分享练功动态',
    icon: 'i-carbon-accessibility-alt',
    url: '/pages/training-ground/index',
    showKey: 'showVideo' as const,
  },
]

const features = computed(() => {
  return baseFeatures.filter((item) => {
    if (item.showKey === 'showVideo' && !settingsStore.showVideo) {
      return false
    }
    return true
  })
})

const formattedPhoneNumber = computed(() => {
  return settingsStore.phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
})

const activeBanners = computed<BannerItem[]>(() => {
  return settingsStore.banners.filter(banner => banner.isActive)
})

const courses = [
  {
    title: '青少年武术基础班',
    students: 128,
    rating: 4.9,
    image: '/static/courses/kids-kungfu.jpg',
  },
  {
    title: '中老年太极养生班',
    students: 256,
    rating: 4.8,
    image: '/static/courses/taichi.jpg',
  },
  {
    title: '传统武术进阶班',
    students: 89,
    rating: 4.9,
    image: '/static/courses/advanced.jpg',
  },
]

function navigateTo(url: string) {
  if (!url) {
    toast.info({ msg: '暂未开放，敬请期待' })
    return
  }
  if (isPageTabbar(url)) {
    uni.switchTab({ url })
  }
  else {
    uni.navigateTo({ url })
  }
}

function makePhoneCall() {
  uni.makePhoneCall({
    phoneNumber: settingsStore.phoneNumber,
  })
}
</script>

<template>
  <view v-if="isReady" class="min-h-screen bg-[#f7f7f7] font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
    <view class="flex items-center justify-center gap-2 bg-white py-2" :style="{ paddingTop: 'var(--status-bar-height)' }">
      <image src="/static/logo.png" class="h-8 w-8" mode="aspectFit" />
      <text class="text-lg text-[#1a1a1a] font-bold tracking-widest">翔云文武</text>
    </view>

    <!-- 顶部横幅 -->
    <view v-if="activeBanners.length > 0" class="relative">
      <wd-swiper
        :list="activeBanners"
        :interval="3000"
        autoplay
        value-key="value"
        image-mode="aspectFit"
        :autoplay-video="false"
        stop-autoplay-when-video-play
        :indicator="{ type: 'fraction' }"
        :video-loop="false"
        :muted="false"
        height="200"
      />
    </view>
    <!-- <view v-else class="relative h-50">
      <image
        src="https://xytj-1303556457.cos.ap-shanghai.myqcloud.com/publics/banners/xytj_banner2.png"
        class="absolute inset-0 h-full w-full brightness-90 sepia-50 filter"
        mode="aspectFill"
      />
      <view class="absolute inset-0 bg-black/30" />
      <view
        class="pointer-events-none absolute inset-0 opacity-10"
        :style="{ backgroundImage: `url('${RICE_PAPER_IMAGE}')` }"
      />
      <view class="relative z-10 h-full flex flex-col items-center justify-center pt-2">
        <view class="flex flex-col items-center border-y-2 border-white/80">
          <text class="mb-4 text-4xl text-white font-bold tracking-[0.5em] shadow-sm">翔云文武</text>
          <text class="text-xl text-white/90 font-light tracking-widest">传统武术 · 太极养生</text>
        </view>
        <view class="absolute left-4 flex flex-col items-center space-y-3">
          <view class="w-8 flex flex-col items-center border rounded-sm p2 shadow-lg">
            <text class="text-xl text-white font-bold leading-8 font-serif" style="writing-mode: vertical-rl">养性修德</text>
          </view>
        </view>
        <view class="absolute right-4 flex flex-col items-center space-y-3">
          <view class="px- w-8 flex flex-col items-center border rounded-sm p2 shadow-lg">
            <text class="text-xl text-white font-bold leading-8 font-serif" style="writing-mode: vertical-rl">习武学文</text>
          </view>
        </view>
      </view>
    </view> -->

    <!-- 快速咨询 -->

    <view class="relative z-10">
      <view class="bg-white px-6 py-4">
        <text class="mb-2 block text-lg text-[#555] leading-relaxed" selectable user-select>
          <text class="font-bold">嘉兴翔云教育科技有限公司</text>专注于传统武术教育，致力于青少年武术教学和中老年太极养生培训。我们秉承"习武学文，养性修德"的理念，传承中华武术文化，推广健康生活方式。
        </text>
        <view v-if="settingsStore.phoneNumber" class="space-y-3" @click="makePhoneCall">
          <view class="flex items-center">
            <text class="text-gray-700">咨询热线：</text>
            <text class="i-carbon-phone text-green-500" />
            <text class="px-2 text-gray-500" selectable user-select>{{ formattedPhoneNumber }}</text>
          </view>
          <view class="flex items-center">
            <text class="text-gray-700">地址：</text>
            <text class="text-gray-500">中国·嘉兴·桐乡</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 热点链接 -->
    <view v-if="settingsStore.hotLinks.length > 0" class="relative z-20 mx-4 mt-6">
      <view class="mb-4 flex items-center">
        <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
        <text class="text-xl text-[#1a1a1a] font-bold">热点推荐</text>
      </view>
      <view class="space-y-2">
        <view
          v-for="(link, index) in settingsStore.hotLinks"
          :key="index"
          class="flex items-center overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] py-2 pl-2 pr-3 shadow-sm transition-all active:scale-98"
          @click="navigateTo(link.url)"
        >
          <view class="mr-2 h-8 w-8 flex items-center justify-center border border-[#a33327]/30 rounded-full">
            <text
              class="text-sm"
              :class="link.type === 'course' ? 'i-carbon-video' : link.type === 'activity' ? 'i-carbon-calendar' : 'i-carbon-document'"
            />
          </view>
          <view class="flex-1">
            <text class="text-base text-[#1a1a1a] font-bold">{{ link.title }}</text>
          </view>
          <view class="i-carbon-chevron-right text-sm text-[#999]" />
        </view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="relative z-20 mx-4 mt-6">
      <view class="mb-4 flex items-center">
        <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
        <text class="text-xl text-[#1a1a1a] font-bold">功能入口</text>
      </view>
      <view class="grid grid-cols-2 gap-4">
        <view
          v-for="(item, index) in features"
          :key="index"
          class="group relative overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-5 shadow-md"
          @click="navigateTo(item.url)"
        >
          <!-- 水墨装饰背景 -->
          <view class="absolute h-24 w-24 rounded-full bg-stone-100 opacity-50 transition-transform duration-500 -bottom-4 -right-4 group-hover:scale-110" />

          <view class="relative z-10 flex flex-col items-center text-center">
            <view class="mb-3 h-12 w-12 flex items-center justify-center border-2 border-[#333] rounded-full bg-white text-[#1a1a1a] shadow-sm">
              <view :class="item.icon" class="text-2xl" />
            </view>
            <text class="mb-1 text-lg text-[#1a1a1a] font-bold">{{ item.title }}</text>
            <text class="text-xs text-[#666] tracking-wide">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 热门课程 -->
    <!-- <view class="mx-4 mt-8">
      <view class="mb-4 flex items-center justify-between border-b border-[#e0e0e0] pb-2">
        <view class="flex items-center">
          <view class="mr-2 h-6 w-1 rounded-full bg-[#a33327]" />
          <text class="text-xl text-[#1a1a1a] font-bold">热门课程</text>
        </view>
        <text class="text-sm text-[#555] transition-colors hover:text-[#a33327]" @click="navigateTo('/pages/courses/index')">查看更多 ≫</text>
      </view>
      <view class="space-y-4">
        <view
          v-for="(course, index) in courses"
          :key="index"
          class="flex overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] shadow-sm"
          @click="navigateTo('/pages/courses/detail')"
        >
          <view class="relative h-24 w-24">
            <image
              :src="course.image"
              class="h-full w-full object-cover grayscale-[30%]"
              mode="aspectFill"
            />
            <view class="absolute inset-0 border-r border-[#e8e4dc]" />
          </view>

          <view class="flex flex-1 flex-col justify-between p-3">
            <text class="text-lg text-[#1a1a1a] font-bold tracking-wide">{{ course.title }}</text>
            <view class="flex items-center justify-between text-sm">
              <text class="text-[#666]">👥 {{ course.students }}人修习</text>
              <view class="flex items-center text-[#a33327]">
                <text class="mr-1">⭐</text>
                <text class="font-bold">{{ course.rating }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view> -->
    <!-- 底部装饰 -->
    <view class="flex justify-center pb-8 opacity-30">
      <text class="text-xs text-[#888] tracking-[0.5em]">—— 弘扬中华传统文化 ——</text>
    </view>
  </view>
  <!-- settings 未就绪时的 loading 占位（无本地缓存的首次启动） -->
  <view v-else class="h-screen flex items-center justify-center bg-[#f7f7f7]">
    <wd-loading color="#a33327" />
  </view>
</template>
