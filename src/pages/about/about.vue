<script lang="ts" setup>
definePage({
  style: {
    navigationBarTitleText: '关于我们',
  },
})

function makePhoneCall() {
  uni.makePhoneCall({
    phoneNumber: '400-123-4567',
  })
}

function navigateTo(url: string) {
  uni.navigateTo({ url })
}

const companyInfo = {
  name: '翔云教育科技有限公司',
  slogan: '习武学文，养性修德',
  description: '翔云教育科技有限公司专注于传统武术教育，致力于青少年武术教学和中老年太极养生培训。我们秉承"习武学文，养性修德"的理念，传承中华武术文化，推广健康生活方式。',
  phone: '400-123-4567',
  address: '中国·北京',
  email: 'info@xiangyuntaiji.com',
}

const features = [
  {
    title: '专业师资',
    desc: '资深武术教练团队',
    icon: '🥋',
  },
  {
    title: '系统教学',
    desc: '科学的教学方法',
    icon: '📚',
  },
  {
    title: '传统传承',
    desc: '正宗武术流派',
    icon: '🏛️',
  },
  {
    title: '健康养生',
    desc: '太极养生理念',
    icon: '🌱',
  },
]

const courses = [
  {
    title: '青少年武术班',
    age: '6-18岁',
    desc: '培养武术基础，强身健体',
    color: 'bg-gradient-to-r from-red-500 to-orange-500',
  },
  {
    title: '中老年太极班',
    age: '40岁以上',
    desc: '修身养性，延年益寿',
    color: 'bg-gradient-to-r from-green-500 to-teal-500',
  },
  {
    title: '传统武术班',
    age: '全年龄段',
    desc: '传承国粹，武德兼备',
    color: 'bg-gradient-to-r from-blue-500 to-purple-500',
  },
]
</script>

<template>
  <view class="min-h-screen from-amber-50 to-orange-50 bg-gradient-to-b">
    <!-- 公司头部信息 -->
    <view class="relative h-40 overflow-hidden">
      <view class="absolute inset-0 from-orange-500 to-red-500 bg-gradient-to-r" />
      <view class="relative z-10 h-full flex flex-col items-center justify-center px-4">
        <text class="mb-2 text-3xl text-white font-bold">{{ companyInfo.name }}</text>
        <text class="text-xl text-amber-100">{{ companyInfo.slogan }}</text>
      </view>
    </view>

    <!-- 公司介绍 -->
    <view class="mx-4 mt-6 rounded-xl bg-white p-6 shadow-md">
      <text class="mb-4 block text-xl text-gray-800 font-bold">公司简介</text>
      <text class="mb-6 block text-gray-600 leading-relaxed">
        {{ companyInfo.description }}
      </text>

      <!-- 联系方式 -->
      <!-- <view class="space-y-3">
        <view class="flex items-center">
          <text class="mr-3 text-orange-500">📞</text>
          <text class="text-gray-700">咨询热线：{{ companyInfo.phone }}</text>
        </view>
        <view class="flex items-center">
          <text class="mr-3 text-orange-500">📍</text>
          <text class="text-gray-700">地址：{{ companyInfo.address }}</text>
        </view>
        <view class="flex items-center">
          <text class="mr-3 text-orange-500">📧</text>
          <text class="text-gray-700">邮箱：{{ companyInfo.email }}</text>
        </view>
      </view> -->
    </view>

    <!-- 核心特色 -->
    <view class="mx-4 mt-6">
      <text class="mb-4 block text-xl text-gray-800 font-bold">核心特色</text>
      <view class="grid grid-cols-2 gap-4">
        <view
          v-for="(item, index) in features"
          :key="index"
          class="rounded-lg bg-white p-4 text-center shadow-md"
        >
          <text class="mb-2 block text-3xl">{{ item.icon }}</text>
          <text class="mb-1 block text-gray-800 font-semibold">{{ item.title }}</text>
          <text class="text-sm text-gray-600">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 课程体系 -->
    <view class="mx-4 mt-6">
      <text class="mb-4 block text-xl text-gray-800 font-bold">课程体系</text>
      <view class="space-y-3">
        <view
          v-for="(course, index) in courses"
          :key="index"
          class="rounded-lg p-4 text-white shadow-md"
          :class="course.color"
        >
          <view class="flex items-center justify-between">
            <view>
              <text class="mb-1 block text-lg font-semibold">{{ course.title }}</text>
              <text class="mb-1 block text-sm opacity-90">适合年龄：{{ course.age }}</text>
              <text class="text-sm opacity-90">{{ course.desc }}</text>
            </view>
            <text class="text-2xl">→</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 立即咨询按钮 -->
    <!-- <view class="mx-4 mb-8 mt-8">
      <button
        class="w-full rounded-lg bg-orange-500 py-4 text-lg text-white font-semibold shadow-lg"
        @click="makePhoneCall"
      >
        📞 立即咨询
      </button>
    </view> -->

    <!-- 底部导航到课程 -->
    <view class="mx-4 mb-8 text-center">
      <text class="mb-2 block text-sm text-gray-500">想要了解更多课程信息？</text>
      <text
        class="text-orange-600 font-semibold"
        @click="navigateTo('/pages/courses/index')"
      >
        查看所有课程 》
      </text>
    </view>
  </view>
</template>
