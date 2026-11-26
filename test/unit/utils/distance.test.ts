import { describe, expect, it } from 'vitest'
import { formatDistance } from '@/utils/distance'

describe('formatDistance', () => {
  it('小于 1000 米按整数米展示，不带 m 前缀', () => {
    expect(formatDistance(0)).toBe('0m')
    expect(formatDistance(1)).toBe('1m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('恰好 1000 米展示 1.0km', () => {
    expect(formatDistance(1000)).toBe('1.0km')
  })

  it('公里单位保留 1 位小数并四舍五入', () => {
    expect(formatDistance(1230)).toBe('1.2km')
    expect(formatDistance(1250)).toBe('1.3km')
    expect(formatDistance(5230)).toBe('5.2km')
    expect(formatDistance(30000)).toBe('30.0km')
  })

  it('入参为非有限数字时回退占位符，避免渲染 NaN', () => {
    expect(formatDistance(Number.NaN)).toBe('--')
  })
})
