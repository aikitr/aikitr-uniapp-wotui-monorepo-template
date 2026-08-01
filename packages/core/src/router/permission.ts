import { tabbarStore } from '@aikitr/ui/components/tabbar/store'

export const permission = {
  install(router) {
    router.beforeEach((to, from, next) => {
      const path = to.path
      tabbarStore.setAutoCurIdx(path)
      next()
    })
  },
}
