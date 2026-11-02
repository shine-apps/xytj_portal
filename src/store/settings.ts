import type { ISetting } from '@/api/settings'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getSettings } from '@/api/settings'
import { buildVideoCoverUrl } from '@/utils/cos'

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
    // 最近一次拉取是否失败（失败时降级渲染默认值，避免无限 loading）
    const fetchError = ref(false)

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
            item.poster = buildVideoCoverUrl(item.value, { simplified: true })
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

    /** 总打卡挑战 ID（未配置或值非法时为 null） */
    const globalChallengeId = computed<string | null>(() => {
      const v = settingsMap.value.globalPracticeChallengeId
      return typeof v === 'string' && v ? v : null
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

    // 首次拉取完成或失败（降级渲染）即视为就绪
    const isReady = computed(() => isLoaded.value || fetchError.value)

    // 进行中的请求 Promise，用于并发去重（App.vue 与页面同时触发时只发一次请求）
    let fetchPromise: Promise<ISetting[]> | null = null

    const fetchSettings = (): Promise<ISetting[]> => {
      if (fetchPromise)
        return fetchPromise

      fetchPromise = getSettings()
        .then((res) => {
          settings.value = res
          isLoaded.value = true
          fetchError.value = false
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

    const refreshSettings = () => fetchSettings()

    return {
      settings,
      isLoaded,
      fetchError,
      isReady,
      settingsMap,
      banners,
      showVideo,
      phoneNumber,
      globalChallengeId,
      hotLinks,
      fetchSettings,
      refreshSettings,
    }
  },
)
