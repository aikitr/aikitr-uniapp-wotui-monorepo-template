<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { getCurrentInstance, onMounted, onUnmounted } from 'vue'
import { navigateToInterceptor } from '@aikitr/core/router/interceptor'
import { tabbarStore } from '@aikitr/ui/components/tabbar/store'
import { permission } from '@aikitr/core/router/permission'

const { proxy } = (getCurrentInstance() || {}) as any
const router = proxy?.$router

router && permission.install(router)

onShow((options) => {
  // 处理直接进入页面路由的情况：如h5直接输入路由、微信小程序分享后进入等
  if (options?.path) {
    navigateToInterceptor.invoke({ url: `/${options.path}`, query: options.query })
  }
  else {
    navigateToInterceptor.invoke({ url: '/' })
  }
})

// #ifdef H5
function syncTabbarWhenPageVisible() {
  if (document.visibilityState === 'visible') {
    tabbarStore.syncCurIdxByCurrentPageAsync()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', syncTabbarWhenPageVisible)
  window.addEventListener('pageshow', syncTabbarWhenPageVisible)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', syncTabbarWhenPageVisible)
  window.removeEventListener('pageshow', syncTabbarWhenPageVisible)
})
// #endif
</script>
