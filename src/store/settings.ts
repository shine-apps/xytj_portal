import type { ISetting } from '@/api/settings'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSettings } from '@/api/settings'

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<ISetting[]>([])
    const isLoaded = ref(false)

    const settingsMap = computed(() => {
      const map: Record<string, string> = {}
      for (const setting of settings.value) {
        map[setting.key] = setting.value
      }
      return map
    })

    const hiddenVideo = computed(() => {
      return settingsMap.value.hiddenVideo === 'true'
    })

    const hiddenActivity = computed(() => {
      return settingsMap.value.hiddenActivity === 'true'
    })

    const fetchSettings = async () => {
      if (isLoaded.value)
        return settings.value

      try {
        const res = await getSettings()
        settings.value = res
        isLoaded.value = true
        return res
      }
      catch (e) {
        console.error('Fetch settings failed', e)
        return []
      }
    }

    const refreshSettings = async () => {
      isLoaded.value = false
      return fetchSettings()
    }

    return {
      settings,
      isLoaded,
      settingsMap,
      hiddenVideo,
      hiddenActivity,
      fetchSettings,
      refreshSettings,
    }
  },
  {
    persist: false,
  },
)
