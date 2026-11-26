import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNearbyStore } from '@/store/nearby'

const { getUnreadCountAPI } = vi.hoisted(() => ({
  getUnreadCountAPI: vi.fn(),
}))

vi.mock('@/service/nearby', () => ({
  getUnreadCountAPI,
}))

describe('nearby store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('初始 unreadCount 为 0', () => {
    const store = useNearbyStore()
    expect(store.unreadCount).toBe(0)
    expect(store.hasUnread).toBe(false)
  })

  it('fetchUnreadCount 拉取后写入 unreadCount', async () => {
    getUnreadCountAPI.mockResolvedValueOnce({ unreadCount: 5 })
    const store = useNearbyStore()

    await store.fetchUnreadCount()

    expect(getUnreadCountAPI).toHaveBeenCalledOnce()
    expect(store.unreadCount).toBe(5)
    expect(store.hasUnread).toBe(true)
  })

  it('拉取失败时静默并保持原值，不向上抛错', async () => {
    getUnreadCountAPI.mockRejectedValueOnce(new Error('network'))
    const store = useNearbyStore()

    await expect(store.fetchUnreadCount()).resolves.toBeUndefined()
    expect(store.unreadCount).toBe(0)
  })

  it('resetUnreadCount 归零且 hasUnread 变 false', async () => {
    getUnreadCountAPI.mockResolvedValueOnce({ unreadCount: 2 })
    const store = useNearbyStore()
    await store.fetchUnreadCount()

    store.resetUnreadCount()

    expect(store.unreadCount).toBe(0)
    expect(store.hasUnread).toBe(false)
  })
})
