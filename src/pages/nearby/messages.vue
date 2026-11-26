<script setup lang="ts">
import type { NearbyConversationItem } from '@/service/nearby'
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getConversationsAPI } from '@/service/nearby'
import { useNearbyStore } from '@/store/nearby'
import { useUserStore } from '@/store/user'
import { getRelativeTime } from '@/utils/dateUtil'

defineOptions({
  name: 'NearbyMessages',
})
definePage({
  style: {
    navigationBarTitleText: '消息',
  },
})

const userStore = useUserStore()
const nearbyStore = useNearbyStore()

const conversations = ref<NearbyConversationItem[]>([])
const loading = ref(false)
const avatarErrors = ref<Record<string, boolean>>({})

async function loadConversations() {
  if (!userStore.hasValidLogin) {
    conversations.value = []
    return
  }
  loading.value = true
  try {
    const res = await getConversationsAPI()
    conversations.value = res.conversations
  }
  catch (e) {
    console.error('加载会话列表失败', e)
  }
  finally {
    loading.value = false
  }
}

onShow(() => {
  void loadConversations()
  void nearbyStore.fetchUnreadCount()
})

function openConversation(item: NearbyConversationItem) {
  uni.navigateTo({
    url: `/pages/nearby/chat?id=${item.id}&peerName=${encodeURIComponent(item.peer.name)}`,
  })
}

function onAvatarError(id: string) {
  avatarErrors.value = { ...avatarErrors.value, [id]: true }
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7]">
    <view v-if="loading && !conversations.length" class="px-4 pt-10 text-center text-sm text-[#999]">
      加载中…
    </view>

    <view v-else-if="!conversations.length" class="flex flex-col items-center px-6 pt-24 text-center">
      <text class="i-carbon-chat text-5xl text-[#d9c4b8]" />
      <text class="mt-4 text-base text-[#333] font-bold">还没有消息</text>
      <text class="mt-2 text-sm text-[#999]">在附近拳友列表点「留言」开启第一句问候吧</text>
    </view>

    <view v-else class="divide-y divide-[#eee9df]">
      <view
        v-for="item in conversations"
        :key="item.id"
        class="flex items-center gap-3 bg-[#fffdf9] px-4 py-3.5"
        @click="openConversation(item)"
      >
        <view class="relative shrink-0">
          <image
            v-if="item.peer.avatar && !avatarErrors[item.id]"
            :src="item.peer.avatar"
            mode="aspectFill"
            class="h-12 w-12 border border-[#e8e4dc] rounded-full"
            @error="onAvatarError(item.id)"
          />
          <view
            v-else
            class="h-12 w-12 flex items-center justify-center rounded-full bg-[#a33327] text-lg text-white font-bold"
          >
            {{ item.peer.name.slice(0, 1) }}
          </view>
          <wd-badge
            v-if="item.unreadCount > 0"
            :model-value="item.unreadCount"
            :max="99"
            class="absolute -right-1 -top-1"
          />
        </view>

        <view class="min-w-0 flex-1">
          <view class="flex items-center justify-between gap-2">
            <text class="truncate text-base text-[#1a1a1a] font-bold">{{ item.peer.name }}</text>
            <text v-if="item.lastMessageAt" class="shrink-0 text-xs text-[#999]">
              {{ getRelativeTime(item.lastMessageAt) }}
            </text>
          </view>
          <text class="mt-1 block truncate text-sm" :class="item.unreadCount > 0 ? 'text-[#333]' : 'text-[#999]'">
            {{ item.lastMessageContent ?? '暂无消息' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>
