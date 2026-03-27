import { getAllPages } from '@/utils'

function getPageTitle(view: any): string {
  const allPages = getAllPages()
  const currentPageConfig = allPages.find(page => page.path === `/${view.route}`)
  return `${currentPageConfig?.style?.navigationBarTitleText}`
}

export default {
  onLoad() {
    // #ifdef MP-WEIXIN
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    // #endif
  },
  onShareAppMessage(res: any) {
    // 获取当前页面栈
    const pages = getCurrentPages()
    // 获取当前页面对象
    const view = pages[pages.length - 1] as any

    // 检查页面是否自定义了分享配置
    if (view?.$shareConfig?.onShareAppMessage) {
      return view.$shareConfig.onShareAppMessage(res)
    }

    if (view) {
      // 兼容 options 参数
      const options = view.options || {}
      const queryString = Object.keys(options).map(key => `${key}=${options[key]}`).join('&')
      const path = view.route ? `/${view.route}${queryString ? `?${queryString}` : ''}` : '/pages/index/index'

      const title = getPageTitle(view)

      return {
        title,
        path,
      }
    }
    return {
      title: `翔云文武`,
      path: '/pages/index/index',
    }
  },
  onShareTimeline(res: any) {
    const pages = getCurrentPages()
    const view = pages[pages.length - 1] as any

    // 检查页面是否自定义了分享配置
    if (view?.$shareConfig?.onShareTimeline) {
      return view.$shareConfig.onShareTimeline(res)
    }

    if (view) {
      const options = view.options || {}
      const queryString = Object.keys(options).map(key => `${key}=${options[key]}`).join('&')

      const title = getPageTitle(view)

      return {
        title,
        query: queryString,
      }
    }
    return {
      title: '翔云文武',
    }
  },
}

// 页面自定义分享配置的类型定义
export interface ShareConfig {
  onShareAppMessage?: (res?: any) => {
    title?: string
    desc?: string
    path?: string
    imageUrl?: string
    promise?: Promise<any>
  }
  onShareTimeline?: (res?: any) => {
    title?: string
    query?: string
    imageUrl?: string
    promise?: Promise<any>
  }
}

/**
 * 设置页面分享配置
 * 在页面中使用此函数来自定义分享内容
 * @example
 * const shareConfig = {
 *   onShareAppMessage: () => ({
 *     title: '自定义标题',
 *     desc: '自定义描述',
 *     path: '/pages/detail?id=123',
 *     imageUrl: 'https://example.com/image.jpg',
 *   }),
 *   onShareTimeline: () => ({
 *     title: '自定义朋友圈标题',
 *     query: 'id=123',
 *     imageUrl: 'https://example.com/image.jpg',
 *   }),
 * }
 * setPageShareConfig(shareConfig)
 */
export function setPageShareConfig(config: ShareConfig) {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage) {
    currentPage.$shareConfig = config
  }
}
