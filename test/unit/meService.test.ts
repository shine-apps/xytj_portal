import { describe, expect, it, vi } from 'vitest'
import { getHomeRecentAPI } from '@/service/me'

const { httpMock } = vi.hoisted(() => ({ httpMock: { get: vi.fn() } }))
vi.mock('@/http/http', () => ({ http: httpMock }))

describe('me service', () => {
  it('请求当前账号的首页最近记录并透传响应', async () => {
    const response = { challenges: [], courses: [], activities: [] }
    httpMock.get.mockResolvedValueOnce(response)

    const result = await getHomeRecentAPI()

    expect(httpMock.get).toHaveBeenCalledWith('/api/me/home-recent')
    expect(result).toBe(response)
  })
})
