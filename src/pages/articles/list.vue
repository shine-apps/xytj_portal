<script setup lang="ts">
import type { Article } from '@/api/article'
import dayjs from 'dayjs'
import { ref } from 'vue'
import { getArticles } from '@/api/article'
import { staticUrl } from '@/utils'

const logoUrl = staticUrl('/static/logo.png')

definePage({
  name: 'article-list',
  style: {
    navigationBarTitleText: '文章资讯',
  },
})

const paging = ref<any>(null)
const articleList = ref<Article[]>([])

async function queryList(pageNo: number, pageSize: number) {
  try {
    const res = await getArticles({ page: pageNo, pageSize, isPublished: true })
    const list = res.list || []
    paging.value?.complete(list)
  }
  catch (e) {
    console.error('获取文章列表失败:', e)
    paging.value?.complete([])
  }
}

function goToDetail(item: Article) {
  if (item.type === 'LINK' && item.linkUrl) {
    uni.navigateTo({
      url: `/pages/webview/webview?url=${encodeURIComponent(item.linkUrl)}&title=${encodeURIComponent(item.title)}`,
    })
  }
  else {
    uni.navigateTo({
      url: `/pages/articles/detail?id=${item.id}`,
    })
  }
}

function goToHome() {
  uni.switchTab({
    url: '/pages/index/index',
  })
}
</script>

<template>
  <z-paging ref="paging" v-model="articleList" @query="queryList">
    <template #top>
      <view class="relative h-40 flex items-center justify-center overflow-hidden">
        <view class="absolute inset-0 z-0 from-gray-800 to-gray-900 bg-gradient-to-b opacity-90" />
        <view class="absolute top-0 z-0 opacity-10 -right-20">
          <view class="h-64 w-64 rounded-full bg-white blur-3xl" />
        </view>

        <view
          class="absolute right-4 top-4 z-20 h-10 w-10 flex items-center justify-center overflow-hidden border-2 border-white/20 rounded-full bg-white/80 p-2 shadow-md active:opacity-70"
          @tap="goToHome"
        >
          <image :src="staticUrl('/static/logo.png')" class="h-full w-full" mode="aspectFill" />
        </view>

        <view class="relative z-10 text-center">
          <text class="relative mb-2 inline-block text-3xl text-white tracking-[0.2em]">
            文章资讯
            <view class="absolute left-1/2 h-1 w-12 rounded-full bg-white/50 -bottom-2 -translate-x-1/2" />
          </text>
          <view class="mt-4 text-sm text-white/70 tracking-wide">
            传统武术 · 太极养生 · 文化传承
          </view>
        </view>
      </view>
    </template>

    <view class="relative z-20 rounded-t-2xl bg-white px-4 pb-4">
      <view class="flex flex-col gap-4 py-2">
        <view
          v-for="item in articleList" :key="item.id"
          class="flex transform overflow-hidden border border-gray-100 rounded-xl bg-white shadow-sm transition active:scale-95"
          @tap="goToDetail(item)"
        >
          <view class="relative h-[120rpx] w-[120rpx] shrink-0 overflow-hidden rounded-l-xl bg-gray-100">
            <image
              :src="item.coverUrl || logoUrl"
              mode="aspectFill"
              class="h-full w-full object-cover"
            />
          </view>

          <view class="flex flex-1 flex-col justify-center p-3">
            <text class="line-clamp-1 mb-1 text-base text-gray-800 font-bold">{{ item.title }}</text>
            <text v-if="item.summary" class="line-clamp-2 mb-2 text-sm text-gray-500 leading-relaxed">{{ item.summary }}</text>
            <text class="text-xs text-gray-400">{{ dayjs(item.createdAt).format('YYYY-MM-DD') }}</text>
          </view>
        </view>
      </view>
    </view>
  </z-paging>
</template>
