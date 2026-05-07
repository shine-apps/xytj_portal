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

export interface HotLinkItem {
  url: string
  type: 'course' | 'activity' | 'article'
  title: string
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
        const banners: BannerItem[] = Array.isArray(bannersValue) ? bannersValue : []
        banners.forEach((item) => {
          if (item.type === 'video' && !item.poster) {
            item.poster = `${item.value}?ci-process=snapshot&time=1`
          }
        })
        return banners
      }
      catch {
        return []
      }
    })

    const showVideo = computed(() => {
      return settingsMap.value.showVideo
    })

    const phoneNumber = computed(() => {
      return settingsMap.value.phoneNumber || '15706725301'
    })

    const hotLinks = computed<HotLinkItem[]>(() => {
      const hotLinksValue = settingsMap.value.hotLinks
      if (!hotLinksValue)
        return []
      try {
        const links: HotLinkItem[] = Array.isArray(hotLinksValue) ? hotLinksValue : []
        return links.filter(link => link.isActive)
      }
      catch {
        return []
      }
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
      hotLinks,
      fetchSettings,
      refreshSettings,
    }
  },
  {
    persist: false,
  },
)
