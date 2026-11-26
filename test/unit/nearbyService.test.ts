import { describe, expect, it, vi } from 'vitest'
import * as nearbyService from '@/service/nearby'

const { httpMock } = vi.hoisted(() => ({
  httpMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/http/http', () => ({
  http: httpMock,
}))

describe('nearby service', () => {
  it('getNearbyMeAPI 调用 GET /api/nearby/me', async () => {
    const response = { bio: null, location: null }
    httpMock.get.mockResolvedValueOnce(response)

    const result = await nearbyService.getNearbyMeAPI()

    expect(httpMock.get).toHaveBeenCalledWith('/api/nearby/me')
    expect(result).toBe(response)
  })

  it('publishLocationAPI 透传选点 payload 到 PUT /api/nearby/location', async () => {
    const payload = { latitude: 39.9, longitude: 116.4, locationName: '朝阳公园', address: '北京市朝阳区' }
    httpMock.put.mockResolvedValueOnce({ location: { id: 'loc-1', isActive: true, locationName: '朝阳公园' } })

    await nearbyService.publishLocationAPI(payload)

    expect(httpMock.put).toHaveBeenCalledWith('/api/nearby/location', payload)
  })

  it('closeLocationAPI 调用 DELETE 并支持静默选项', async () => {
    httpMock.delete.mockResolvedValueOnce({ success: true })

    await nearbyService.closeLocationAPI({ hideErrorToast: true })

    expect(httpMock.delete).toHaveBeenCalledWith('/api/nearby/location', undefined, undefined, { hideErrorToast: true })
  })

  it('updateNearbyBioAPI 提交简介到 PUT /api/nearby/profile', async () => {
    httpMock.put.mockResolvedValueOnce({ bio: '每天晨练' })

    const result = await nearbyService.updateNearbyBioAPI('每天晨练')

    expect(httpMock.put).toHaveBeenCalledWith('/api/nearby/profile', { bio: '每天晨练' })
    expect(result).toEqual({ bio: '每天晨练' })
  })

  it('getNearbyUsersAPI 原样透传 radius 与 page，并支持静默选项', async () => {
    const response = { radius: 10, page: 1, pageSize: 20, total: 0, users: [] }
    httpMock.get.mockResolvedValueOnce(response)

    const result = await nearbyService.getNearbyUsersAPI(
      { radius: 10, page: 2 },
      { hideErrorToast: true },
    )

    expect(httpMock.get).toHaveBeenCalledWith(
      '/api/nearby/users',
      { radius: 10, page: 2 },
      undefined,
      { hideErrorToast: true },
    )
    expect(result).toBe(response)
  })

  it('getConversationsAPI 调用会话列表接口', async () => {
    httpMock.get.mockResolvedValueOnce({ conversations: [] })

    await nearbyService.getConversationsAPI()

    expect(httpMock.get).toHaveBeenCalledWith('/api/nearby/conversations')
  })

  it('createConversationAPI 以 targetUserId 幂等建/取会话', async () => {
    httpMock.post.mockResolvedValueOnce({ conversation: { id: 'c-1' } })

    const result = await nearbyService.createConversationAPI('u-2')

    expect(httpMock.post).toHaveBeenCalledWith('/api/nearby/conversations', { targetUserId: 'u-2' })
    expect(result.conversation.id).toBe('c-1')
  })

  it('getMessagesAPI 拉取指定会话最新消息并支持静默选项', async () => {
    httpMock.get.mockResolvedValueOnce({ messages: [], pageSize: 20 })

    await nearbyService.getMessagesAPI('c-1', { hideErrorToast: true })

    expect(httpMock.get).toHaveBeenCalledWith(
      '/api/nearby/conversations/c-1/messages',
      undefined,
      undefined,
      { hideErrorToast: true },
    )
  })

  it('sendMessageAPI 仅提交 content（审核提示交由拦截器统一 toast）', async () => {
    httpMock.post.mockResolvedValueOnce({ message: { id: 'm-1' } })

    await nearbyService.sendMessageAPI('c-1', '约练吗')

    expect(httpMock.post).toHaveBeenCalledWith(
      '/api/nearby/conversations/c-1/messages',
      { content: '约练吗' },
    )
  })

  it('markConversationReadAPI 调用已读接口', async () => {
    httpMock.post.mockResolvedValueOnce({ success: true })

    await nearbyService.markConversationReadAPI('c-1')

    expect(httpMock.post).toHaveBeenCalledWith('/api/nearby/conversations/c-1/read')
  })

  it('getUnreadCountAPI 返回总未读数', async () => {
    httpMock.get.mockResolvedValueOnce({ unreadCount: 3 })

    const result = await nearbyService.getUnreadCountAPI()

    expect(httpMock.get).toHaveBeenCalledWith('/api/nearby/unread-count')
    expect(result.unreadCount).toBe(3)
  })
})
