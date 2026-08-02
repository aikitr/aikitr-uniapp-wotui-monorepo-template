import type { CustomTabBarItem } from './types'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TabbarItem from './TabbarItem.vue'

// mock tabbar store，避免 uni.getStorageSync 在模块加载时执行
vi.mock('./store', () => ({
  tabbarStore: { curIdx: 0 },
}))

const baseItem: CustomTabBarItem = {
  text: '首页',
  pagePath: 'pages/index/index',
  iconType: 'unocss',
  icon: 'i-carbon-home',
}

describe('TabbarItem', () => {
  let wrapper: ReturnType<typeof mount>

  afterEach(() => {
    wrapper?.unmount()
  })

  it('渲染 text 文本', () => {
    wrapper = mount(TabbarItem, {
      props: { item: baseItem, index: 0 },
    })
    expect(wrapper.text()).toContain('首页')
  })

  it('isBulge=true 时不渲染文本', () => {
    wrapper = mount(TabbarItem, {
      props: { item: baseItem, index: 0, isBulge: true },
    })
    expect(wrapper.text()).not.toContain('首页')
  })

  it('iconType=unocss 时渲染图标 class', () => {
    wrapper = mount(TabbarItem, {
      props: { item: baseItem, index: 0 },
    })
    expect(wrapper.html()).toContain('i-carbon-home')
  })

  it('iconType=uiLib 时渲染 wd-icon（UI-05 实现，不再是空实现）', () => {
    const item: CustomTabBarItem = { ...baseItem, iconType: 'uiLib', icon: 'home' }
    wrapper = mount(TabbarItem, {
      props: { item, index: 0 },
    })
    expect(wrapper.html()).toContain('wd-icon')
    expect(wrapper.html()).toContain('home')
  })

  it('iconType=image 且有 iconActive 时按 curIdx 切换高亮图', () => {
    const item: CustomTabBarItem = {
      ...baseItem,
      iconType: 'image',
      icon: '/static/tabbar/home.png',
      iconActive: '/static/tabbar/homeHL.png',
    }
    wrapper = mount(TabbarItem, {
      props: { item, index: 0 },
    })
    // mock store 中 curIdx=0，与 index 相同 → 取 iconActive
    expect(wrapper.html()).toContain('/static/tabbar/homeHL.png')
  })

  it('badge=dot 时渲染小红点（包含 rounded-full 样式）', () => {
    const item: CustomTabBarItem = { ...baseItem, badge: 'dot' }
    wrapper = mount(TabbarItem, {
      props: { item, index: 0 },
    })
    expect(wrapper.html()).toContain('rounded-full')
  })

  it('badge 为数字时渲染数字角标', () => {
    const item: CustomTabBarItem = { ...baseItem, badge: 5 }
    wrapper = mount(TabbarItem, {
      props: { item, index: 0 },
    })
    expect(wrapper.text()).toContain('5')
  })

  it('badge > 99 时显示 99+', () => {
    const item: CustomTabBarItem = { ...baseItem, badge: 100 }
    wrapper = mount(TabbarItem, {
      props: { item, index: 0 },
    })
    expect(wrapper.text()).toContain('99+')
  })
})
