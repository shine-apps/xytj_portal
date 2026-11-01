import { describe, expect, it, vi } from 'vitest'

const { httpMock } = vi.hoisted(() => ({
  httpMock: {
    post: vi.fn(),
  },
}))

vi.mock('@/http/http', () => ({
  http: httpMock,
}))

describe('security service', () => {
  it('将待检测文本提交到通用安全接口', async () => {
    const securityService = await import('@/service/security').catch(() => null)
    expect(securityService).not.toBeNull()

    const response = { suggest: 'pass' }
    httpMock.post.mockResolvedValueOnce(response)

    const result = await securityService!.checkTextSecurityAPI('今日套路练习')

    expect(httpMock.post).toHaveBeenCalledWith('/api/text-security-check', {
      content: '今日套路练习',
    })
    expect(result).toBe(response)
  })
})
