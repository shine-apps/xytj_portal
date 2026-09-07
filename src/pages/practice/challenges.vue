<script lang="ts" setup>
import type { ChallengeStatus, PracticeChallenge } from '@/service/practice'
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getChallengesAPI } from '@/service/practice'
import { RICE_PAPER_IMAGE } from '@/utils/constants'
import ChallengeForm from './components/ChallengeForm.vue'

definePage({
  style: {
    navigationBarTitleText: '练拳打卡挑战',
  },
})

const paging = ref<any>(null)
const challenges = ref<PracticeChallenge[]>([])
const activeStatus = ref<ChallengeStatus>('ongoing')
const showForm = ref(false)

// 首次 onShow 时 z-paging 会自动加载，跳过刷新
let isFirstShow = true

const tabs: Array<{ value: ChallengeStatus, label: string }> = [
  { value: 'ongoing', label: '进行中' },
  { value: 'ended', label: '已结束' },
]

const emptyText = ref('暂无进行中的挑战')

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getChallengesAPI({
      status: activeStatus.value,
      page: pageNo,
      pageSize,
    })
    paging.value?.complete(res.challenges)
  }
  catch (e) {
    console.error('加载挑战列表失败', e)
    paging.value?.complete(false)
  }
}

function switchTab(status: ChallengeStatus) {
  if (activeStatus.value === status)
    return
  activeStatus.value = status
  emptyText.value = status === 'ongoing' ? '暂无进行中的挑战' : '暂无已结束的挑战'
  paging.value?.reload()
}

// 从详情页返回时刷新（参加/退出状态可能变化）
onShow(() => {
  if (isFirstShow) {
    isFirstShow = false
    return
  }
  paging.value?.reload()
})

function navigateToDetail(id: string) {
  uni.navigateTo({ url: `/pages/practice/challenge-detail?id=${id}` })
}

function handleCreated(challenge: PracticeChallenge) {
  // 刷新列表并跳转新挑战详情
  paging.value?.reload()
  setTimeout(() => {
    uni.navigateTo({ url: `/pages/practice/challenge-detail?id=${challenge.id}` })
  }, 600)
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
    <z-paging ref="paging" v-model="challenges" :empty-view-text="emptyText" @query="queryList">
      <!-- 装饰纹理 -->
      <view
        class="pointer-events-none absolute inset-0 opacity-10"
        :style="{ backgroundImage: `url('${RICE_PAPER_IMAGE}')` }"
      />

      <view class="relative z-8 p-4">
        <!-- 标题 -->
        <view class="mb-4 flex items-center justify-center">
          <view class="h-[1px] w-12 bg-[#a33327] opacity-50" />
          <text class="mx-4 text-xl text-[#1a1a1a] font-bold tracking-widest">打卡挑战</text>
          <view class="h-[1px] w-12 bg-[#a33327] opacity-50" />
        </view>

        <!-- 状态 Tab -->
        <view class="mb-4 flex overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9]">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="flex-1 py-2.5 text-center text-sm transition-colors"
            :class="activeStatus === tab.value ? 'bg-[#3d5a66] font-bold text-white' : 'text-[#555]'"
            @click="switchTab(tab.value)"
          >
            {{ tab.label }}
          </view>
        </view>

        <!-- 挑战卡片列表 -->
        <view class="space-y-4">
          <view
            v-for="item in challenges"
            :key="item.id"
            class="relative overflow-hidden border rounded-lg bg-[#fffdf9] p-4 shadow-md"
            :class="item.isJoined ? 'border-[#a33327]/70' : 'border-[#e8e4dc]'"
            @click="navigateToDetail(item.id)"
          >
            <!-- 已参加角标 -->
            <view
              v-if="item.isJoined"
              class="absolute right-0 top-0 rounded-bl-lg bg-[#a33327] px-2 py-0.5 text-2xs text-white"
            >
              已参加
            </view>

            <view class="mb-2 pr-14">
              <text class="text-lg text-[#1a1a1a] font-bold">{{ item.title }}</text>
            </view>

            <view v-if="item.description" class="mb-2 truncate text-sm text-[#777]">
              {{ item.description }}
            </view>

            <view class="flex items-center text-sm text-[#555]">
              <view class="i-carbon-time mr-2 text-[#a33327]" />
              <text>{{ item.startDate }} ~ {{ item.endDate }}</text>
            </view>

            <view class="mt-2 flex items-center justify-between">
              <view class="flex items-center text-sm text-[#555]">
                <view class="i-carbon-user-multiple mr-2 text-[#a33327]" />
                <text>{{ item.participantCount }} 人参与</text>
              </view>
              <view
                class="rounded px-2 py-0.5 text-2xs"
                :class="activeStatus === 'ongoing' ? 'bg-[#3d5a66]/10 text-[#3d5a66]' : 'bg-gray-200 text-[#888]'"
              >
                {{ activeStatus === 'ongoing' ? '进行中' : '已结束' }}
              </view>
            </view>
          </view>
        </view>

        <!-- 底部装饰 -->
        <view class="flex justify-center py-8 opacity-30">
          <text class="text-xs text-[#888] tracking-[0.5em]">—— 日拱一卒 · 功不唐捐 ——</text>
        </view>
      </view>
    </z-paging>

    <!-- 发起挑战按钮 -->
    <view
      class="fixed right-4 z-50 flex items-center rounded-full bg-[#a33327] px-4 py-3 shadow-lg"
      style="bottom: calc(env(safe-area-inset-bottom) + 24px)"
      @click="showForm = true"
    >
      <view class="i-carbon-add mr-1 text-lg text-white" />
      <text class="text-sm text-white font-bold tracking-wider">发起挑战</text>
    </view>

    <!-- 发起挑战弹层 -->
    <ChallengeForm v-model:show="showForm" @success="handleCreated" />
  </view>
</template>
