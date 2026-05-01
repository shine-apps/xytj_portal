import type { ISetting } from '@/api/settings'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSettings } from '@/api/settings'

export interface BannerItem {
  value: string
  poster?: string
  type: 'image' | 'video'
  isActive: boolean
}

export const useSettingsStore = defineStore(
  'settings',
  () => {
    const settings = ref<ISetting[]>([])
    const isLoaded = ref(false)
    const lastFetchTime = ref<number>(0)
    const CACHE_DURATION = 5 * 60 * 1000

    const settingsMap = computed(() => {
      const map: Record<string, any> = {}
      for (const setting of settings.value) {
        map[setting.key] = setting.value
      }
      return map
    })

    const banners = computed<BannerItem[]>(() => {
      const bannersValue = settingsMap.value.banners
      if (!bannersValue)
        return []
      try {
        if (typeof bannersValue === 'string') {
          return JSON.parse(bannersValue) as BannerItem[]
        }
        return Array.isArray(bannersValue) ? bannersValue : []
      }
      catch {
        return []
      }
    })

    const showVideo = computed(() => {
      return settingsMap.value.showVideo === 'true'
    })

    const phoneNumber = computed(() => {
      return settingsMap.value.phoneNumber || '15706725301'
    })

    const isCacheExpired = () => {
      if (!lastFetchTime.value)
        return true
      return Date.now() - lastFetchTime.value > CACHE_DURATION
    }

    const fetchSettings = async () => {
      if (isLoaded.value && !isCacheExpired())
        return settings.value

      try {
        const res = await getSettings()
        settings.value = res
        isLoaded.value = true
        lastFetchTime.value = Date.now()
        return res
      }
      catch (e) {
        console.error('Fetch settings failed', e)
        return []
      }
    }

    const refreshSettings = async () => {
      isLoaded.value = false
      lastFetchTime.value = 0
      return fetchSettings()
    }

    return {
      settings,
      isLoaded,
      lastFetchTime,
      settingsMap,
      banners,
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
