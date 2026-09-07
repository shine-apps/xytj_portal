<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { navigateToInterceptor } from '@/router/interceptor'
import { useSettingsStore, useUserStore } from '@/store'
import { initOfflineSyncListener } from '@/utils/practice-offline'

onLaunch(async (options) => {
  console.log('App.vue onLaunch', options)
  const settingsStore = useSettingsStore()
  await settingsStore.fetchSettings()
  const { hasValidLogin, fetchUserInfo } = useUserStore()
  if (hasValidLogin) {
    fetchUserInfo()
  }
  // 练拳打卡：注册离线队列同步监听（网络恢复时自动同步离线打卡）
  initOfflineSyncListener()
})
onShow((options) => {
  console.log('App.vue onShow', options)
  // 处理直接进入页面路由的情况：如h5直接输入路由、微信小程序分享后进入等
  // https://github.com/unibest-tech/unibest/issues/192
  if (options?.path) {
    navigateToInterceptor.invoke({ url: `/${options.path}`, query: options.query })
  }
  else {
    navigateToInterceptor.invoke({ url: '/' })
  }
})
onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">

</style>
