import { describe, expect, it, vi } from 'vitest'
import { updateChallengeAPI } from '@/service/practice'

const { httpMock } = vi.hoisted(() => ({
  httpMock: {
    patch: vi.fn(),
  },
}))

vi.mock('@/http/http', () => ({
  http: httpMock,
}))

describe('practice service', () => {
  it('通过 PATCH 更新指定挑战', async () => {
    const payload = {
      title: '更新后的挑战',
      description: '',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
    }
    httpMock.patch.mockResolvedValueOnce({ success: true })

    await updateChallengeAPI('challenge-1', payload)

    expect(httpMock.patch).toHaveBeenCalledWith('/api/practice/challenges/challenge-1', payload)
  })
})
