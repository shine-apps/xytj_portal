<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'
import { useUserStore } from '@/store/user'

const url = ref('')
const title = ref('')
const userStore = useUserStore()

onLoad((options) => {
  if (options?.url) {
    let targetUrl = decodeURIComponent(options.url)
    // 如果用户已登录，将 token 添加到 URL 的 cookie 中
    if (userStore.hasValidLogin && userStore.tokenInfo.token) {
      const token = userStore.tokenInfo.token
      // 使用 jsbridge 方式设置 cookie，或者通过 URL 参数传递
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
  }
})

function onMessage(e: any) {
  console.log('webview message:', e.detail.data)
}
</script>

<template>
  <view class="webview-container">
    <web-view :src="url" @message="onMessage" />
  </view>
</template>

<style lang="scss" scoped>
.webview-container {
  width: 100%;
  height: 100vh;
}
</style>
