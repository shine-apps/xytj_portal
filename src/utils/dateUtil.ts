import dayjs from 'dayjs'

/**
 * 格式化时间。 如果是同一年，显示MM-DD HH:mm；如果不是，显示YYYY-MM-DD HH:mm
 * @param time 时间字符串、数字戳或日期对象
 * @returns 格式化后的时间字符串
 */
export function formatTime(time: string | number | Date): string {
  if (!time)
    return ''
  const date = dayjs(time)
  const now = dayjs()

  if (date.year() === now.year()) {
    return date.format('MM-DD HH:mm')
  }
  return date.format('YYYY-MM-DD HH:mm')
}

export function formatDate(time: string | number | Date): string {
  if (!time)
    return ''
  const date = dayjs(time)
  const now = dayjs()

  if (date.year() === now.year()) {
    return date.format('MM-DD')
  }
  return date.format('YYYY-MM-DD')
}

/**
 * 获取相对时间描述
 * @param time 时间字符串、数字戳或日期对象
 * @returns 相对时间字符串，如：刚刚、X分钟前、X小时前、X天前、MM-DD
 */
export function getRelativeTime(time: string | number | Date): string {
  if (!time)
    return ''
  const now = dayjs()
  const target = dayjs(time)
  const diffSeconds = now.diff(target, 'second')
  const diffMinutes = now.diff(target, 'minute')
  const diffHours = now.diff(target, 'hour')
  const diffDays = now.diff(target, 'day')

  if (diffSeconds < 60) {
    return '刚刚'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`
  }
  if (diffHours < 24) {
    return `${diffHours}小时前`
  }
  if (diffDays < 30) {
    return `${diffDays}天前`
  }
  return formatDate(time)
}
