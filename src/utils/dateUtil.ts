import dayjs from 'dayjs'

// ==================== Asia/Shanghai 日历日工具 ====================
// 打卡业务的「今天」一律与服务端 todayInShanghai() 对齐（UTC+8）。
// 刻意不使用 Intl.DateTimeFormat：部分微信小程序真机基础库不支持 Intl；
// 中国不实行夏令时，固定 +8 偏移即可，且此处只需日历日/时分，无需 DST 处理。

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * 将任意时刻转换为「上海墙钟时间」对应的 Date，
 * 转换后该 Date 的 UTC 年/月/日/时/分分量即上海日历分量。
 */
export function toShanghaiWallClock(time: string | number | Date = Date.now()): Date {
  const d = new Date(time)
  return new Date(d.getTime() + d.getTimezoneOffset() * 60_000 + SHANGHAI_OFFSET_MS)
}

/** 指定时刻在上海时区的日历日 YYYY-MM-DD（默认当前时刻） */
export function shanghaiDateStr(time?: string | number | Date): string {
  return toShanghaiWallClock(time).toISOString().slice(0, 10)
}

/** 上海时区的今天 YYYY-MM-DD */
export function shanghaiToday(): string {
  return shanghaiDateStr()
}

/** 上海时区当前时刻的 HH:mm（24 小时制） */
export function shanghaiNowTime(): string {
  const d = toShanghaiWallClock()
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** 上海时区当前月份 YYYY-MM */
export function shanghaiCurrentMonth(): string {
  return shanghaiToday().slice(0, 7)
}

/** YYYY-MM-DD 加减 n 天，返回 YYYY-MM-DD（纯日历运算，无时区） */
export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * 将 YYYY-MM-DD 日历日转换为【设备本地零点】时间戳。
 * 供 wd-datetime-picker 等以本地零点时间戳为值的日期选择器使用，
 * 使选择器选中/回显的视觉日期等于指定的上海日历日。
 */
export function dateStrToLocalMidnight(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getTime()
}

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
