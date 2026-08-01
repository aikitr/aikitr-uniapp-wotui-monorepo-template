<script setup lang="ts">
import { ref } from 'vue'
import FgTabbar from '@aikitr/ui/components/tabbar/index.vue'
import { isPageTabbar } from '@aikitr/ui/components/tabbar/store'

const isCurrentPageTabbar = ref(true)

// onShow is a global in uni-app, no need to import

const helloKuRoot = ref('Hello AppKuVue')

defineExpose({
  helloKuRoot,
})
</script>

<template>
  <view>
    <!-- 这个先隐藏了，知道这样用就行 -->
    <view class="hidden text-center">
      {{ helloKuRoot }}，这里可以配置全局的东西
    </view>

    <KuRootView />

    <FgTabbar v-if="isCurrentPageTabbar" />
  </view>
</template>
