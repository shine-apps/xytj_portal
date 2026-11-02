import { computed } from 'vue'
import { useSettingsStore } from '@/store/settings'

/**
 * 确保 settings 就绪后再渲染页面：
 * - setup 时触发 fetchSettings（store 内部仅做并发去重，数据缓存由后端负责）
 * - 首次拉取完成后就绪，失败则降级渲染默认值
 */
export default function useSettingsReady() {
  const settingsStore = useSettingsStore()
  settingsStore.fetchSettings()
  const isReady = computed(() => settingsStore.isReady)
  const retry = () => settingsStore.refreshSettings()
  return { isReady, retry }
}
