<script lang="ts" setup>
import { useToast } from 'wot-design-uni'
import { RICE_PAPER_IMAGE } from '@/utils/constants'

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

const features = [
  {
    title: '线上课程',
    desc: '传统武术视频教学',
    icon: 'i-carbon-video',
    url: '/pages/courses/courses',
  },
  {
    title: '线下活动',
    desc: '武术交流活动, 线下集训报名',
    icon: 'i-carbon-location',
    url: '/pages/activities/index',
  },
  {
    title: '线下课程',
    desc: '武术长期课程',
    icon: 'i-carbon-calendar',
    url: '',
  },
  {
    title: '学员风采',
    desc: '优秀学员展示',
    icon: 'i-carbon-star',
    url: '',
  },
]

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
  uni.switchTab({ url })
}

function makePhoneCall() {
  uni.makePhoneCall({
    phoneNumber: '400-123-4567',
  })
}

onLoad(() => {
  console.log('翔云太极小程序首页加载完成')
})
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
    <!-- 顶部横幅 -->
    <view class="relative h-50">
      <image
        src="https://xytj-1303556457.cos.ap-shanghai.myqcloud.com/publics/banners/xytj_banner2.png"
        class="absolute inset-0 h-full w-full brightness-90 sepia-50 filter"
        mode="aspectFill"
      />
      <view class="absolute inset-0 bg-black/30" />

      <!-- 装饰纹理 -->
      <view
        class="pointer-events-none absolute inset-0 opacity-10"
        :style="{ backgroundImage: `url('${RICE_PAPER_IMAGE}')` }"
      />

      <view class="relative z-10 h-full flex flex-col items-center justify-center pt-2">
        <view class="flex flex-col items-center border-y-2 border-white/80">
          <text class="mb-4 text-4xl text-white font-bold tracking-[0.5em] shadow-sm">翔云文武</text>
          <text class="text-xl text-white/90 font-light tracking-widest">传统武术 · 太极养生</text>
        </view>

        <!-- Left Couplet -->
        <view class="absolute left-4 flex flex-col items-center space-y-3">
          <view class="w-8 flex flex-col items-center border rounded-sm p2 shadow-lg">
            <text class="text-xl text-white font-bold leading-8 font-serif" style="writing-mode: vertical-rl">养性修德</text>
          </view>
        </view>

        <!-- Right Couplet -->
        <view class="absolute right-4 flex flex-col items-center space-y-3">
          <view class="px- w-8 flex flex-col items-center border rounded-sm p2 shadow-lg">
            <text class="text-xl text-white font-bold leading-8 font-serif" style="writing-mode: vertical-rl">习武学文</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快速咨询 -->
    <view class="relative mb-4 mt-0 overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-6 shadow-md">
      <!-- 装饰 -->
      <view class="pointer-events-none absolute right-0 top-0 h-32 w-32 opacity-5" />

      <view class="relative z-10">
        <view class="mb-4 flex items-center">
          <view class="mr-2 h-5 w-1 rounded-full bg-[#a33327]" />
          <text class="text-xl text-[#1a1a1a] font-bold">公司简介</text>
        </view>
        <text class="mb-6 block text-[#555] leading-relaxed">
          <text class="font-bold">嘉兴翔云教育科技有限公司</text>专注于传统武术教育，致力于青少年武术教学和中老年太极养生培训。我们秉承"习武学文，养性修德"的理念，传承中华武术文化，推广健康生活方式。
        </text>
        <view class="space-y-3">
          <view class="flex items-center">
            <text class="mr-3 text-orange-500">📞</text>
            <text class="text-gray-700">咨询热线：***-****-****</text>
          </view>
          <view class="flex items-center">
            <text class="mr-3 text-orange-500">📍</text>
            <text class="text-gray-700">地址：中国·嘉兴·桐乡</text>
          </view>
          <view class="flex items-center">
            <text class="mr-3 text-orange-500">📧</text>
            <text class="text-gray-700">邮箱：***@xiangyunww.com</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="relative z-20 mx-4 mt-4">
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
</template>
