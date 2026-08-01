# aikitr 项目规则

## 项目概述
这是一个基于 unibest 架构的 uniapp + Vue3 + TypeScript + Vite5 + UnoCSS 开发模板。

## 技术栈
- **框架**: uniapp (支持 H5、微信小程序、APP)
- **UI 库**: wot-ui
- **状态管理**: pinia
- **HTTP**: alova
- **CSS**: UnoCSS
- **构建**: Vite 5

## 目录结构
```
src/
├── api/          # API 接口定义
├── components/   # 公共组件
├── hooks/        # 自定义 Hooks
├── http/         # HTTP 请求封装
├── layouts/      # 布局组件
├── pages/        # 页面文件
├── router/       # 路由配置
├── service/      # 服务层
├── static/       # 静态资源
├── store/        # Pinia 状态管理
├── style/        # 全局样式
├── tabbar/       # 底部导航栏
└── utils/        # 工具函数
```

## 开发命令
- `pnpm dev:h5` - 启动 H5 开发服务器
- `pnpm dev:mp` - 启动微信小程序开发
- `pnpm dev:app` - 启动 APP 开发
- `pnpm build:h5` - 构建 H5 生产版本
- `pnpm build:mp` - 构建微信小程序生产版本
- `pnpm build:app` - 构建 APP 生产版本
