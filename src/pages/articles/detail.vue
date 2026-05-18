<script setup lang="ts">
import type { Article } from '@/api/article'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { ref } from 'vue'
import { getArticleById } from '@/api/article'
import CustomRichText from '@/components/CustomRichText.vue'
import { setPageShareConfig } from '@/utils/share'

definePage({
  name: 'article-detail',
  style: {
    navigationBarTitleText: '文章详情',
  },
  excludeLoginPath: false,
})

const article = ref<Article | null>(null)
const loading = ref(true)
const isLinkType = ref(false)

onLoad(async (options) => {
  if (options && options.id) {
    try {
      const res = await getArticleById(options.id)
      article.value = (res as any).data || res

      if (article.value && article.value.type === 'LINK' && article.value.linkUrl) {
        isLinkType.value = true
      }
      // set title and share config
      uni.setNavigationBarTitle({
        title: article.value?.title || '文章详情',
      })

      setPageShareConfig({
        onShareAppMessage: () => {
          if (!article.value)
            return {}
          return {
            title: article.value.title,
            path: `/pages/articles/detail?id=${article.value.id}`,
          }
        },
        onShareTimeline: () => {
          if (!article.value)
            return {}
          return {
            title: article.value.title,
            query: `id=${article.value.id}`,
          }
        },
      })
    }
    catch (e) {
      uni.showToast({ title: '获取数据失败', icon: 'none' })
    }
    finally {
      loading.value = false
    }
  }
})

function goToArticleList() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    const prevPage = pages[pages.length - 2]
    if (prevPage.route === 'pages/articles/list') {
      uni.navigateBack()
      return
    }
  }
  uni.navigateTo({
    url: '/pages/articles/list',
  })
}

function goToHome() {
  uni.switchTab({
    url: '/pages/index/index',
  })
}
</script>

<template>
  <view class="min-h-screen bg-gray-50 pb-10">
    <view v-if="loading" class="h-screen flex items-center justify-center">
      <wd-loading />
    </view>

    <template v-else-if="article">
      <template v-if="isLinkType">
        <web-view class="min-h-screen w-full" :src="article.linkUrl" />
      </template>

      <template v-else>
        <view class="relative aspect-video w-full">
          <image
            :src="article.coverUrl || '/static/logo.png'"
            class="h-full w-full object-contain"
            mode="aspectFit"
          />
          <view class="absolute inset-0 from-black/40 via-transparent to-black/80 bg-gradient-to-b" />

          <view class="absolute bottom-0 w-full p-6 text-left text-white">
            <text class="text-2xl font-bold tracking-widest">{{ article.title }}</text>
            <view class="mt-3 flex items-center gap-3">
              <text class="inline-block rounded-full bg-white/20 px-4 py-1 text-sm backdrop-blur">
                {{ dayjs(article.createdAt).format('YYYY-MM-DD') }}
              </text>
              <text v-if="article.viewCount" class="text-sm text-white/60">{{ article.viewCount }} 次阅读</text>
            </view>
          </view>
        </view>

        <view class="relative z-10 min-h-[50vh] rounded-t-3xl bg-white p-6 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <view class="mx-auto mb-8 h-1.5 w-12 rounded-full bg-gray-200" />

          <view v-if="article.summary" class="mb-6 rounded-xl bg-gray-50 p-4">
            <view class="mb-2 flex items-center gap-2">
              <view class="h-4 w-1 rounded-full bg-primary" />
              <text class="text-sm text-gray-500 font-medium">摘要</text>
            </view>
            <text class="text-sm text-gray-600 leading-relaxed">{{ article.summary }}</text>
          </view>

          <view class="text-[15px] text-gray-600 leading-8 tracking-wide">
            <CustomRichText :content="article.content || ''" :selectable="true" space="nbsp" class-name="text-gray-700" />
          </view>

          <view class="mb-4 mt-12 flex justify-center gap-4">
            <view
              class="flex items-center gap-1 border border-gray-200 rounded-full bg-gray-50 px-5 py-2 text-sm text-gray-500 transition-colors active:bg-gray-100"
              @tap="goToArticleList"
            >
              <text>返回列表</text>
              <view class="i-carbon-chevron-right text-xs" />
            </view>

            <view
              class="flex items-center gap-1 border border-gray-200 rounded-full bg-gray-50 px-5 py-2 text-sm text-gray-500 transition-colors active:bg-gray-100"
              @tap="goToHome"
            >
              <view class="i-carbon-home text-xs" />
              <text>翔云主页</text>
            </view>
          </view>
        </view>
      </template>
    </template>

    <view v-else class="h-screen flex flex-col items-center justify-center text-gray-400">
      <view class="i-carbon-error mb-4 text-5xl" />
      <text>文章不存在</text>
    </view>
  </view>
</template>
