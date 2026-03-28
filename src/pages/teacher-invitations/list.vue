<script lang="ts" setup>
import type { ITeacherInvitation } from '@/service/teacher-invitation'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { ref } from 'vue'
import { listMyInvitationsAPI } from '@/service/teacher-invitation'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '我的邀请列表',
  },
})

const userStore = useUserStore()
const paging = ref<any>(null)
const invitations = ref<ITeacherInvitation[]>([])
const loading = ref(false)

onLoad(() => {
})

async function loadData() {
  loading.value = true
  try {
    const res = await listMyInvitationsAPI()
    invitations.value = res
  }
  catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
    paging.value?.complete(true)
  }
}

function formatTime(time: string) {
  if (!time)
    return ''
  return dayjs(time).format('MM-DD HH:mm')
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

function getStatusText(status: string) {
  const map: Record<string, string> = {
    OPEN: '申请中',
    FILLED: '已接受',
    CANCELLED: '已取消',
    CLOSED: '已关闭',
  }
  return map[status] || status
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    OPEN: 'bg-green-100 text-green-700',
    FILLED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
    CLOSED: 'bg-gray-100 text-gray-500',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/teacher-invitations/detail?id=${id}` })
}

function goToCreate() {
  if (!userStore.hasValidLogin) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/teacher-invitations/create' })
}
</script>

<template>
  <z-paging ref="paging" refresher-enabled @query="loadData">
    <view class="min-h-screen bg-[#f7f7f7]">
      <view class="p-4">
        <view
          v-for="item in invitations"
          :key="item.id"
          class="mb-4 rounded-lg bg-white p-4 shadow-sm active:bg-gray-50"
          @click="goToDetail(item.id)"
        >
          <view class="mb-2 flex items-start justify-between">
            <view class="flex flex-1 items-center gap-2">
              <text class="text-sm text-gray-500">联系人:</text>
              <text class="line-clamp-1 text-lg text-gray-900 font-bold">
                {{ item.contactName }}
              </text>
            </view>
            <text
              class="ml-2 rounded px-2 py-0.5 text-xs"
              :class="getStatusClass(item.status)"
            >
              {{ getStatusText(item.status) }}
            </text>
          </view>

          <view class="mb-2 flex items-center text-sm text-gray-600">
            <view class="i-carbon-time mr-2 text-base" />
            <text>{{ formatTime(item.startTime) }} ~ {{ formatTime(item.endTime) }}</text>
          </view>

          <view class="mb-2 flex items-center text-sm text-gray-600">
            <view class="i-carbon-location mr-2 text-base" />
            <text class="line-clamp-1">{{ formatLocation(item.location) }}</text>
          </view>

          <view class="flex items-center justify-between text-sm">
            <view class="flex items-center text-gray-500">
              <view class="i-carbon-user-multiple mr-1" />
              <text>{{ item.minStudents }}-{{ item.maxStudents }}人</text>
            </view>
            <view v-if="item.feeNegotiable" class="text-[#a33327] font-medium">
              费用面议
            </view>
            <view v-else-if="item.fee" class="text-[#a33327] font-medium">
              ¥{{ item.fee }}
            </view>
          </view>

          <view v-if="item.accommodationCover || item.travelCover" class="mt-2 flex gap-2">
            <text
              v-if="item.accommodationCover"
              class="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
            >
              报销住宿
            </text>
            <text
              v-if="item.travelCover"
              class="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
            >
              报销车旅
            </text>
          </view>
        </view>

        <view v-if="invitations.length === 0 && !loading" class="py-20 text-center text-gray-400">
          暂无邀请
        </view>
      </view>

      <view
        class="fixed bottom-20 right-4 h-14 w-14 flex items-center justify-center rounded-full bg-[#a33327] shadow-lg active:scale-95"
        @click="goToCreate"
      >
        <view class="i-carbon-add text-2xl text-white" />
      </view>
    </view>
  </z-paging>
</template>
