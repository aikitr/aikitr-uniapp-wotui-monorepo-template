import { createSSRApp } from 'vue'
import App from './App.vue'
import 'uno.css'
import { http } from '@aikitr/core/http'
import { routeInterceptor } from '@aikitr/core/router/interceptor'
import { requestInterceptor } from '@aikitr/core/http/interceptor'
import store from '@aikitr/core/store'

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  app.use(routeInterceptor)
  app.use(requestInterceptor)
  // wot-design-uni 1.9+ 已无默认导出，组件改为由 pages.config.ts 的 easycom 规则按需自动引入
  // Global http instance
  app.provide('http', http)

  return {
    app,
  }
}
