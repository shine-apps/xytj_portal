import { useUserStore } from '@/store/user'
/**
 * by 菲鸽 on 2025-08-19
 * 路由拦截，通常也是登录拦截
 * 黑、白名单的配置，请看 config.ts 文件， EXCLUDE_LOGIN_PATH_LIST
 */
import { tabbarStore } from '@/tabbar/store'
import { getAllPages, getLastPage, parseUrlToObj } from '@/utils/index'
import { toLoginPage } from '@/utils/toLoginPage'
import { CURRENT_LOGIN_STRATEGY, EXCLUDE_LOGIN_PATH_LIST, LOGIN_STRATEGY } from './config'

/**
 * 检查路径是否需要登录
 */
function checkNeedLogin(path: string, isLoggedIn: boolean): boolean {
  // 如果已经登录，不需要检查
  if (isLoggedIn) {
    return false
  }

  // 登录页本身不需要登录检查
  if (path === '/pages/login/login' || path === '/pages/register/register') {
    return false
  }

  // 根据登录策略判断
  if (CURRENT_LOGIN_STRATEGY === LOGIN_STRATEGY.DEFAULT_NO_NEED_LOGIN) {
    // 默认无需登录策略：只有黑名单中的页面需要登录
    return EXCLUDE_LOGIN_PATH_LIST.includes(path)
  }
  else if (CURRENT_LOGIN_STRATEGY === LOGIN_STRATEGY.DEFAULT_NEED_LOGIN) {
    // 默认需要登录策略：只有白名单中的页面不需要登录
    return !EXCLUDE_LOGIN_PATH_LIST.includes(path)
  }

  return false
}

export const FG_LOG_ENABLE = false
export function judgeIsExcludePath(path: string) {
  const isDev = import.meta.env.DEV
  if (!isDev) {
    return EXCLUDE_LOGIN_PATH_LIST.includes(path)
  }
  const allExcludeLoginPages = getAllPages('excludeLoginPath') // dev 环境下，需要每次都重新获取，否则新配置就不会生效
  return EXCLUDE_LOGIN_PATH_LIST.includes(path) || (isDev && allExcludeLoginPages.some(page => page.path === path))
}

export const navigateToInterceptor = {
  // 注意，这里的url是 '/' 开头的，如 '/pages/index/index'，跟 'pages.json' 里面的 path 不同
  // 增加对相对路径的处理，BY 网友 @ideal
  invoke({ url, query }: { url: string, query?: Record<string, string> }) {
    if (url === undefined) {
      return
    }
    let { path, query: _query } = parseUrlToObj(url)

    FG_LOG_ENABLE && console.log('\n\n路由拦截器:-------------------------------------')
    FG_LOG_ENABLE && console.log('路由拦截器 1: url->', url, ', query ->', query)
    const myQuery = { ..._query, ...query }
    // /pages/route-interceptor/index?name=feige&age=30
    FG_LOG_ENABLE && console.log('路由拦截器 2: path->', path, ', _query ->', _query)
    FG_LOG_ENABLE && console.log('路由拦截器 3: myQuery ->', myQuery)

    // 处理相对路径
    if (!path.startsWith('/')) {
      const currentPath = getLastPage()?.route || ''
      const normalizedCurrentPath = currentPath.startsWith('/') ? currentPath : `/${currentPath}`
      const baseDir = normalizedCurrentPath.substring(0, normalizedCurrentPath.lastIndexOf('/'))
      path = `${baseDir}/${path}`
    }

    // 登录拦截逻辑
    const userStore = useUserStore()
    const isLoggedIn = userStore.hasValidLogin

    // 根据登录策略判断是否需要登录
    const needLogin = checkNeedLogin(path, isLoggedIn)

    if (needLogin) {
      FG_LOG_ENABLE && console.log('路由拦截器 4: 需要登录，跳转到登录页')
      // 保存当前页面路径，登录后跳转回来
      let fullPath = path
      if (Object.keys(myQuery).length) {
        fullPath += `?${Object.keys(myQuery).map(key => `${key}=${myQuery[key]}`).join('&')}`
      }
      const redirectQuery = `?redirect=${encodeURIComponent(fullPath)}`
      toLoginPage({ queryString: redirectQuery })
      return false // 阻止原路由继续执行
    }

    // 处理路由不存在的情况
    // if (path !== '/' && !getAllPages().some(page => page.path === path)) {
    //   console.warn('路由不存在:', path)
    //   return false // 明确表示阻止原路由继续执行
    // }

    // // 插件页面
    // if (url.startsWith('plugin://')) {
    //   FG_LOG_ENABLE && console.log('路由拦截器 4: plugin:// 路径 ==>', url)
    //   path = url
    // }

    // 处理直接进入路由非首页时，tabbarIndex 不正确的问题
    tabbarStore.setAutoCurIdx(path)
  },
}

export const routeInterceptor = {
  install() {
    uni.addInterceptor('navigateTo', navigateToInterceptor)
    uni.addInterceptor('reLaunch', navigateToInterceptor)
    uni.addInterceptor('redirectTo', navigateToInterceptor)
    uni.addInterceptor('switchTab', navigateToInterceptor)
  },
}
