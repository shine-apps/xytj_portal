<script setup lang="ts">
import { ref } from 'vue'
import { createComment } from '@/api/training-ground'
import { useUserStore } from '@/store/user'

const props = defineProps<{
  postId: string
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'submitted'): void
}>()

const userStore = useUserStore()

const commentText = ref('')
const isSending = ref(false)

function close() {
  emit('update:visible', false)
}

async function handleSendComment() {
  const content = commentText.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }

  if (!userStore.hasValidLogin) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  isSending.value = true
  try {
    await createComment(props.postId, { content })
    commentText.value = ''
    uni.showToast({ title: '评论成功', icon: 'success' })
    emit('submitted')
    close()
  }
  catch (e) {
    console.error('评论失败', e)
    uni.showToast({ title: '评论失败，请重试', icon: 'none' })
  }
  finally {
    isSending.value = false
  }
}
</script>

<template>
  <wd-popup
    :model-value="visible"
    position="bottom"
    custom-style="border-radius: 16px 16px 0 0; z-index: 1100;"
    @close="close"
  >
    <view class="flex flex-col">
      <view class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <text class="text-lg text-gray-900 font-bold">发表评论</text>
        <wd-button
          type="icon"
          icon="close"
          size="small"
          @click="close"
        />
      </view>

      <view class="p-4">
        <textarea
          v-model="commentText"
          class="w-full border border-gray-200 rounded-lg bg-gray-50 p-3 text-sm text-gray-800"
          style="min-height: 100px"
          placeholder="写下你的评论..."
          :maxlength="200"
        />
        <view class="mt-2 flex items-center justify-between">
          <text class="text-xs text-gray-400">
            {{ commentText.length }}/200
          </text>
          <wd-button
            type="primary"
            size="small"
            :loading="isSending"
            custom-style="background-color: #a33327; border-color: #a33327;"
            @click="handleSendComment"
          >
            发送
          </wd-button>
        </view>
      </view>

      <view style="height: env(safe-area-inset-bottom)" />
    </view>
  </wd-popup>
</template>
