<template>
  <view class="h-full">
    <z-paging ref="paging" v-model="dataList" @query="queryList">
      <view class="p-4">
        <view
          v-for="item in dataList" :key="item.id"
          class="mb-4 overflow-hidden rounded-lg bg-white shadow"
          @click="goToDetail(item.id)"
        >
          <image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" class="h-40 w-full" />
          <view class="p-3">
            <view class="flex items-center justify-between">
              <view class="truncate text-lg font-bold">
                {{ item.title }}
              </view>
              <view class="text-sm font-bold" :class="item.price > 0 ? 'text-red-500' : 'text-green-500'">
                {{ item.price > 0 ? `¥${item.price}` : '免费' }}
              </view>
            </view>
            <view class="line-clamp-2 mt-1 text-sm text-gray-500">
              {{ item.description || "No description" }}
            </view>
            <view class="mt-2 flex items-center justify-between text-xs">
              <text class="text-gray-400">{{ item._count?.videos || 0 }} 个视频</text>
              <view>
                <text v-if="purchasedCollections.includes(item.id)" class="text-green-500">已购买</text>
                <text v-else class="text-gray-400">{{ formatDate(item.createdAt) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </z-paging>
  </view>
</template>

<script setup lang="ts">
import type { ICollection } from '@/service/collections'
import dayjs from 'dayjs'
import { ref, onMounted } from 'vue'
import { getCollectionsAPI, getPurchasesAPI } from '@/service/collections'

definePage({
  style: {
    navigationBarTitleText: '线上课程',
  },
})

const paging = ref<any>(null)
const dataList = ref<ICollection[]>([])
const purchasedCollections = ref<string[]>([])

onMounted(() => {
  // Get user's purchased collections
  getPurchasedCollections()
})

async function getPurchasedCollections() {
  try {
    const purchases = await getPurchasesAPI()
    purchasedCollections.value = purchases.map(purchase => purchase.collection.id)
  } catch (error) {
    console.error('Error getting purchased collections:', error)
  }
}

async function queryList(pageNo: number, pageSize: number) {
  // Since the API returns all data at once, we only fetch on the first page
  if (pageNo > 1) {
    paging.value.complete([])
    return
  }
  try {
    const res = await getCollectionsAPI()
    paging.value.complete(res)
  }
  catch (e) {
    paging.value.complete(false)
  }
}

function goToDetail(id: string) {
  uni.navigateTo({ url: `/pages/courses/detail?id=${id}` })
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}
</script>

<style lang="scss" scoped></style>
