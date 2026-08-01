import { createSSRApp } from 'vue'
import App from './App.vue'
import { http } from '@aikitr/core/http'
import { routeInterceptor } from '@aikitr/core/router/interceptor'
import { requestInterceptor } from '@aikitr/core/http/interceptor'
import store from '@aikitr/core/store'

export function createApp() {
  const app = createSSRApp(App)
  app.use(store)
  app.use(routeInterceptor)
  app.use(requestInterceptor)
  // Global http instance
  app.provide('http', http)

  return {
    app,
  }
}
