import { afterEach, describe, expect, it, vi } from 'vitest'

// store.ts 在模块加载时调用 uni.getStorageSync，并基于 core 的 useUserStore 做角色过滤，
// 必须在导入 store 之前 mock 好 uni 全局与 core 依赖。
const storage: Record<string, unknown> = {}
vi.stubGlobal('uni', {
  getStorageSync: (k: string) => storage[k] ?? 0,
  setStorageSync: (k: string, v: unknown) => {
    storage[k] = v
  },
  switchTab: vi.fn(),
  navigateTo: vi.fn(),
  hideTabBar: vi.fn(),
})
vi.stubGlobal('getCurrentPages', () => [{ route: 'pages/index/index' }])

// 角色过滤依赖 core 的 useUserStore（这里给一个 admin 用户）
vi.mock('@aikitr/core/store/user', () => ({
  useUserStore: () => ({
    userInfo: { value: { roles: ['admin'] } },
  }),
}))

// 避免 core 事件总线的副作用（on 注册）
vi.mock('@aikitr/core/utils', () => ({
  on: vi.fn(),
}))

const { normalizeRoutePath, tabbarList, isPageTabbar } = await import('./store')

describe('tabbar store', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('normalizeRoutePath 统一成 / 开头', () => {
    expect(normalizeRoutePath('pages/index/index')).toBe('/pages/index/index')
    expect(normalizeRoutePath('/pages/me/me')).toBe('/pages/me/me')
    expect(normalizeRoutePath('')).toBe('')
  })

  it('tabbarList 按角色过滤（admin 可见 about，无 roles 项始终可见）', () => {
    const paths = tabbarList.value.map(i => i.pagePath)
    expect(paths).toContain('/pages/index/index')
    expect(paths).toContain('/pages/me/me')
    // config 中 about 项 roles:['admin']，当前用户是 admin，应可见
    expect(paths).toContain('/pages/about/about')
  })

  it('isPageTabbar 识别当前策略下的 tabbar 路由', () => {
    expect(isPageTabbar('/pages/index/index')).toBe(true)
    expect(isPageTabbar('/pages/unknown/unknown')).toBe(false)
  })
})
