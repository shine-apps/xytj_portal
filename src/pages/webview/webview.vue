<script lang="ts" setup>
import { onLoad } from '@dcloudio/uni-app'
import { onMounted, ref } from 'vue'

const url = ref('')
const title = ref('')

onLoad((options) => {
  if (options?.url) {
    url.value = decodeURIComponent(options.url)
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
