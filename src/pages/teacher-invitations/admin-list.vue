<script lang="ts" setup>
import type { ITeacherInvitation } from '@/service/teacher-invitation'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { ref } from 'vue'
import {
  getPendingInvitationsCountAPI,
  listAllInvitationsAPI,
} from '@/service/teacher-invitation'
import { formatTime } from '@/utils/dateUtil'

definePage({
  style: {
    navigationBarTitleText: '上课申请管理',
  },
})

const paging = ref<any>(null)
const list = ref<ITeacherInvitation[]>([])
const pendingCount = ref(0)
const filterStatus = ref<string>('all')

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/teacher-invitations/detail?id=${id}` })
}

onLoad(() => {
  loadPendingCount()
})

async function loadData(pageNo: number, pageSize: number) {
  try {
    const params: any = {
      page: pageNo,
      pageSize,
    }
    if (filterStatus.value !== 'all') {
      params.status = filterStatus.value
    }

    const res = await listAllInvitationsAPI(params)
    paging.value?.complete(res.list)
    list.value = res.list
  }
  catch (e: any) {
    console.error(e)
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
    paging.value?.complete(false)
  }
}

async function loadPendingCount() {
  try {
    const count = await getPendingInvitationsCountAPI()
    pendingCount.value = count
  }
  catch (e) {
    console.error('Failed to load pending count', e)
  }
}

function changeFilter(status: string) {
  filterStatus.value = status
  paging.value?.reload()
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
    OPEN: '待审核',
    ACCEPTED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
    CLOSED: '已关闭',
  }
  return map[status] || status
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    OPEN: 'bg-orange-100 text-orange-600',
    ACCEPTED: 'bg-green-100 text-green-600',
    REJECTED: 'bg-red-100 text-red-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
    CLOSED: 'bg-gray-100 text-gray-500',
  }
  return map[status] || 'bg-gray-100 text-gray-500'
}
</script>

<template>
  <z-paging ref="paging" refresher-enabled @query="loadData">
    <!-- 统计卡片 -->
    <view class="m-4 rounded-lg bg-white p-4 shadow-sm">
      <view class="flex items-center justify-between">
        <view>
          <text class="text-sm text-gray-500">待审核申请</text>
          <view class="mt-1 text-2xl text-[#a33327] font-bold">
            {{ pendingCount }}
          </view>
        </view>
        <view class="h-12 w-12 flex items-center justify-center rounded-full bg-orange-50">
          <view class="i-carbon-notification text-xl text-[#a33327]" />
        </view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="sticky top-0 z-10 m-4 rounded-lg bg-white p-2 shadow-sm">
      <view class="flex">
        <text
          class="flex-1 rounded py-2 text-center text-sm transition-colors"
          :class="filterStatus === 'all' ? 'bg-[#a33327] text-white' : 'text-gray-600'"
          @click="changeFilter('all')"
        >
          全部
        </text>
        <text
          class="flex-1 rounded py-2 text-center text-sm transition-colors"
          :class="filterStatus === 'OPEN' ? 'bg-[#a33327] text-white' : 'text-gray-600'"
          @click="changeFilter('OPEN')"
        >
          待审核
        </text>
        <text
          class="flex-1 rounded py-2 text-center text-sm transition-colors"
          :class="filterStatus === 'ACCEPTED' ? 'bg-[#a33327] text-white' : 'text-gray-600'"
          @click="changeFilter('ACCEPTED')"
        >
          已通过
        </text>
        <text
          class="flex-1 rounded py-2 text-center text-sm transition-colors"
          :class="filterStatus === 'REJECTED' ? 'bg-[#a33327] text-white' : 'text-gray-600'"
          @click="changeFilter('REJECTED')"
        >
          已拒绝
        </text>
      </view>
    </view>

    <!-- 列表 -->
    <view class="px-4">
      <view
        v-for="item in list"
        :key="item.id"
        class="mb-4 rounded-lg bg-white p-4 shadow-sm"
      >
        <view class="mb-3 flex items-start justify-between">
          <view class="flex items-center gap-2">
            <text class="rounded px-2 py-0.5 text-xs font-medium" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </text>
            <text class="text-sm text-gray-400">{{ dayjs(item.createdAt).format('MM-DD HH:mm') }}</text>
          </view>
          <text class="text-sm text-gray-500">{{ item.contactName }}</text>
        </view>

        <view class="mb-2 flex items-center text-sm text-gray-600">
          <view class="i-carbon-time mr-2 text-base" />
          <text>{{ formatTime(item.startTime) }} ~ {{ formatTime(item.endTime) }}</text>
        </view>

        <view class="mb-2 flex items-center text-sm text-gray-600">
          <view class="i-carbon-location mr-2 text-base" />
          <text class="line-clamp-1">{{ formatLocation(item.location) }}</text>
        </view>

        <view class="mb-3 flex items-center justify-between text-sm">
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

        <!-- 查看详情 -->
        <view class="mt-3 border-t border-gray-100 pt-3">
          <button
            class="w-full rounded-lg bg-gray-100 py-2 text-sm text-gray-600 font-medium"
            @click="goToDetail(item.id)"
          >
            查看详情
          </button>
        </view>
      </view>
    </view>
  </z-paging>
</template>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
