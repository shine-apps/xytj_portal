import { computed } from 'vue'
import { useSettingsStore } from '@/store/settings'

/**
 * 确保 settings 就绪后再渲染页面：
 * - setup 时触发一次 fetchSettings（store 内部有缓存与并发去重）
 * - 有本地缓存时 isReady 立即为 true（秒开），无缓存时等待拉取完成（失败则降级渲染默认值）
 */
export default function useSettingsReady() {
  const settingsStore = useSettingsStore()
  settingsStore.fetchSettings()
  const isReady = computed(() => settingsStore.isReady)
  const retry = () => settingsStore.refreshSettings()
  return { isReady, retry }
}
