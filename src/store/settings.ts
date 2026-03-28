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

    const showVideo = computed(() => {
      return settingsMap.value.showVideo === 'true'
    })

    const phoneNumber = computed(() => {
      return settingsMap.value.phoneNumber || '15706725301'
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
      showVideo,
      phoneNumber,
      fetchSettings,
      refreshSettings,
    }
  },
  {
    persist: false,
  },
)
