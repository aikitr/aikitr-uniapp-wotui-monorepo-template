<script lang="ts" setup>
defineOptions({
  name: 'Home',
})
definePage({
  // 使用 type: "home" 属性设置首页，其他页面不需要设置，默认为page
  type: 'home',
  style: {
    // 'custom' 表示开启自定义导航栏，默认 'default'
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
  },
})

const description = ref(
  'aikitr 是一个基于 uniapp + Vue3 + TypeScript + Vite5 + UnoCSS 的跨平台开发模板，快速启动多端应用开发，支持 H5、小程序和 APP。',
)
console.log('index/index 首页打印了')

onLoad(() => {
  console.log('测试 uni API 自动引入: onLoad')
})
</script>

<template>
  <view class="bg-white px-4 pt-safe">
    <view class="mt-10">
      <image src="/static/logo.svg" alt="" class="mx-auto block h-28 w-28" />
    </view>
    <view class="mt-4 text-center text-4xl text-[#d14328]">
      aikitr
    </view>
    <view class="mb-8 mt-2 text-center text-2xl">
      快速启动的 uniapp 开发模板
    </view>

    <view class="m-auto mb-2 max-w-100 text-justify indent text-4">
      {{ description }}
    </view>
  </view>
</template>
