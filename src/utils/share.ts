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
    const view = pages[pages.length - 1]
    if (view) {
      // 兼容 options 参数
      const options = (view as any).options || {}
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
    const view = pages[pages.length - 1]
    if (view) {
      const options = (view as any).options || {}
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
