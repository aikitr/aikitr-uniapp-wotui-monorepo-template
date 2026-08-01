<script setup lang="ts">
import { ref } from 'vue'

// 按钮状态
const buttonLoading = ref(false)
const buttonDisabled = ref(false)

// 表单数据
const formData = ref({
  username: '',
  password: '',
})

// Toast 提示
const showToast = (type: string) => {
  uni.showToast({
    title: `${type} 提示`,
    icon: type === 'success' ? 'success' : type === 'error' ? 'error' : 'none',
  })
}

// Loading 示例
const showLoading = () => {
  uni.showLoading({ title: '加载中...' })
  setTimeout(() => {
    uni.hideLoading()
  }, 2000)
}

// 确认框示例
const showConfirm = () => {
  uni.showModal({
    title: '提示',
    content: '这是一个确认框示例',
    success: (res) => {
      if (res.confirm) {
        uni.showToast({ title: '确认', icon: 'success' })
      } else {
        uni.showToast({ title: '取消', icon: 'none' })
      }
    },
  })
}
</script>

<template>
  <view class="page">
    <!-- 标题 -->
    <view class="header">
      <text class="title">WOT-UI 组件展示</text>
      <text class="subtitle">aikitr 模板集成示例</text>
    </view>

    <!-- 按钮组 -->
    <view class="section">
      <text class="section-title">按钮</text>
      <view class="button-group">
        <wd-button type="primary" block>主要按钮</wd-button>
        <wd-button type="success" block>成功按钮</wd-button>
        <wd-button type="warning" block>警告按钮</wd-button>
        <wd-button type="danger" block>危险按钮</wd-button>
        <wd-button type="info" block>信息按钮</wd-button>
      </view>
      <view class="button-group mt-20">
        <wd-button :loading="buttonLoading" @click="buttonLoading = !buttonLoading">
          {{ buttonLoading ? '加载中...' : '加载按钮' }}
        </wd-button>
        <wd-button :disabled="buttonDisabled" @click="buttonDisabled = !buttonDisabled">
          {{ buttonDisabled ? '已禁用' : '禁用按钮' }}
        </wd-button>
      </view>
    </view>

    <!-- Toast 示例 -->
    <view class="section">
      <text class="section-title">Toast 提示</text>
      <view class="button-row">
        <wd-button size="small" @click="showToast('success')">成功</wd-button>
        <wd-button size="small" type="error" @click="showToast('error')">错误</wd-button>
        <wd-button size="small" type="warning" @click="showToast('warning')">警告</wd-button>
        <wd-button size="small" type="info" @click="showToast('info')">信息</wd-button>
      </view>
    </view>

    <!-- Loading 示例 -->
    <view class="section">
      <text class="section-title">Loading</text>
      <wd-button block @click="showLoading">
        点击显示 Loading
      </wd-button>
    </view>

    <!-- 模态框示例 -->
    <view class="section">
      <text class="section-title">Modal 弹窗</text>
      <wd-button block type="primary" @click="showConfirm">
        显示确认框
      </wd-button>
    </view>

    <!-- 输入框示例 -->
    <view class="section">
      <text class="section-title">Input 输入框</text>
      <wd-input v-model="formData.username" placeholder="请输入用户名" />
      <wd-input v-model="formData.password" type="password" placeholder="请输入密码" class="mt-20" />
    </view>

    <!-- 卡片示例 -->
    <view class="section">
      <text class="section-title">Card 卡片</text>
      <wd-card title="卡片标题" desc="卡片描述信息">
        <view class="card-content">
          <text>这是卡片的内容区域，可以放置任意内容。</text>
        </view>
      </wd-card>
    </view>

    <!-- 标签页示例 -->
    <view class="section">
      <text class="section-title">Tabs 标签页</text>
      <wd-tabs>
        <wd-tab title="标签一" key="1">
          <view class="tab-content">
            <text>这是第一个标签页的内容</text>
          </view>
        </wd-tab>
        <wd-tab title="标签二" key="2">
          <view class="tab-content">
            <text>这是第二个标签页的内容</text>
          </view>
        </wd-tab>
        <wd-tab title="标签三" key="3">
          <view class="tab-content">
            <text>这是第三个标签页的内容</text>
          </view>
        </wd-tab>
      </wd-tabs>
    </view>

    <!-- 徽章示例 -->
    <view class="section">
      <text class="section-title">Badge 徽章</text>
      <view class="badge-demo">
        <wd-badge :count="5">
          <wd-icon name="bell" size="48rpx" />
        </wd-badge>
        <wd-badge :count="99" max-count="99" style="margin-left: 20rpx;">
          <wd-icon name="chat" size="48rpx" />
        </wd-badge>
        <wd-badge dot style="margin-left: 20rpx;">
          <wd-icon name="notification" size="48rpx" />
        </wd-badge>
      </view>
    </view>

    <!-- 加载状态示例 -->
    <view class="section">
      <text class="section-title">Loading 状态</text>
      <view class="loading-demo">
        <wd-loading />
        <wd-loading type="circle" style="margin-left: 20rpx;" />
        <wd-loading type="spinner" style="margin-left: 20rpx;" />
      </view>
    </view>

    <!-- 指示器示例 -->
    <view class="section">
      <text class="section-title">Indicator 指示器</text>
      <view class="indicator-demo">
        <wd-indicator :progress="30" />
        <wd-indicator :progress="60" type="circle" style="margin-top: 20rpx;" />
        <wd-indicator :progress="100" type="circle" status="success" style="margin-top: 20rpx;" />
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  padding: 20rpx;
  background-color: #f7f8fa;
  min-height: 100vh;
}

.header {
  text-align: center;
  padding: 40rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  margin-bottom: 20rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    display: block;
  }

  .subtitle {
    font-size: 24rpx;
    opacity: 0.8;
    display: block;
    margin-top: 10rpx;
  }
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
    display: block;
  }
}

.button-group {
  margin-bottom: 20rpx;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.card-content {
  padding: 20rpx;
}

.tab-content {
  padding: 40rpx;
  text-align: center;
}

.badge-demo {
  display: flex;
  align-items: center;
}

.loading-demo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.indicator-demo {
  padding: 40rpx;
}

.mt-20 {
  margin-top: 20rpx;
}
</style>
