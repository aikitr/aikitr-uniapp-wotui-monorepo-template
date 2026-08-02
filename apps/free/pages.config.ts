import { defineUniPages } from '@uni-helper/vite-plugin-uni-pages'
import { tabBar } from '@aikitr/ui/components/tabbar/config'

export default defineUniPages({
  globalStyle: {
    navigationStyle: 'default',
    navigationBarTitleText: 'aikitr',
    navigationBarBackgroundColor: '#f8f8f8',
    navigationBarTextStyle: 'black',
    backgroundColor: '#FFFFFF',
  },
  easycom: {
    autoscan: true,
    custom: {
      '^wd-(.*)': 'wot-design-uni/components/wd-$1/wd-$1.vue',
    },
  },
  // tabbar 的配置统一在 "./src/tabbar/config.ts" 文件中
  tabBar: tabBar as any,
})
