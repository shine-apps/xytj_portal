<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { useUserStore } from '@/store/user'
import share, { setPageShareConfig } from '@/utils/share'

const url = ref('')
const title = ref('')
const userStore = useUserStore()

onLoad((options) => {
  share.onLoad()

  if (options?.url) {
    let targetUrl = decodeURIComponent(options.url)
    if (userStore.hasValidLogin && userStore.tokenInfo.token) {
      const token = userStore.tokenInfo.token
      const separator = targetUrl.includes('?') ? '&' : '?'
      targetUrl = `${targetUrl}${separator}token=${encodeURIComponent(token)}`
    }
    url.value = targetUrl
  }
  if (options?.title) {
    title.value = decodeURIComponent(options.title)
    uni.setNavigationBarTitle({
      title: title.value,
    })
    setPageShareConfig({
      onShareAppMessage: () => {
        const shareOptions = { url: options?.url, title: options?.title }
        const queryString = Object.keys(shareOptions)
          .filter(key => shareOptions[key as keyof typeof shareOptions])
          .map(key => `${key}=${encodeURIComponent(shareOptions[key as keyof typeof shareOptions] as string)}`)
          .join('&')
        return {
          title: title.value,
          path: `/pages/webview/webview${queryString ? `?${queryString}` : ''}`,
        }
      },
      onShareTimeline: () => ({
        title: title.value,
      }),
    })
  }
})

function onMessage(e: any) {
  console.log('webview message:', e.detail.data)
}
</script>

<template>
  <view class="h-screen w-full">
    <web-view :src="url" @message="onMessage" />
  </view>
</template>
