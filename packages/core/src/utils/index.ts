import type { PageMetaDatum, SubPackages } from '@uni-helper/vite-plugin-uni-pages'
import { isMpWeixin } from '@uni-helper/uni-env'

/** 获取上一个页面 */
export function getLastPage() {
  const pages = getCurrentPages()
  return pages[pages.length - 2]
}

/** 解析 URL 为对象 */
export function parseUrlToObj(url: string) {
  const [path, queryStr] = url.split('?')
  const query: Record<string, string> = {}
  if (queryStr) {
    queryStr.split('&').forEach(item => {
      const [key, value] = item.split('=')
      query[key] = value
    })
  }
  return { path, query }
}

/** 获取当前页面路由信息 */
export function currRoute() {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const path = `/${page.route}`
  const query: Record<string, string> = {}
  for (const key in (page.options as any)) {
    query[key] = (page.options as any)[key]
  }
  return { path, query }
}

/** 判断当前页面是否在 tabbar 列表中 */
export function isPageTabbar(path: string) {
  // #ifdef MP
  const pages = getApp().$page?.pages as string[] || []
  return pages.some(p => p === path)
  // #endif
  // #ifndef MP
  return ['/pages/index/index', '/pages/me/me'].includes(path)
  // #endif
}

/** 获取环境 base URL */
export function getEnvBaseUrl() {
  return import.meta.env.VITE_SERVER_BASEURL
}

/** 判断是否为双 token 模式 */
export const isDoubleTokenMode = import.meta.env.VITE_AUTH_MODE === 'double'
