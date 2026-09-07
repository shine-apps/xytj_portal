<script lang="ts" setup>
import type { ChallengeDetail } from '@/service/practice'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { useMessage } from 'wot-design-uni'
import { getChallengeDetailAPI, joinChallengeAPI, leaveChallengeAPI } from '@/service/practice'
import { useUserStore } from '@/store/user'
import { RICE_PAPER_IMAGE } from '@/utils/constants'

definePage({
  style: {
    navigationBarTitleText: '挑战详情',
  },
})

const userStore = useUserStore()
const message = useMessage()

const challengeId = ref('')
const detail = ref<ChallengeDetail | null>(null)
const loading = ref(false)
const actionLoading = ref(false)

const challenge = computed(() => detail.value?.challenge ?? null)
const isOngoing = computed(() => challenge.value?.status === 'ongoing')
const isJoined = computed(() => challenge.value?.isJoined ?? false)
const myEntry = computed(() => {
  return detail.value?.leaderboard.find(entry => entry.userId === userStore.userInfo?.userId) ?? null
})

onLoad((options) => {
  if (options?.id) {
    challengeId.value = options.id
    loadDetail()
  }
})

async function loadDetail() {
  if (!challengeId.value)
    return
  loading.value = true
  try {
    detail.value = await getChallengeDetailAPI(challengeId.value)
    if (challenge.value) {
      uni.setNavigationBarTitle({ title: challenge.value.title })
    }
  }
  catch (e) {
    console.error('加载挑战详情失败', e)
  }
  finally {
    loading.value = false
  }
}

function displayName(nickname: string | null | undefined, userId: string) {
  return nickname?.trim() || `拳友${userId.slice(-4)}`
}

function rankColor(rank: number) {
  if (rank === 1)
    return '#a33327'
  if (rank === 2)
    return '#3d5a66'
  if (rank === 3)
    return '#9c6b3f'
  return '#999999'
}

async function handleJoin() {
  if (actionLoading.value)
    return
  actionLoading.value = true
  try {
    await joinChallengeAPI(challengeId.value)
    uni.showToast({ title: '已加入挑战', icon: 'success' })
    await loadDetail()
  }
  catch (e) {
    console.error('加入挑战失败', e)
  }
  finally {
    actionLoading.value = false
  }
}

async function handleLeave() {
  if (actionLoading.value)
    return
  try {
    await message.confirm({
      title: '退出挑战',
      msg: '退出后将不再出现在该挑战榜单中，确定退出吗？',
    })
  }
  catch {
    // 用户取消
    return
  }

  actionLoading.value = true
  try {
    await leaveChallengeAPI(challengeId.value)
    uni.showToast({ title: '已退出挑战', icon: 'none' })
    await loadDetail()
  }
  catch (e) {
    console.error('退出挑战失败', e)
  }
  finally {
    actionLoading.value = false
  }
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] pb-32 font-serif" style="font-family: 'KaiTi', 'STKaiti', 'serif'">
    <!-- 装饰纹理 -->
    <view
      class="pointer-events-none absolute inset-0 opacity-10"
      :style="{ backgroundImage: `url('${RICE_PAPER_IMAGE}')` }"
    />

    <view class="relative z-8 p-4">
      <!-- 加载中 -->
      <view v-if="loading && !challenge" class="flex flex-col items-center justify-center py-24">
        <wd-loading color="#a33327" />
        <text class="mt-3 text-sm text-[#888]">墨迹晕染中…</text>
      </view>

      <!-- 加载失败 -->
      <view v-else-if="!challenge" class="flex flex-col items-center justify-center py-24">
        <text class="text-sm text-[#888]">挑战详情加载失败</text>
        <view
          class="mt-4 border border-[#a33327]/60 rounded-full px-6 py-2 text-sm text-[#a33327]"
          @click="loadDetail"
        >
          重新加载
        </view>
      </view>

      <template v-else>
        <!-- 挑战信息 -->
        <view class="overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] shadow-md">
          <view class="p-4">
            <view class="mb-2 flex items-start justify-between gap-2">
              <text class="flex-1 text-xl text-[#1a1a1a] font-bold">{{ challenge.title }}</text>
              <view
                class="whitespace-nowrap rounded px-2 py-0.5 text-2xs"
                :class="isOngoing ? 'bg-[#3d5a66]/10 text-[#3d5a66]' : 'bg-gray-200 text-[#888]'"
              >
                {{ isOngoing ? '进行中' : '已结束' }}
              </view>
            </view>

            <view
              v-if="challenge.description"
              class="mb-3 rounded bg-[#f7f4ec] p-3 text-sm text-[#555] leading-relaxed"
            >
              {{ challenge.description }}
            </view>

            <view class="text-sm text-[#555] space-y-2">
              <view class="flex items-center">
                <view class="i-carbon-time mr-2 text-[#a33327]" />
                <text>{{ challenge.startDate }} ~ {{ challenge.endDate }}</text>
              </view>
              <view class="flex items-center">
                <view class="i-carbon-user-multiple mr-2 text-[#a33327]" />
                <text>{{ challenge.participantCount }} 人参与</text>
              </view>
              <view class="flex items-center">
                <view class="i-carbon-user mr-2 text-[#a33327]" />
                <text>发起人：{{ challenge.creator.name }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 排行榜 -->
        <view class="mb-2 mt-6 flex items-center justify-center">
          <view class="h-[1px] w-12 bg-[#a33327] opacity-50" />
          <text class="mx-4 text-lg text-[#1a1a1a] font-bold tracking-widest">打卡榜单</text>
          <view class="h-[1px] w-12 bg-[#a33327] opacity-50" />
        </view>

        <view class="overflow-hidden border border-[#e8e4dc] rounded-lg bg-[#fffdf9] shadow-md">
          <view
            v-for="entry in detail.leaderboard"
            :key="entry.userId"
            class="flex items-center justify-between border-b border-[#eee9dd] px-4 py-3 last:border-b-0"
          >
            <view class="flex items-center">
              <text
                class="w-8 text-center text-lg font-bold"
                :style="{ color: rankColor(entry.rank) }"
              >
                {{ entry.rank }}
              </text>
              <view class="ml-2 flex items-center">
                <text class="text-sm text-[#1a1a1a]">{{ displayName(entry.nickname, entry.userId) }}</text>
                <view
                  v-if="entry.rank === 1"
                  class="ml-2 rounded-sm bg-[#a33327]/10 px-1.5 py-0.5 text-3xs text-[#a33327]"
                >
                  领先
                </view>
              </view>
            </view>
            <view class="text-sm text-[#555]">
              <text class="text-base text-[#1a1a1a] font-bold">{{ entry.checkInDays }}</text>
              天
            </view>
          </view>
          <view v-if="!detail.leaderboard.length" class="py-10 text-center text-sm text-[#888]">
            尚无拳友上榜，快去打卡吧
          </view>
        </view>

        <!-- 底部装饰 -->
        <view class="flex justify-center py-8 opacity-30">
          <text class="text-xs text-[#888] tracking-[0.5em]">—— 以武会友 · 共修身心 ——</text>
        </view>
      </template>
    </view>

    <!-- 底部操作栏：已参加显示我的排名；未参加且进行中显示加入按钮 -->
    <view
      v-if="challenge && (isJoined || isOngoing)"
      class="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e8e4dc] bg-[#fffdf9]/95 px-4 pt-3"
      style="padding-bottom: calc(env(safe-area-inset-bottom) + 12px)"
    >
      <view v-if="isJoined" class="flex items-center justify-between">
        <view class="text-sm text-[#555]">
          我的排名
          <text class="mx-1 text-lg text-[#a33327] font-bold">#{{ myEntry?.rank ?? '—' }}</text>
          · 已打卡
          <text class="mx-1 text-lg text-[#1a1a1a] font-bold">{{ myEntry?.checkInDays ?? 0 }}</text>
          天
        </view>
        <view
          v-if="isOngoing"
          class="border border-[#a33327]/60 rounded-full px-4 py-1.5 text-sm text-[#a33327]"
          @click="handleLeave"
        >
          退出挑战
        </view>
      </view>
      <view
        v-else
        class="flex items-center justify-center rounded-full bg-[#a33327] py-3 text-base text-white font-bold tracking-widest"
        :class="actionLoading ? 'opacity-70' : ''"
        @click="handleJoin"
      >
        {{ actionLoading ? '加入中…' : '加入挑战' }}
      </view>
    </view>

    <!-- 二次确认弹窗 -->
    <wd-message-box />
  </view>
</template>
