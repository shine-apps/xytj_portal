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
    // 是否持有数据（新拉取或从本地缓存恢复），持久化以便冷启动秒开
    const hasData = ref(false)
    // 最近一次拉取是否失败（失败时降级渲染默认值，避免无限 loading）
    const fetchError = ref(false)
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

    // 有数据（缓存或新拉取）或拉取失败（降级渲染）即视为就绪
    const isReady = computed(() => hasData.value || fetchError.value)

    const isCacheExpired = () => {
      if (!lastFetchTime.value)
        return true
      return Date.now() - lastFetchTime.value > CACHE_DURATION
    }

    // 进行中的请求 Promise，用于并发去重（App.vue 与页面同时触发时只发一次请求）
    let fetchPromise: Promise<ISetting[]> | null = null

    const fetchSettings = (): Promise<ISetting[]> => {
      if (isLoaded.value && !isCacheExpired())
        return Promise.resolve(settings.value)
      if (fetchPromise)
        return fetchPromise

      fetchPromise = getSettings()
        .then((res) => {
          settings.value = res
          isLoaded.value = true
          hasData.value = true
          fetchError.value = false
          lastFetchTime.value = Date.now()
          return res
        })
        .catch((e) => {
          console.error('Fetch settings failed', e)
          fetchError.value = true
          return []
        })
        .finally(() => {
          fetchPromise = null
        })
      return fetchPromise
    }

    const refreshSettings = () => {
      isLoaded.value = false
      lastFetchTime.value = 0
      return fetchSettings()
    }

    return {
      settings,
      isLoaded,
      lastFetchTime,
      hasData,
      fetchError,
      isReady,
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
    // 持久化到本地（uni storage）：冷启动秒开渲染缓存数据；缓存未过期（isLoaded + lastFetchTime）则不发请求，过期则后台静默刷新
    persist: {
      pick: ['settings', 'isLoaded', 'lastFetchTime', 'hasData'],
    },
  },
)
