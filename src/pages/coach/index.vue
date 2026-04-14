<script setup lang="ts">
import type { Coach } from '@/api/coach'
import { ref } from 'vue'
import { getCoaches } from '@/api/coach'

definePage({
  name: 'coach-list',
  style: {
    navigationBarTitleText: '教练团队',
  },
})

const paging = ref<any>(null)
const coachList = ref<Coach[]>([])

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getCoaches({ page: pageNo, pageSize })
    const list = res.list || (res as any).data?.list || []
    const total = res.total || (res as any).data?.total || list.length
    // 传入数据和总条数，让 z-paging 正确处理分页
    paging.value.complete(list, total)
  }
  catch (e) {
    paging.value.complete(false)
  }
}

function goToDetail(item: Coach) {
  uni.navigateTo({
    url: `/pages/coach/detail?id=${item.id}`,
  })
}
</script>

<template>
  <z-paging ref="paging" v-model="coachList" @query="queryList">
    <view class="bg-light">
      <!-- 水墨风头部 -->
      <view class="relative h-44 flex items-center justify-center overflow-hidden">
        <view class="absolute inset-0 z-0 from-gray-800 to-gray-900 bg-gradient-to-b opacity-90" />
        <!-- 背景装饰 -->
        <view class="absolute top-0 z-0 opacity-10 -right-20">
          <view class="h-64 w-64 rounded-full bg-white blur-3xl" />
        </view>

        <view class="relative z-10 text-center">
          <text class="relative mb-2 inline-block text-3xl text-white tracking-[0.2em]">
            教练团队
            <view class="absolute left-1/2 h-1 w-12 rounded-full bg-white/50 -bottom-2 -translate-x-1/2" />
          </text>
          <view class="mt-4 text-sm text-white/70 tracking-wide">
            传承太极精髓 弘扬武术文化
          </view>
        </view>
      </view>

      <!-- 列表区 -->
      <view class="relative z-20 rounded-t-2xl bg-white px-4 pb-4 -mt-6">
        <view class="flex flex-col gap-4 py-2">
          <view
            v-for="item in coachList" :key="item.id"
            class="flex transform overflow-hidden border border-gray-100 rounded-xl bg-white shadow-sm transition active:scale-95"
            @tap="goToDetail(item)"
          >
            <!-- 头像部分 -->
            <view class="relative h-36 w-32 shrink-0 overflow-hidden bg-gray-100">
              <image
                :src="item.avatar || '/static/default-avatar.png'" mode="aspectFill"
                class="h-full w-full object-cover"
              />
              <view class="absolute bottom-0 left-0 right-0 h-1/2 from-black/50 to-transparent bg-gradient-to-t" />
            </view>

            <!-- 信息部分 -->
            <view class="flex flex-1 flex-col justify-center p-4">
              <view class="mb-2 flex items-center justify-between">
                <text class="text-lg text-gray-800 font-bold">{{ item.name }}</text>
              </view>
              <view
                v-if="item.title"
                class="mb-3 inline-block w-fit rounded bg-primary/10 px-2 py-1 text-xs text-white"
              >
                {{ item.title }}
              </view>

              <!-- 介绍摘要 -->
              <text class="line-clamp-2 text-sm text-gray-500 leading-relaxed">
                <!-- 简单去除 html 标签来做纯文本截断 -->
                {{ item.description ? item.description.replace(/<[^>]+>/g, '') : '暂无介绍' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </z-paging>
</template>
