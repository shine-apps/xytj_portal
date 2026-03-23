<script lang="ts" setup>
import type ActivityMembersPanel from '@/components/ActivityMembersPanel.vue'
import type { IActivity } from '@/service/activity'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { ref } from 'vue'
import { getActivityDetailAPI } from '@/service/activity'

definePage({
  style: {
    navigationBarTitleText: '活动详情',
  },
})

const activityId = ref('')
const activity = ref<IActivity | null>(null)
const membersPanelRef = ref<InstanceType<typeof ActivityMembersPanel> | null>(null)

// Loading states
const loading = ref(false)

onLoad((options) => {
  if (options && options.id) {
    activityId.value = options.id
    loadData()
  }
})

async function loadData() {
  if (!activityId.value)
    return
  loading.value = true
  try {
    const res = await getActivityDetailAPI(activityId.value, false)
    activity.value = res
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

// Format Helpers
function formatTime(time: string) {
  if (!time)
    return ''
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

function formatLocation(loc: any) {
  if (!loc)
    return '地点待定'
  if (typeof loc === 'string') {
    try {
      if (loc.startsWith('{') || loc.startsWith('[')) {
        const obj = JSON.parse(loc)
        return obj.address || obj.name || loc
      }
      return loc
    }
    catch {
      return loc
    }
  }
  if (typeof loc === 'object') {
    return loc.address || loc.name || '未知地点'
  }
  return String(loc)
}
</script>

<template>
  <view class="min-h-screen bg-[#f7f7f7] pb-24">
    <view v-if="activity">
      <!-- Header Image -->
      <view class="relative h-60 w-full">
        <image
          :src="activity.coverUrl || 'https://images.unsplash.com/photo-1544367563-12123d895951?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'"
          class="h-full w-full object-cover"
          mode="aspectFill"
        />
        <view class="absolute inset-0 from-black/60 to-transparent bg-gradient-to-t" />
        <view class="absolute bottom-4 left-4 right-4 text-white">
          <text class="text-2xl font-bold">{{ activity.title }}</text>
        </view>
      </view>

      <!-- Basic Info -->
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 flex items-start space-x-3">
          <view class="i-carbon-time mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              活动时间
            </view>
            <view class="text-sm text-gray-600">
              {{ formatTime(activity.startTime) }} ~ {{ formatTime(activity.endTime) }}
            </view>
          </view>
        </view>

        <view class="flex items-start space-x-3">
          <view class="i-carbon-location mt-1 text-lg text-[#a33327]" />
          <view>
            <view class="text-gray-900 font-medium">
              活动地点
            </view>
            <view class="text-sm text-gray-600">
              {{ formatLocation(activity.location) }}
            </view>
          </view>
        </view>
      </view>

      <!-- Content -->
      <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
        <view class="mb-3 border-b border-gray-100 pb-2 text-lg text-gray-900 font-bold">
          活动详情
        </view>
        <rich-text :nodes="activity.content || activity.summary || '暂无详情'" class="text-gray-700 leading-relaxed" />
      </view>

      <!-- Members Panel Component -->
      <ActivityMembersPanel
        v-if="activityId"
        ref="membersPanelRef"
        :activity-id="activityId"
      />
    </view>
  </view>
</template>
