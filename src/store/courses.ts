import type { ICollectionDetail, IVideo } from '@/service/collections'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCollectionDetailAPI } from '@/service/collections'

// 缓存项接口
interface CourseCacheItem {
  data: ICollectionDetail
  expiry: number
}

// 缓存过期时间（5分钟）
const CACHE_EXPIRY_TIME = 5 * 60 * 1000
// 最大缓存项数
const MAX_CACHE_ITEMS = 10

export const useCoursesStore = defineStore(
  'courses',
  () => {
    const currentCourse = ref<ICollectionDetail | null>(null)
    const isLoading = ref(false)
    const courseCache = ref<Record<string, CourseCacheItem>>({})

    // 清理过期缓存
    const cleanupCache = () => {
      const now = Date.now()
      const cache = courseCache.value

      for (const courseId in cache) {
        if (cache[courseId].expiry <= now) {
          delete cache[courseId]
        }
      }
    }

    // 检查并限制缓存大小
    const checkCacheSize = () => {
      const cache = courseCache.value
      const cacheKeys = Object.keys(cache)

      if (cacheKeys.length > MAX_CACHE_ITEMS) {
        // 按过期时间排序，删除最旧的缓存项
        const sortedKeys = cacheKeys.sort((a, b) => cache[a].expiry - cache[b].expiry)
        const keysToDelete = sortedKeys.slice(0, cacheKeys.length - MAX_CACHE_ITEMS)

        keysToDelete.forEach((key) => {
          delete cache[key]
        })
      }
    }

    const fetchCourseDetail = async (courseId: string, force = false) => {
      // 清理过期缓存
      cleanupCache()

      // 检查缓存(force=true 时跳过缓存,用于订阅状态变更后强制刷新 isAccessible)
      const cachedItem = courseCache.value[courseId]
      const now = Date.now()

      // 如果缓存存在且未过期，直接返回缓存数据
      if (!force && cachedItem && cachedItem.expiry > now) {
        currentCourse.value = cachedItem.data
        return cachedItem.data
      }

      // 缓存不存在或已过期，发起API请求
      isLoading.value = true
      try {
        const course = await getCollectionDetailAPI(courseId)
        // 更新缓存
        courseCache.value[courseId] = {
          data: course,
          expiry: now + CACHE_EXPIRY_TIME,
        }
        // 检查缓存大小
        checkCacheSize()
        currentCourse.value = course
        return course
      }
      catch (error) {
        console.error('Failed to fetch course detail:', error)
        throw error
      }
      finally {
        isLoading.value = false
      }
    }

    const getVideoById = (videoId: string): IVideo | undefined => {
      return currentCourse.value?.videos?.find(video => video.id === videoId)
    }

    const getPreviousVideo = (currentVideoId: string): IVideo | undefined => {
      const videos = currentCourse.value?.videos
      if (!videos || videos.length === 0)
        return undefined

      const currentIndex = videos.findIndex(video => video.id === currentVideoId)
      if (currentIndex <= 0)
        return undefined

      return videos[currentIndex - 1]
    }

    const getNextVideo = (currentVideoId: string): IVideo | undefined => {
      const videos = currentCourse.value?.videos
      if (!videos || videos.length === 0)
        return undefined

      const currentIndex = videos.findIndex(video => video.id === currentVideoId)
      if (currentIndex === -1 || currentIndex >= videos.length - 1)
        return undefined

      return videos[currentIndex + 1]
    }

    const clearCurrentCourse = () => {
      currentCourse.value = null
    }

    // 重置缓存
    const resetCache = () => {
      courseCache.value = {}
    }

    // 获取缓存状态
    const getCacheStatus = () => {
      const now = Date.now()
      const cache = courseCache.value
      const status = {
        total: Object.keys(cache).length,
        expired: 0,
        valid: 0,
      }

      for (const courseId in cache) {
        if (cache[courseId].expiry > now) {
          status.valid++
        }
        else {
          status.expired++
        }
      }

      return status
    }

    return {
      currentCourse,
      isLoading,
      fetchCourseDetail,
      getVideoById,
      getPreviousVideo,
      getNextVideo,
      clearCurrentCourse,
      resetCache,
      getCacheStatus,
    }
  },
  {
    persist: false,
  },
)
