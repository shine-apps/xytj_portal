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
