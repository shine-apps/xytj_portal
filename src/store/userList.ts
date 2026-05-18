import { defineStore } from 'pinia'
import { ref } from 'vue'
import { httpPost } from '@/http/http'

export interface UserInfo {
  id: string
  name: string
  image?: string
  phoneNumber?: string
}

export interface UserListResponse {
  users: UserInfo[]
}

export const useUserListStore = defineStore(
  'userList',
  () => {
    const userCache = ref<Record<string, UserInfo>>({})

    const getCachedUser = (userId: string): UserInfo | undefined => {
      return userCache.value[userId]
    }

    const cacheUsers = (users: UserInfo[]): void => {
      users.forEach((user) => {
        userCache.value[user.id] = user
      })
    }

    const fetchUserList = async (userIds: string[]): Promise<UserInfo[]> => {
      if (!userIds || userIds.length === 0) {
        return []
      }

      if (userIds.length > 500) {
        uni.showToast({
          title: '用户ID列表最多支持500个',
          icon: 'none',
        })
        return []
      }

      const dedupedIds = [...new Set(userIds)]
      const cachedResults: UserInfo[] = []
      const uncachedUserIds: string[] = []

      for (const userId of dedupedIds) {
        const cachedUser = getCachedUser(userId)
        if (cachedUser) {
          cachedResults.push(cachedUser)
        }
        else {
          uncachedUserIds.push(userId)
        }
      }

      if (uncachedUserIds.length === 0) {
        return cachedResults
      }

      try {
        const data = await httpPost<UserListResponse>(
          '/api/auth/list-users',
          { userIds: uncachedUserIds },
          {},
          {},
          { hideErrorToast: true },
        )

        const fetchedUsers = data.users || []
        cacheUsers(fetchedUsers)

        return [...cachedResults, ...fetchedUsers]
      }
      catch (error: any) {
        console.error('获取用户列表失败:', error)
        return cachedResults.length > 0 ? cachedResults : []
      }
    }

    const clearCache = (): void => {
      userCache.value = {}
    }

    const clearUserCache = (userId: string): void => {
      delete userCache.value[userId]
    }

    return {
      userCache,
      fetchUserList,
      getCachedUser,
      cacheUsers,
      clearCache,
      clearUserCache,
    }
  },
  {
    persist: false,
  },
)
