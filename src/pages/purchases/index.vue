<template>
  <view class="h-full bg-gray-50">
    <z-paging ref="paging" v-model="purchaseList" @query="queryList">
      <template #top>
        <view class="px-4 py-3 bg-white shadow-sm">
          <view class="text-lg font-bold">购买历史</view>
        </view>
      </template>

      <view class="p-4">
        <view v-if="purchaseList.length === 0" class="text-center py-12 text-gray-500">
          暂无购买记录
        </view>
        <view
          v-for="item in purchaseList" :key="item.id"
          class="mb-4 overflow-hidden rounded-lg bg-white shadow"
          @click="goToDetail(item.collection.id)"
        >
          <image v-if="item.collection.coverUrl" :src="item.collection.coverUrl" mode="aspectFill" class="h-40 w-full" />
          <view class="p-3">
            <view class="flex items-center justify-between">
              <view class="truncate text-lg font-bold">
                {{ item.collection.title }}
              </view>
              <view class="text-sm font-bold text-red-500">
                ¥{{ item.collection.price }}
              </view>
            </view>
            <view class="line-clamp-2 mt-1 text-sm text-gray-500">
              {{ item.collection.description || "No description" }}
            </view>
            <view class="mt-2 flex items-center justify-between text-xs text-gray-400">
              <text>{{ item.collection._count?.videos || 0 }} 个视频</text>
              <text>购买时间: {{ formatDate(item.createdAt) }}</text>
            </view>
          </view>
        </view>
      </view>
    </z-paging>
  </view>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ref } from 'vue'
import { getPurchasesAPI } from '@/service/collections'

definePage({
  style: {
    navigationBarTitleText: '购买历史',
  },
  // 购买历史页需要登录检查
  excludeLoginPath: false,
})

const paging = ref<any>(null)
const purchaseList = ref<{ id: string; collection: any; createdAt: string }[]>([])

async function queryList(pageNo: number, pageSize: number) {
  // Since the API returns all data at once, we only fetch on the first page
  if (pageNo > 1) {
    paging.value.complete([])
    return
  }
  try {
    const res = await getPurchasesAPI()
    purchaseList.value = res
    paging.value.complete(res)
  }
  catch (e) {
    console.error('Error fetching purchases:', e)
    paging.value.complete(false)
  }
}

function goToDetail(id: string) {
  uni.navigateTo({
    url: `/pages/courses/detail?id=${id}`,
  })
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}
</script>

<style lang="scss" scoped>
</style>