# aikitr UniApp Monorepo 改造方案

## 一、当前项目分析

### 现状
- 单体项目结构，`src/` 下包含所有代码
- 技术栈：Vue3 + TypeScript + Vite5 + UnoCSS + wot-ui
- 已支持多端：H5、微信小程序、APP
- 使用 pnpm，但尚未配置 workspace

### 目录结构
```
aikitr-uniapp-wotui-monorepo-template/
├── env/                 # 环境变量
├── scripts/             # 构建脚本
├── src/                 # 源代码
│   ├── api/            # API 接口
│   ├── components/     # 组件目录（当前为空）
│   ├── hooks/          # 自定义 Hooks
│   ├── http/           # HTTP 请求封装
│   ├── layouts/        # 布局组件
│   ├── pages/          # 页面
│   ├── router/         # 路由
│   ├── service/        # 业务服务
│   ├── static/         # 静态资源
│   ├── store/          # 状态管理
│   ├── style/          # 样式
│   ├── tabbar/         # 底部导航
│   └── utils/          # 工具函数
├── vite-plugins/        # Vite 插件
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── vite.config.ts
```

---

## 二、目标架构设计

### 最终目录结构
```
aikitr-uniapp-wotui-monorepo-template/
├── packages/
│   ├── core/              # 核心业务逻辑包
│   │   ├── src/
│   │   │   ├── api/      # API 接口
│   │   │   ├── http/     # HTTP 请求
│   │   │   ├── hooks/    # 通用 Hooks
│   │   │   ├── router/   # 路由配置
│   │   │   ├── service/  # 业务服务
│   │   │   ├── store/    # 状态管理
│   │   │   ├── types/    # TypeScript 类型
│   │   │   └── utils/    # 工具函数
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                # UI 组件库包
│   │   ├── src/
│   │   │   ├── components/   # 通用组件
│   │   │   ├── styles/       # 样式
│   │   │   └── index.ts      # 导出入口
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── apps/
│       ├── app-a/         # 第一个 uniapp 应用
│       │   ├── src/
│       │   │   ├── pages/      # 页面
│       │   │   ├── layouts/    # 布局
│       │   │   └── tabbar/     # 底部导航
│       │   ├── manifest.config.ts
│       │   ├── pages.config.ts
│       │   ├── package.json
│       │   └── tsconfig.json
│       │
│       └── app-b/         # 第二个 uniapp 应用（可选）
│           └── ...
│
├── .gitignore
├── package.json              # 根 package.json
├── pnpm-workspace.yaml       # Workspace 配置
├── tsconfig.base.json        # 共享 TypeScript 配置
├── tsconfig.json             # 根 tsconfig（引用 base）
├── eslint.config.mjs         # 根 ESLint 配置
├── uno.config.ts             # UnoCSS 配置
├── scripts/                  # 根脚本
└── MONOREPO_PLAN.md
```

### 包依赖关系图
```
packages/apps/app-a
       │
       ▼
packages/core ──────────────────────► packages/ui
   │                                      │
   ├─ api/                                ├─ components/
   ├─ http/                               └─ styles/
   ├─ hooks/
   ├─ router/
   ├─ service/
   ├─ store/
   ├─ types/
   └─ utils/
```

---

## 三、各包职责划分

### 1. packages/core（核心业务包）
**职责**：存放跨应用共享的业务逻辑代码

**包含内容**：
- `api/` - API 接口定义
- `http/` - HTTP 请求封装（alova/vue-query）
- `hooks/` - 通用 composables（useScroll, useUpload, useRequest 等）
- `router/` - 路由配置和拦截器
- `service/` - 业务服务层
- `store/` - Pinia 状态管理（user, token 等）
- `types/` - TypeScript 类型定义
- `utils/` - 工具函数（debounce, uploadFile 等）

**对外暴露**：
```typescript
// index.ts
export * from './api'
export * from './hooks'
export * from './router'
export * from './service'
export * from './store'
export * from './types'
export * from './utils'
export { default as http } from './http/http'
```

---

### 2. packages/ui（UI 组件库包）
**职责**：存放跨应用共享的 UI 组件

**包含内容**：
- `components/` - 通用业务组件
- `styles/` - 全局样式变量和 mixin
- `index.ts` - 组件导出入口

**示例组件**：
- `AiChatInput.vue` - AI 对话输入框
- `ProductCard.vue` - 商品卡片
- `UserAvatar.vue` - 用户头像
- `LoadingSpinner.vue` - 加载动画

---

### 3. packages/apps/app-a（应用包）
**职责**：具体的 uniapp 应用实现

**目录结构**：
```
app-a/
├── src/
│   ├── pages/          # 页面（只放页面，不放通用逻辑）
│   ├── layouts/        # 布局组件
│   └── tabbar/         # 应用特定的底部导航
├── env/                # 应用专属环境变量
├── manifest.config.ts
├── pages.config.ts
├── package.json
└── tsconfig.json
```

**配置要点**：
- 应用专属的 `VITE_APP_TITLE`、`VITE_UNI_APPID`
- 应用专属的路由配置
- 应用专属的 tabbar 配置
- 通过 `workspace:*` 依赖 core 和 ui 包

---

## 四、实施步骤

### Phase 1: 基础架构搭建

#### 步骤 1.1: 创建目录结构
```bash
mkdir -p packages/{core,ui}/src
mkdir -p packages/apps/app-a/src
```

#### 步骤 1.2: 配置 pnpm-workspace.yaml
```yaml
packages:
  - 'packages/*'
  - 'packages/apps/*'
```

#### 步骤 1.3: 创建共享 tsconfig.base.json

### Phase 2: 迁移 Core 包

#### 步骤 2.1: 移动核心代码到 packages/core/src/
#### 步骤 2.2: 创建 core/package.json
#### 步骤 2.3: 创建 core/tsconfig.json

### Phase 3: 迁移 UI 包

#### 步骤 3.1: 创建 UI 包结构
#### 步骤 3.2: 移动通用组件到 packages/ui/src/components/
#### 步骤 3.3: 创建 ui/package.json

### Phase 4: 迁移应用包

#### 步骤 4.1: 创建 app-a 目录结构
#### 步骤 4.2: 移动页面代码到 packages/apps/app-a/src/
#### 步骤 4.3: 调整 vite.config.ts 路径别名
#### 步骤 4.4: 创建 app-a/package.json

### Phase 5: 清理与验证

#### 步骤 5.1: 更新根目录配置
#### 步骤 5.2: 安装依赖并验证
```bash
pnpm install
pnpm dev:app-a
```

---

## 五、路径映射策略

### 开发环境（Vite Alias）
```typescript
resolve: {
  alias: {
    '@aikitr/core': path.resolve(__dirname, '../../core/src'),
    '@aikitr/ui': path.resolve(__dirname, '../../ui/src'),
    '@': path.resolve(__dirname, './src'),
  },
}
```

### 生产环境（TypeScript Paths）
```json
{
  "paths": {
    "@aikitr/core/*": ["../../core/src/*"],
    "@aikitr/ui/*": ["../../ui/src/*"],
    "@/*": ["./src/*"]
  }
}
```

---

## 六、环境变量管理

每个应用包独立管理自己的环境变量：
```
packages/apps/app-a/env/
├── .env
└── .env.production
```

---

## 七、后续扩展建议

1. 添加 Turbo 用于并行构建
2. 添加 nx 用于依赖图管理
3. 使用 Storybook 展示 UI 组件文档
4. 为 core 和 ui 包添加单元测试

---

**确认上述方案后开始执行。**
