<script setup lang="ts">
import type { NearbyMessage } from '@/service/nearby'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import {
  getMessagesAPI,
  markConversationReadAPI,
  sendMessageAPI,
} from '@/service/nearby'
import { useNearbyStore } from '@/store/nearby'
import { useUserStore } from '@/store/user'
import MessageBubble from './components/MessageBubble.vue'

defineOptions({
  name: 'NearbyChat',
})
definePage({
  style: {
    navigationBarTitleText: '聊天',
  },
})

const userStore = useUserStore()
const nearbyStore = useNearbyStore()

const conversationId = ref('')
const peerName = ref('聊天')
const messages = ref<NearbyMessage[]>([])
const inputContent = ref('')
const loading = ref(false)
const sending = ref(false)
const forbidden = ref(false)
/** 首次 onLoad 完成标记，避免 onShow 早于 onLoad 时空跑 */
const initialized = ref(false)

const myUserId = computed(() => userStore.userInfo?.userId ?? '')
const canSend = computed(() => inputContent.value.trim().length > 0 && !sending.value && !forbidden.value)

onLoad((options) => {
  conversationId.value = options?.id ?? ''
  peerName.value = options?.peerName ? decodeURIComponent(options.peerName) : '聊天'
  uni.setNavigationBarTitle({ title: peerName.value })
  void (async () => {
    await loadMessages()
    initialized.value = true
    await markReadAndSync()
  })()
})

onShow(() => {
  // 首次进入由 onLoad 内联处理；这里只覆盖从后台/其他页面返回的场景
  if (initialized.value && conversationId.value) {
    void markReadAndSync()
  }
})

/** 拉取最新 20 条历史；后端倒序返回，渲染前反转成时间正序 */
async function loadMessages() {
  if (!conversationId.value) {
    return
  }
  loading.value = true
  try {
    // 静默拦截器 toast：403 在本页自定义提示后返回，其他错误手动提示一次
    const res = await getMessagesAPI(conversationId.value, { hideErrorToast: true })
    messages.value = [...res.messages].reverse()
  }
  catch (e: any) {
    if (e?.statusCode === 403) {
      forbidden.value = true
      uni.showToast({ title: '你无权访问该会话', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 800)
      return
    }
    uni.showToast({ icon: 'none', title: e?.data?.message || e?.data?.msg || '加载失败，请稍后重试' })
  }
  finally {
    loading.value = false
  }
}

async function markReadAndSync() {
  try {
    await markConversationReadAPI(conversationId.value)
    nearbyStore.resetUnreadCount()
    await nearbyStore.fetchUnreadCount()
  }
  catch (e) {
    console.error('标记已读失败', e)
  }
}

async function onSend() {
  const content = inputContent.value.trim()
  if (!content || sending.value || forbidden.value) {
    return
  }
  sending.value = true
  try {
    const res = await sendMessageAPI(conversationId.value, content)
    messages.value.push(res.message)
    inputContent.value = ''
  }
  catch (e) {
    // 审核 400/503/409 的中文提示已由 http 拦截器统一 toast；此处不清空输入框，便于修改重发
    console.error('发送消息失败', e)
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <view class="min-h-screen flex flex-col bg-[#f7f7f7]">
    <scroll-view scroll-y class="flex-1 py-3" :scroll-into-view="`msg-${messages.length - 1}`">
      <view v-if="loading && !messages.length" class="pt-10 text-center text-sm text-[#999]">
        加载中…
      </view>
      <view v-else-if="!messages.length" class="pt-20 text-center text-sm text-[#999]">
        还没有消息，打个招呼吧
      </view>
      <view v-for="(message, index) in messages" :id="`msg-${index}`" :key="message.id">
        <MessageBubble
          :message="message"
          :is-mine="message.senderId === myUserId"
        />
      </view>
    </scroll-view>

    <view class="flex items-end gap-2 border-t border-[#e8e4dc] bg-[#fffdf9] px-3 py-2 pb-[constant(safe-area-inset-bottom)]">
      <view class="min-h-40px flex-1 border border-[#e8e4dc] rounded-2xl bg-white px-3 py-2">
        <wd-textarea
          v-model="inputContent"
          placeholder="说点什么…（最多 500 字）"
          :maxlength="500"
          show-word-limit
          auto-height
        />
      </view>
      <wd-button
        :disabled="!canSend"
        :loading="sending"
        custom-style="background-color: #a33327; border-color: #a33327; border-radius: 999px;"
        @click="onSend"
      >
        发送
      </wd-button>
    </view>
  </view>
</template>
