import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '../../../src/utils/debounce'

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should delay function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should reset timer on multiple calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000)

    debounced()
    vi.advanceTimersByTime(500)
    debounced()
    vi.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to the function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000)

    debounced('arg1', 'arg2')
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should cancel pending execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000)

    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
  })

  it('should flush pending execution immediately', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000)

    debounced()
    debounced.flush()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should invoke on leading edge when configured', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000, { edges: ['leading'] })

    debounced()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should invoke on both edges when configured', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000, { edges: ['leading', 'trailing'] })

    debounced()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    // After the timer ends, trailing edge should fire if there are pending args
    // Since the implementation resets pendingArgs after invoke, trailing won't fire on first call
    // This is the actual behavior of the implementation
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should invoke trailing edge after subsequent calls with both edges', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 1000, { edges: ['leading', 'trailing'] })

    debounced()
    expect(fn).toHaveBeenCalledTimes(1)

    debounced()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should respect AbortSignal', () => {
    const fn = vi.fn()
    const controller = new AbortController()
    const debounced = debounce(fn, 1000, { signal: controller.signal })

    debounced()
    controller.abort()
    vi.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
  })
})
