import { describe, expect, it, vi } from 'vitest'
import * as practiceService from '@/service/practice'

const { httpMock } = vi.hoisted(() => ({
  httpMock: {
    get: vi.fn(),
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

    await practiceService.updateChallengeAPI('challenge-1', payload)

    expect(httpMock.patch).toHaveBeenCalledWith('/api/practice/challenges/challenge-1', payload)
  })

  it('按页码请求全员打卡记录并原样传递分页参数', async () => {
    const getPracticeRecordsAPI = practiceService.getPracticeRecordsAPI
    expect(getPracticeRecordsAPI).toBeTypeOf('function')
    const response = {
      checkIns: [],
      total: 0,
      page: 2,
      pageSize: 10,
    }
    httpMock.get.mockResolvedValueOnce(response)

    const result = await getPracticeRecordsAPI({ page: 2, pageSize: 10 })

    expect(httpMock.get).toHaveBeenCalledWith('/api/practice/records', { page: 2, pageSize: 10 })
    expect(result).toBe(response)
  })
})
