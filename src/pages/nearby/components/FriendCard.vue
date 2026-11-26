<script setup lang="ts">
import type { NearbyUser } from '@/service/nearby'
import { ref } from 'vue'
import { formatDistance } from '@/utils/distance'

const props = defineProps<{
  user: NearbyUser
}>()

const emit = defineEmits<{
  (e: 'message', user: NearbyUser): void
}>()

const avatarError = ref(false)

function onAvatarError() {
  avatarError.value = true
}
</script>

<template>
  <view class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
    <view class="flex items-center gap-3">
      <image
        v-if="props.user.avatar && !avatarError"
        :src="props.user.avatar"
        mode="aspectFill"
        class="h-12 w-12 shrink-0 rounded-full border border-[#e8e4dc]"
        @error="onAvatarError"
      />
      <view
        v-else
        class="h-12 w-12 flex shrink-0 items-center justify-center rounded-full bg-[#a33327] text-lg text-white font-bold"
      >
        {{ props.user.name.slice(0, 1) }}
      </view>
      <view class="min-w-0 flex-1">
        <view class="flex items-center gap-2">
          <text class="truncate text-base text-[#1a1a1a] font-bold">{{ props.user.name }}</text>
          <text class="shrink-0 text-xs text-[#a33327]">{{ formatDistance(props.user.distanceM) }}</text>
        </view>
        <text v-if="props.user.locationName" class="mt-0.5 block truncate text-xs text-[#999]">
          {{ props.user.locationName }}
        </text>
      </view>
      <wd-button
        size="small"
        custom-style="background-color: #a33327; border-color: #a33327; border-radius: 999px;"
        @click="emit('message', props.user)"
      >
        留言
      </wd-button>
    </view>

    <view v-if="props.user.topForms.length" class="mt-3 flex flex-wrap gap-2">
      <wd-tag
        v-for="form in props.user.topForms"
        :key="form"
        plain
        custom-style="color: #a33327; border-color: #d9c4b8;"
      >
        {{ form }}
      </wd-tag>
    </view>

    <text v-if="props.user.bio" class="mt-3 block text-sm text-[#555] leading-relaxed">
      {{ props.user.bio }}
    </text>
  </view>
</template>
