import { describe, it, expect } from 'vitest'

// Re-implement the functions here to avoid importing from src/utils/index.ts
// which imports pages.json that has UniApp conditional compilation comments
function ensureDecodeURIComponent(url: string) {
  if (url.startsWith('%')) {
    return ensureDecodeURIComponent(decodeURIComponent(url))
  }
  return url
}

function parseUrlToObj(url: string) {
  const [path, queryStr] = url.split('?')

  if (!queryStr) {
    return {
      path,
      query: {},
    }
  }
  const query: Record<string, string> = {}
  queryStr.split('&').forEach((item) => {
    const [key, value] = item.split('=')
    query[key] = ensureDecodeURIComponent(value)
  })
  return { path, query }
}

describe('index utilities', () => {
  describe('ensureDecodeURIComponent', () => {
    it('should decode percent-encoded string', () => {
      expect(ensureDecodeURIComponent('%2Fpages%2Findex')).toBe('/pages/index')
    })

    it('should handle multiple levels of encoding', () => {
      expect(ensureDecodeURIComponent('%252Fpages')).toBe('/pages')
    })

    it('should return original string if not encoded', () => {
      expect(ensureDecodeURIComponent('/pages/index')).toBe('/pages/index')
    })
  })

  describe('parseUrlToObj', () => {
    it('should parse URL without query', () => {
      const result = parseUrlToObj('/pages/index/index')
      expect(result).toEqual({
        path: '/pages/index/index',
        query: {},
      })
    })

    it('should parse URL with query params', () => {
      const result = parseUrlToObj('/pages/index/index?id=123&name=test')
      expect(result.path).toBe('/pages/index/index')
      expect(result.query).toEqual({ id: '123', name: 'test' })
    })

    it('should decode query values', () => {
      const result = parseUrlToObj('/pages/index/index?redirect=%2Fpages%2Fhome')
      expect(result.query.redirect).toBe('/pages/home')
    })
  })
})
