<template>
  <view class="min-h-screen bg-gray-100">
    <z-paging
      ref="paging"
      v-model="subscriptionList"
      :auto="true"
      :hide-empty-view="false"
      @query="queryList"
    >
      <!-- 空状态 -->
      <view
        v-if="subscriptionList.length === 0 && !loading"
        class="flex flex-col items-center justify-center pt-32"
      >
        <text class="i-carbon-document text-6xl text-gray-300" />
        <view class="mt-4 text-base text-gray-500">
          暂无订阅,去发现好课程
        </view>
        <view
          class="mt-6 rounded-full bg-amber-500 px-6 py-2 text-sm text-white font-medium shadow active:bg-amber-600"
          @click="goToCourses"
        >
          去浏览课程
        </view>
      </view>

      <!-- 订阅卡片列表 -->
      <view v-else class="p-4">
        <view
          v-for="item in subscriptionList"
          :key="item.id"
          class="mb-3 flex items-start overflow-hidden rounded-xl bg-white p-3 shadow-sm transition active:bg-gray-50"
          @click="onItemClick(item)"
        >
          <!-- 课程封面 -->
          <view class="mr-3 h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
            <image
              v-if="item.collection.coverUrl"
              :src="item.collection.coverUrl"
              mode="aspectFill"
              class="h-full w-full"
            />
            <view v-else class="h-full w-full flex items-center justify-center text-gray-400">
              <text class="i-carbon-video text-2xl" />
            </view>
          </view>

          <!-- 课程信息 -->
          <view class="min-w-0 flex-1">
            <view class="mb-1 flex items-start justify-between gap-2">
              <view class="line-clamp-2 text-sm font-bold">
                {{ item.collection.title }}
              </view>
              <!-- 状态徽章 -->
              <view
                v-if="item.isActive"
                class="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700 font-medium"
              >
                有效
              </view>
              <view
                v-else
                class="flex-shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-600 font-medium"
              >
                已过期
              </view>
            </view>

            <view class="mb-1 text-xs text-gray-400">
              订阅: {{ formatDate(item.startedAt) }} ~ {{ formatDate(item.expiresAt) }}
            </view>

            <view class="flex items-center justify-between text-xs">
              <text v-if="item.isActive && item.remainingDays > 0" class="text-amber-600 font-medium">
                剩余 {{ item.remainingDays }} 天
              </text>
              <text v-else-if="item.isActive" class="text-amber-600 font-medium">
                今天到期
              </text>
              <text v-else class="text-gray-400">
                已于 {{ formatDate(item.expiresAt) }} 过期
              </text>
              <text class="text-gray-400">
                {{ item.collection.durationDays }} 天订阅
              </text>
            </view>
          </view>
        </view>

        <!-- 底部信息 -->
        <view v-if="subscriptionList.length > 0" class="mt-2 pb-4 text-center text-xs text-gray-400">
          共 {{ subscriptionList.length }} 条订阅
        </view>
      </view>
    </z-paging>
  </view>
</template>

<script setup lang="ts">
import type { IMySubscription } from '@/api/subscriptions'
import dayjs from 'dayjs'
import { ref } from 'vue'
import { useSubscriptionStore } from '@/store/subscription'

definePage({
  name: 'my-subscriptions',
  style: {
    navigationBarTitleText: '我的订阅',
  },
  // 需要登录才能查看
  excludeLoginPath: false,
})

const subscriptionStore = useSubscriptionStore()
const paging = ref<any>(null)
const subscriptionList = ref<IMySubscription[]>([])
const loading = ref(true)

async function queryList() {
  loading.value = true
  try {
    await subscriptionStore.fetchMySubscriptions(true)
    subscriptionList.value = subscriptionStore.mySubscriptions
    paging.value.complete(subscriptionList.value)
  }
  catch (e) {
    console.error('Fetch my subscriptions failed', e)
    paging.value.complete(false)
  }
  finally {
    loading.value = false
  }
}

function onItemClick(item: IMySubscription) {
  uni.navigateTo({
    url: `/pages/courses/detail?id=${item.collection.id}`,
  })
}

function goToCourses() {
  uni.switchTab({ url: '/pages/courses/courses' })
}

function formatDate(date: string) {
  if (!date)
    return ''
  return dayjs(date).format('YYYY-MM-DD')
}
</script>

<style lang="scss" scoped>
</style>
