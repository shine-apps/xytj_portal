<script lang="ts" setup>
import type { ShareConfig } from '@/utils/share'
import { onLoad } from '@dcloudio/uni-app'
import { staticUrl } from '@/utils'
import { setPageShareConfig } from '@/utils/share'

definePage({
  style: {
    navigationBarTitleText: '企业合作',
  },
})

// 页面分享：微信小程序支持转发好友与朋友圈（全局 mixin 已开启分享菜单）
onLoad(() => {
  const shareConfig: ShareConfig = {
    onShareAppMessage: () => ({
      title: '翔云文武·企业合作｜邀请专业老师上门授课',
      path: '/pages/teacher-invitations/index',
    }),
    onShareTimeline: () => ({
      title: '翔云文武·企业合作｜邀请专业老师上门授课',
      query: '',
    }),
  }
  setPageShareConfig(shareConfig)
})

// #ifdef H5
// H5 无原生分享菜单：优先调起系统分享面板，不支持时复制链接兜底
async function handleH5Share() {
  const shareUrl = window.location.href
  const shareData = {
    title: '翔云文武·企业合作',
    text: '邀请翔云文武专业老师上门授课，企业、事业机构、度假书院、酒店均可合作',
    url: shareUrl,
  }
  if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
    try {
      await (navigator as any).share(shareData)
      return
    }
    catch {
      // 用户取消或调起失败，走复制链接兜底
    }
  }
  uni.setClipboardData({
    data: shareUrl,
    success: () => uni.showToast({ title: '链接已复制，快去分享吧', icon: 'none' }),
  })
}
// #endif

// 对接老师
const contacts = [
  { name: '周老师', phone: '18857388966', display: '188-5738-8966' },
  { name: '俞老师', phone: '15706725301', display: '157-0672-5301' },
]

// 合作对象
const partners = [
  {
    title: '企业与事业机构',
    desc: '员工健康福利、工会活动、客户答谢与团队建设：开设太极、站桩、八段锦等工间课及传统武术体验课，缓解久坐疲劳，提振团队精气神。',
  },
  {
    title: '度假书院',
    desc: '邀请老师驻场授课，开设文武双修主题课程、青少年假期武术营与康养静修班，为书院配套正统武术与太极养生内容。',
  },
  {
    title: '酒店与度假村',
    desc: '为住客提供晨练太极、武术观摩与文化体验活动，联合打造康养度假套餐，让宾客在山水之间习拳养生，提升品牌特色。',
  },
]

// 可邀课程内容
const courses = [
  { title: '太极养生', desc: '太极套路、站桩、八段锦，适合办公人群与康养学员' },
  { title: '传统武术', desc: '基本功、拳械套路，适合企业社团与长期培训班' },
  { title: '青少年武术', desc: '寒暑假期短训，强身健体、明理立德' },
  { title: '团建体验课', desc: '单次武术体验与减压课，主题时长均可定制' },
  { title: '主题营期', desc: '短期集训营，可配合食宿与行程统一安排' },
]

// 合作优势
const advantages = [
  { title: '专业师资', desc: '资深教练团队，正统武术传承' },
  { title: '按需定制', desc: '课程内容、人数与时长均可定制' },
  { title: '排期灵活', desc: '工作日、周末及营期均可安排' },
  { title: '上门授课', desc: '老师亲赴贵单位或指定场地教学' },
]

// 合作流程
const steps = [
  { title: '电话沟通需求', desc: '致电对接老师，说明时间、地点、人数及需求' },
  { title: '一对一沟通', desc: '专属对接，确认课程方案与费用' },
  { title: '确认排期', desc: '敲定授课老师与行程安排' },
  { title: '老师上门授课', desc: '准时到场完成教学，课后回访' },
]

function callTeacher(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] pb-12 font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
    <!-- 头部 -->
    <view class="bg-white px-8 pb-11 pt-12 text-center">
      <image :src="staticUrl('/static/logo.png')" class="mx-auto mb-5 h-10 w-10 opacity-90" mode="aspectFit" />
      <text class="block text-xs text-[#a33327] tracking-[0.5em]">翔云文武 · 师资合作</text>
      <text class="mt-4 block text-4xl text-[#1a1a1a] font-bold tracking-[0.25em]">企业合作</text>
      <view class="mx-auto mt-5 h-px w-16 bg-[#1a1a1a]/70" />
      <text class="mx-auto mt-6 block max-w-[20rem] text-sm text-[#666] leading-8">
        翔云文武面向企业、事业机构、度假书院、酒店度假村开放师资合作，由专业教练团队上门授课。员工健康课堂、客户文化体验、书院驻场教学、度假康养活动，皆可按需定制。
      </text>
    </view>

    <view class="mx-4 mt-10 space-y-10">
      <!-- 合作对象 -->
      <view>
        <view class="mb-4 flex items-end justify-between border-b border-[#e9e6df] pb-3">
          <text class="text-xl text-[#1a1a1a] font-bold tracking-wide">合作对象</text>
          <text class="text-2xs text-[#b6b1a7] tracking-[0.3em]">PARTNERS</text>
        </view>
        <view class="space-y-3">
          <view
            v-for="(item, index) in partners"
            :key="index"
            class="rounded-xl bg-white p-6 shadow-sm"
          >
            <view class="flex items-baseline">
              <text class="text-2xl text-[#a33327]/60 font-bold">{{ `0${index + 1}` }}</text>
              <text class="ml-4 text-lg text-[#1a1a1a] font-bold">{{ item.title }}</text>
            </view>
            <text class="mt-3 block text-sm text-[#777] leading-7">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 可邀课程 -->
      <view>
        <view class="mb-4 flex items-end justify-between border-b border-[#e9e6df] pb-3">
          <text class="text-xl text-[#1a1a1a] font-bold tracking-wide">可邀课程</text>
          <text class="text-2xs text-[#b6b1a7] tracking-[0.3em]">PROGRAMS</text>
        </view>
        <view class="rounded-xl bg-white px-6 shadow-sm">
          <view
            v-for="(item, index) in courses"
            :key="index"
            class="flex items-baseline py-4"
            :class="index !== courses.length - 1 ? 'border-b border-[#f2f0ea]' : ''"
          >
            <text class="shrink-0 text-base text-[#1a1a1a] font-bold">{{ item.title }}</text>
            <text class="ml-4 flex-1 text-sm text-[#888] leading-6">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 合作优势 -->
      <view>
        <view class="mb-4 flex items-end justify-between border-b border-[#e9e6df] pb-3">
          <text class="text-xl text-[#1a1a1a] font-bold tracking-wide">合作优势</text>
          <text class="text-2xs text-[#b6b1a7] tracking-[0.3em]">ADVANTAGES</text>
        </view>
        <view class="grid grid-cols-2 rounded-xl bg-white shadow-sm">
          <view
            v-for="(item, index) in advantages"
            :key="index"
            class="px-4 py-7 text-center"
            :class="[
              index % 2 === 0 ? 'border-r border-[#f2f0ea]' : '',
              index < 2 ? 'border-b border-[#f2f0ea]' : '',
            ]"
          >
            <text class="block text-base text-[#1a1a1a] font-bold">{{ item.title }}</text>
            <text class="mt-2 block text-xs text-[#888] leading-5">{{ item.desc }}</text>
          </view>
        </view>
      </view>

      <!-- 合作流程 -->
      <view>
        <view class="mb-4 flex items-end justify-between border-b border-[#e9e6df] pb-3">
          <text class="text-xl text-[#1a1a1a] font-bold tracking-wide">合作流程</text>
          <text class="text-2xs text-[#b6b1a7] tracking-[0.3em]">PROCESS</text>
        </view>
        <view class="rounded-xl bg-white px-6 py-2 shadow-sm">
          <view
            v-for="(item, index) in steps"
            :key="index"
            class="flex items-stretch"
          >
            <view class="relative w-6 shrink-0">
              <view class="absolute left-1/2 top-5 h-2 w-2 rounded-full bg-[#a33327] -translate-x-1/2" />
              <view v-if="index !== steps.length - 1" class="absolute bottom-0 left-1/2 top-7 w-px bg-[#eceae4] -translate-x-1/2" />
            </view>
            <view class="flex-1 py-4">
              <text class="block text-base text-[#1a1a1a] font-bold">{{ item.title }}</text>
              <text class="mt-1 block text-sm text-[#888] leading-6">{{ item.desc }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 电话对接 -->
      <view class="rounded-xl bg-white px-6 py-8 text-center shadow-sm">
        <text class="block text-base text-[#1a1a1a] font-bold tracking-wide">期待与您共传文武之道</text>
        <text class="mt-2 block text-sm text-[#888]">欢迎致电对接老师，沟通合作需求</text>
        <view class="mt-6 space-y-3">
          <view
            v-for="(item, index) in contacts"
            :key="index"
            class="flex items-center justify-between border border-[#eceae4] rounded-full px-6 py-4 active:bg-[#faf8f4]"
            @click="callTeacher(item.phone)"
          >
            <view class="flex items-center">
              <text class="i-carbon-user-speaker mr-3 text-xl text-[#a33327]" />
              <text class="text-base text-[#1a1a1a] font-bold">{{ item.name }}</text>
            </view>
            <view class="flex items-center">
              <text class="mr-3 text-base text-[#555] tracking-wider" selectable user-select>{{ item.display }}</text>
              <text class="i-carbon-phone text-lg text-[#a33327]" />
            </view>
          </view>
        </view>
        <!-- #ifdef H5 -->
        <view class="mt-5 flex items-center justify-center" @click="handleH5Share">
          <text class="i-carbon-share mr-1.5 text-base text-[#a33327]" />
          <text class="text-sm text-[#555]">分享给朋友</text>
        </view>
        <!-- #endif -->
      </view>
    </view>

    <!-- 底部装饰 -->
    <view class="mt-10 flex justify-center opacity-30">
      <text class="text-xs text-[#888] tracking-[0.5em]">—— 弘扬中华传统文化 ——</text>
    </view>
  </view>
</template>
