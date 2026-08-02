import { emit } from '../utils/eventBus'

export const permission = {
  install(router) {
    router.beforeEach((to, from, next) => {
      const path = to.path
      // 通过事件总线通知 ui 包（core 不再反向依赖 ui 包）
      emit('route:tabbar', path)
      next()
    })
  },
}
