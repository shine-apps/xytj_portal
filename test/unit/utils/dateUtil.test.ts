import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTime, formatDate, getRelativeTime } from '../../../src/utils/dateUtil'

describe('dateUtil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-28T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatTime', () => {
    it('should return empty string for falsy values', () => {
      expect(formatTime('')).toBe('')
      expect(formatTime(null as any)).toBe('')
      expect(formatTime(undefined as any)).toBe('')
    })

    it('should format time in same year as MM-DD HH:mm', () => {
      const result = formatTime('2026-06-15T08:30:00Z')
      expect(result).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })

    it('should format time in different year as YYYY-MM-DD HH:mm', () => {
      const result = formatTime('2025-06-15T08:30:00Z')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
    })

    it('should accept number timestamp', () => {
      const timestamp = new Date('2026-06-15T08:30:00Z').getTime()
      const result = formatTime(timestamp)
      expect(result).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })

    it('should accept Date object', () => {
      const date = new Date('2026-06-15T08:30:00Z')
      const result = formatTime(date)
      expect(result).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
    })
  })

  describe('formatDate', () => {
    it('should return empty string for falsy values', () => {
      expect(formatDate('')).toBe('')
    })

    it('should format date in same year as MM-DD', () => {
      const result = formatDate('2026-06-15T08:30:00Z')
      expect(result).toMatch(/^\d{2}-\d{2}$/)
    })

    it('should format date in different year as YYYY-MM-DD', () => {
      const result = formatDate('2025-06-15T08:30:00Z')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getRelativeTime', () => {
    it('should return empty string for falsy values', () => {
      expect(getRelativeTime('')).toBe('')
    })

    it('should return "刚刚" for less than 60 seconds', () => {
      const now = new Date()
      const result = getRelativeTime(new Date(now.getTime() - 30 * 1000))
      expect(result).toBe('刚刚')
    })

    it('should return "X分钟前" for less than 60 minutes', () => {
      const now = new Date()
      const result = getRelativeTime(new Date(now.getTime() - 5 * 60 * 1000))
      expect(result).toBe('5分钟前')
    })

    it('should return "X小时前" for less than 24 hours', () => {
      const now = new Date()
      const result = getRelativeTime(new Date(now.getTime() - 3 * 60 * 60 * 1000))
      expect(result).toBe('3小时前')
    })

    it('should return "X天前" for less than 30 days', () => {
      const now = new Date()
      const result = getRelativeTime(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000))
      expect(result).toBe('5天前')
    })

    it('should return formatted date for more than 30 days', () => {
      const now = new Date()
      const result = getRelativeTime(new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000))
      expect(result).toMatch(/^\d{2}-\d{2}$/)
    })
  })
})
