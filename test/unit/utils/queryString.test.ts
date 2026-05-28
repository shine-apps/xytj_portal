import { describe, it, expect } from 'vitest'
import { stringifyQuery } from '../../../src/http/tools/queryString'

describe('stringifyQuery', () => {
  it('should return empty string for null/undefined', () => {
    expect(stringifyQuery(null as any)).toBe('')
    expect(stringifyQuery(undefined as any)).toBe('')
  })

  it('should return empty string for non-object', () => {
    expect(stringifyQuery('string' as any)).toBe('')
    expect(stringifyQuery(123 as any)).toBe('')
  })

  it('should return empty string for array', () => {
    expect(stringifyQuery([] as any)).toBe('')
  })

  it('should stringify simple object', () => {
    const result = stringifyQuery({ name: 'test', age: '25' })
    expect(result).toBe('name=test&age=25')
  })

  it('should URL-encode special characters', () => {
    const result = stringifyQuery({ name: 'hello world', path: '/pages/index' })
    expect(result).toBe('name=hello%20world&path=%2Fpages%2Findex')
  })

  it('should skip undefined and null values', () => {
    const result = stringifyQuery({ a: '1', b: undefined, c: null, d: '2' })
    expect(result).toBe('a=1&d=2')
  })

  it('should stringify array values', () => {
    const result = stringifyQuery({ tags: ['a', 'b', 'c'] })
    expect(result).toBe('tags=a&tags=b&tags=c')
  })

  it('should skip undefined/null in arrays', () => {
    const result = stringifyQuery({ tags: ['a', undefined, null, 'b'] })
    expect(result).toBe('tags=a&tags=b')
  })

  it('should handle empty object', () => {
    expect(stringifyQuery({})).toBe('')
  })
})
