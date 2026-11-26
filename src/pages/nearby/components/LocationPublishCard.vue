<script setup lang="ts">
import type { NearbyLocationStatus } from '@/service/nearby'
import { ref, watch } from 'vue'

const props = defineProps<{
  location: NearbyLocationStatus | null
  bio: string | null
  savingBio: boolean
}>()

const emit = defineEmits<{
  (e: 'choose-location'): void
  (e: 'toggle-active', nextActive: boolean): void
  (e: 'save-bio', bio: string): void
}>()

const bioPopupVisible = ref(false)
const bioDraft = ref('')

watch(bioPopupVisible, (visible) => {
  if (visible) {
    bioDraft.value = props.bio ?? ''
  }
})

function openBioPopup() {
  bioPopupVisible.value = true
}

function submitBio() {
  const trimmed = bioDraft.value.trim()
  if (!trimmed) {
    uni.showToast({ title: '简介不能为空', icon: 'none' })
    return
  }
  emit('save-bio', trimmed)
}

defineExpose({ closeBioPopup: () => (bioPopupVisible.value = false) })
</script>

<template>
  <view class="border border-[#e8e4dc] rounded-lg bg-[#fffdf9] p-4 shadow-sm">
    <view class="flex items-center justify-between">
      <view class="min-w-0 flex-1">
        <view class="flex items-center gap-2">
          <text class="i-carbon-location text-lg text-[#a33327]" />
          <text class="text-base text-[#1a1a1a] font-bold">我的位置</text>
          <wd-tag v-if="location?.isActive" custom-style="background-color: #a33327; color: #fff;">公开中</wd-tag>
        </view>
        <text v-if="location?.isActive" class="mt-1 block truncate text-sm text-[#666]">
          {{ location.locationName || location.address || '已公开位置' }}
        </text>
        <text v-else class="mt-1 block text-sm text-[#999]">尚未公开位置</text>
      </view>
      <wd-switch
        :model-value="!!location?.isActive"
        size="24px"
        active-color="#a33327"
        @change="(event: { value: boolean }) => emit('toggle-active', event.value)"
      />
    </view>

    <view class="mt-3 flex gap-3 border-t border-[#eee9df] pt-3">
      <wd-button
        block
        plain
        size="small"
        custom-style="color: #a33327; border-color: #a33327; border-radius: 10px;"
        @click="emit('choose-location')"
      >
        {{ location?.isActive ? '重新选点' : '选择位置' }}
      </wd-button>
      <wd-button
        block
        plain
        size="small"
        custom-style="color: #a33327; border-color: #a33327; border-radius: 10px;"
        @click="openBioPopup"
      >
        编辑简介
      </wd-button>
    </view>

    <view v-if="bio" class="mt-3 rounded-md bg-[#f7f3ec] px-3 py-2">
      <text class="text-sm text-[#555]">简介：{{ bio }}</text>
    </view>

    <wd-popup
      v-model="bioPopupVisible"
      position="bottom"
      :close-on-click-modal="true"
      :safe-area-inset-bottom="true"
      custom-style="z-index: 1200; border-radius: 24px 24px 0 0; overflow: hidden; background: #fffdf9;"
    >
      <view class="px-6 pb-6 pt-7">
        <text class="block text-center text-xl text-gray-900 font-bold">一句话简介</text>
        <text class="mt-2 mb-4 block text-center text-sm text-gray-500">让附近拳友快速认识你（≤50 字）</text>
        <view class="border border-[#e8e4dc] rounded-lg bg-white">
          <wd-textarea
            v-model="bioDraft"
            placeholder="例如：每天清晨练陈式太极，欢迎交流"
            :maxlength="50"
            show-word-limit
            auto-height
          />
        </view>
        <view class="mt-5 flex gap-3">
          <wd-button
            block
            plain
            custom-style="color: #a33327; border-color: #a33327; border-radius: 12px;"
            @click="bioPopupVisible = false"
          >
            取消
          </wd-button>
          <wd-button
            block
            :loading="savingBio"
            :disabled="savingBio"
            custom-style="background-color: #a33327; border-color: #a33327; border-radius: 12px;"
            @click="submitBio"
          >
            保存
          </wd-button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>
