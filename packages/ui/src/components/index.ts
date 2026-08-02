// barrel 只导出组件与公开类型，避免把内部 store 单例 / config 常量（含同名 tabbarList）暴露为公共 API
export { default as Tabbar } from './tabbar/index.vue'
export { default as TabbarItem } from './tabbar/TabbarItem.vue'
export type { CustomTabBarItem, NativeTabBarItem, CustomTabBarItemBadge } from './tabbar/types'
