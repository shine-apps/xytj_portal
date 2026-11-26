<script setup lang="ts">
import type { NearbyMessage } from '@/service/nearby'

defineProps<{
  message: NearbyMessage
  isMine: boolean
}>()
</script>

<template>
  <view class="w-full flex px-4 py-1.5" :class="isMine ? 'justify-end' : 'justify-start'">
    <view
      class="max-w-[72%] break-all rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
      :class="isMine
        ? 'rounded-br-sm bg-[#a33327] text-white'
        : 'rounded-bl-sm border border-[#e8e4dc] bg-[#fffdf9] text-[#1a1a1a]'"
    >
      <text>{{ message.content }}</text>
    </view>
  </view>
</template>
