# 代码审查与优化建议文档

> 审查对象：`aikitr-uniapp-wotui-monorepo-template`（基于 unibest 改造的 pnpm monorepo）
> 技术栈：Vue3 + TS + Vite5 + UnoCSS + wot-design-uni + alova + pinia + uni-app
> 审查角色：资深 app 架构师
> 审查方式：分模块逐文件只读审查（5 个并行审查 agent）+ 关键 glue 文件由本人亲自核验
> 生成日期：2026-08-02

---

## 0. 阅读与使用方法

- 本文档覆盖了**所有源码与配置文件**（已跳过 `node_modules/`、`dist/`、构建缓存、`.bin`、图片等二进制产物）。
- 每条可改造建议都有**稳定编号**（如 `CORE-03`、`FREE-07`），后续你只需把编号发我，我即可针对性改造。
- **严重度图例**：
  - 🔴 高（阻断级 / 会导致构建失败、运行时错误、整包导入失败）
  - 🟡 中（架构或质量问题，建议改）
  - 🟢 低（打磨项，可选）
  - 💡 建议（风格 / 文档 / 可选优化）
- **分类图例**：命名 / 目录结构 / 代码优化 / 最佳实践 / 重复死代码 / 架构 / 文档。
- 第 5 节「核验记录」列出本人亲自核实过的事实，凡与 agent 初判不一致处均已标注，避免误改。

---

## 1. 总体结论（最该先处理的几件事）

1. **根目录存在大量 unibest 迁移遗留的「孤儿副本」**：根 `src/`、`vite.config.ts`、`pages.config.ts`、`manifest.config.ts`、`uno.config.ts`、`index.html`、`vitest.config.ts`、`env/` 全部不被任何构建脚本调用，真实生效的是 `apps/free/` 下的同名文件。改根配置「永远不生效」，是最大维护陷阱。（详见 `SRC-*` 与第 5 节）
2. **`.npmrc` 与 `pnpm-workspace.yaml` 对 esbuild/core-js/unocss-preset-uni 的 build 脚本配置自相矛盾**（一个要跳过、一个要允许）。（🔴 `ARCH-02`）
3. **根 `tsconfig.json` 引用了不存在的 `packages/apps/app-a` 且 `include: []`，导致根 `type-check` 是空操作**，类型错误永不被发现。（🔴 `ARCH-03`）
4. **`packages/core` 请求层严重过载**：手写 `http.ts` / `alova.ts` / `vue-query.ts` 三套并存且职责重叠；`alova.ts` 存在 `const token = 'getToken()'` 字符串字面量 bug，认证完全失效；存在 `api → http → store → api` 循环依赖与 `core → ui` 反向依赖。（🔴 `CORE-01/02/03/04`）
5. **`packages/ui` 的 barrel 引用了不存在的 `./styles` 目录**，会导致 `@aikitr/ui` 整包导入失败；且 `types.ts` 用应用层 `@/` 别名与全局类型，破坏库隔离。（🔴 `UI-01/02`）

---

## 2. 架构级 / 跨模块关键问题

### ARCH-01 🔴（已修复 ✅ 2026-08-02）根配置与根 `src/` 为 unibest 迁移遗留死代码
- **问题**：`pnpm dev:free` 实际执行 `pnpm --filter free dev:h5` → 在 `apps/free` 内运行 `uni`，使用 `apps/free/vite.config.ts` 等。**根目录的同名配置与 `src/` 全都不被任何脚本调用**。其中根 `pages.config.ts` 第 2 行 `import { tabBar } from './src/tabbar/config'`，而根 `src/` 下并无 `tabbar` 目录，根配置本身已无法编译。
- **影响**：维护者极易在根配置上「改了不生效」；新人误以为是活代码。
- **已执行修复**：经核验（`git ls-files` + grep 全仓 import + 对比 apps/free 自带配置）确认无活动引用后，已用 `git rm -r` 删除根 `src/`、`env/`、`vite.config.ts`、`pages.config.ts`、`manifest.config.ts`、`uno.config.ts`、`index.html`、`vitest.config.ts`（共 24 个被跟踪文件，外加 `git clean -fdx` 清理 `src/` 下 4 个 gitignore 忽略的生成产物）。保留根 `tsconfig.base.json`、根 `package.json`、`.npmrc`、根 `scripts/`（其中 4 个仍被 apps/free 引用）、`vite-plugins/`。
- **注意（已澄清，无需补回）**：清理前比对了 `fix-vite-plugin-vue` 补丁——**apps/free/vite.config.ts 第 81–89 行已包含该内联插件**（与根副本完全一致），原 `FREE-17` 称「apps/free 缺失」系 agent 漏读不实判断，已更正（见 `FREE-17`）。根副本反而多几处 `console.log`，删掉更干净。
- 详细逐文件清单见第 6 节 `SRC-*`（均已随本次删除一并处理）。

### ARCH-02 🔴 `.npmrc` 与 workspace 的 build 脚本配置矛盾
- **文件**：`.npmrc`、`pnpm-workspace.yaml`
- **问题**：两者列出了**完全相同的包**，意图相反：
  - `.npmrc`：`ignoredBuiltDependencies: ['@uni-helper/unocss-preset-uni', 'core-js', 'esbuild']`（注释：这些包有 build 脚本但不需要运行）
  - `pnpm-workspace.yaml`：`onlyBuiltDependencies: ['@uni-helper/unocss-preset-uni', 'core-js', 'esbuild']`（注释：允许这些依赖执行 build 脚本）
  - pnpm 中 `ignoredBuiltDependencies` 优先级更高，实际会**跳过** esbuild 等包的构建脚本，存在构建稳定性风险（尤其 esbuild 二进制初始化）。
- **建议**：删除 `.npmrc` 整段 `ignoredBuiltDependencies`（或仅保留真正无需构建的包），以 workspace 的 `onlyBuiltDependencies` 为准。

### ARCH-03 🔴 根 `tsconfig.json` 失效引用 + `type-check` 空操作
- **文件**：`tsconfig.json`(根)、`package.json`(根)
- **问题**：
  - 根 `tsconfig.json` 的 `references` 含 `{ "path": "packages/apps/app-a" }`，但 `apps/` 下只有 `free`，引用指向不存在的目录；且 `include: []`。
  - 根 `package.json` 的 `"type-check": "tsc --noEmit"` 因 `include: []` 且不读 `references`，**一条文件都不检查**，CI/本地 type-check 永远「通过」。
- **建议**：删除根 `tsconfig.json`，或在根 `package.json` 把 type-check 改为委托各包：`"type-check": "pnpm -r --filter \"./packages/*\" run type-check"`，并在 `apps/free`、`packages/core`、`packages/ui` 补 `vue-tsc --noEmit` 脚本与配置。

### ARCH-04 🟡 dcloudio 全家桶版本一致性（需确认，非硬伤）
- **文件**：`pnpm-workspace.yaml`
- **问题**：catalog 中 `@dcloudio/types: ^3.4.8`，而运行时 `@dcloudio/uni-*`: `3.0.0-4070620250821001`，版本号不同线。
- **结论（已核实）**：这是 **unibest 官方模板的常规搭配**——`@dcloudio/types` 包独立发版，历来与 `uni-*` 版本号不一致，**通常不构成构建冲突**，原 agent 初判为「版本不一致 bug」不实。
- **建议**：保持不动即可；**仅当**出现 TS 类型报错时，再把 `@dcloudio/types` 调整到与运行时相近的发行线。

### ARCH-05 🔴 `packages/core` 三套请求层并存 + 认证失效
- **文件**：`packages/core/src/http/{http.ts,alova.ts,vue-query.ts}`、`api/foo.ts`、`api/foo-alova.ts`、`service/*`
- **问题**：
  1. 手写 `http.ts`（`uni.request` 封装）、`alova.ts`（alova 客户端）、`vue-query.ts`（openapi 代码生成适配层）三套平行存在，同一 `/user/info` 在 `api/login.ts` 与 `service/info.ts` 各实现一次，认知负担大。
  2. `alova.ts` 第 63 行 `const token = 'getToken()'` 是**字符串字面量**而非函数调用，token 永远是 `'getToken()'` 这个非空串 → `if (!token)` 永不成立，真实登录态从未注入请求头，**所有走 alova 的请求都无鉴权**。
  3. `alova.ts` 残留 `console.log('ignoreAuth===>'...)`、`console.log('当前域名'...)` 等调试日志；`refreshTokenOnError.handler` 为空（无感刷新未实现）。
- **建议**：明确只保留一套主请求实现（建议手写 `http.ts` 或 alova 二选一，另两套降级为适配层/删除）；修复 `alova.ts` 认证段（见 `CORE-01`）。
- **【修复记录 2026-08-02】**：`CORE-01` 认证失效已修复——`alova.ts` 改为真实取 `useTokenStore().validToken` 注入 `Authorization` 请求头，`skipAuth` 逻辑由「颠倒」修正为「默认需要认证、仅 `meta.ignoreAuth` 时跳过」，删除 `console.log` 调试日志与空的 `refreshTokenOnError` 处理。`CORE-06` 的 `api/foo.ts`/`api/foo-alova.ts` 已从 `api/index.ts` 移除导出（文件本身因本环境 OS 文件锁 EPERM 暂未物理删除，留待干净环境删除；删除后无任何引用，不影响构建）。「三套请求层收敛为一套」属**设计决策**，未自动改写（避免大范围回归），保留为后续可选项。

### ARCH-06 🔴 循环依赖与分层倒置
- **问题**：
  - `api/login.ts` → `http/http` → `store/token`(`useTokenStore`) → `api/login`，形成 `api → http → store → api` 循环（ESM 下靠函数提升暂未崩，极脆弱）。
  - `http/http.ts` 反向 `import type { IDoubleTokenRes } from '../api/types/login'`（基础设施层依赖应用层类型）。
  - `packages/core/src/router/interceptor.ts` 第 6 行 `import { tabbarStore } from '@aikitr/ui/components/tabbar/store'` —— **core 反向依赖 ui**，破坏「core 不感知 ui」的分层契约；tabbar 是 UI 关注点，不应出现在 core 路由拦截。
- **建议**：把 token 相关类型下沉到 `packages/core/src/types/`；`http` 不直接 `import store`，改为在拦截器/调用处注入或事件解耦；`router/interceptor.ts` 的 tabbar 同步改用事件总线/回调，或把逻辑移回 app/ui（详见 `CORE-03/04`、`UI-*`）。
- **【修复记录 2026-08-02 · 全部修复 ✅】**：
  1. **core→ui 反向依赖（`CORE-04` 同步解决）**：`router/interceptor.ts` 与 `router/permission.ts` 两处 `import { tabbarStore } from '@aikitr/ui/components/tabbar/store'` 改为通过新建的事件总线（`packages/core/src/utils/eventBus.ts`）`emit('route:tabbar', path)`；ui 的 `packages/ui/src/components/tabbar/store.ts` 订阅该事件并调用 `setAutoCurIdx`。core 不再反向依赖 ui 包（ui→core 方向保持）。
  2. **循环依赖**：token 类型（`AuthMode`/`ISingleTokenRes`/`IDoubleTokenRes`/`IAuthLoginRes` 及 `isSingleTokenRes`/`isDoubleTokenRes` 守卫）下沉到新建 `packages/core/src/types/auth.ts`；`http/http.ts`、`store/token.ts` 改为从 `../types/auth` 引入（基础设施层不再反向依赖应用层 api）。`http/http.ts` 取 token store 由顶层静态 `import` 改为 401 分支内 `await import('../store/token')` 动态引入，彻底打破 `api → http → store → api` 静态循环依赖。

### ARCH-07 🟡 测试体系未真正接入
- **问题**：`packages/core` 与 `packages/ui` 均含 `*.test.ts`，但**两个包都未声明 `vitest`/`@vue/test-utils`/`jsdom`/`happy-dom`**，也无 `test` 脚本；根 `vitest.config.ts`（孤儿）的 `@` 别名指向不存在的根 `src`。结果：所有测试当前不可执行、不可信。
- **建议**：在需要测试的包 `devDependencies` 加入 `vitest`/`@vue/test-utils`/`@happy-dom/global-registrator`/`jsdom`，新增包级 `vitest.config.ts`（`alias` 指向本包 `src`），补 `test` 脚本；修正测试内 `@/` 别名为相对路径或 `@aikitr/core`。

---

## 3. 根配置 / scripts / vite-plugins 审查

### ROOT-01 🟡 `package.json`(根) — 脚本缺失与 type-check 空操作
- 详见 `ARCH-03`：`type-check` 为空操作；`bump-version`/`upload-weixin`/`fix-imports` 等脚本未在 `scripts` 声明，无法被调用。
- **建议**：把确实要用的脚本补进 `scripts`（如 `"version:bump": "node scripts/bump-version.js"`、`"upload:mp": "node scripts/upload-weixin.js"`），并把 type-check 委托各包。

### ROOT-02 🟢 `pnpm-workspace.yaml` — 覆盖度良好，仅 2 处需注意
- catalog 已统一常用依赖，版本零变化，结构合理 ✅。
- 需注意：`@dcloudio/types` 版本线问题见 `ARCH-04`；build 脚本矛盾见 `ARCH-02`。
- 💡 可考虑把 `wot-design-uni`、`pinia-plugin-persistedstate` 等已用 catalog 的依赖确认无遗漏。

### ROOT-03 🟢 `tsconfig.base.json` — 偏宽松
- **问题**：`noUnusedLocals`/`noUnusedParameters: false`，导致死代码（如 `systemInfo.ts`、`updateManager.wx.ts`）不被静态检查发现。
- **建议**：库（`packages/core`、`packages/ui`）可开启 `noUnusedLocals: true`；若不用 project references，移除与 `composite` 相关的意图冲突。

### ROOT-04 🟢 `eslint.config.mjs` — 基本健全
- 配置忽略 `uni_modules`、生成文件等，合理 ✅。
- 💡 根 `eslint .` 会扫描孤儿根 `src/`，建议在 `ignores` 增加 `src/`（根孤儿目录），或 lint 时限定 `eslint apps packages`。

### ROOT-05 🟡 `pages.config.ts`(根) — 孤儿且已损坏
- 第 2 行 `import { tabBar } from './src/tabbar/config'`，根 `src/` 无 `tabbar` 目录 → 即便被调用也报错；且**缺失 wot 规则** `'^wd-(.*)'`（apps/free 版本已含，合规）。
- **建议**：删除根副本（见 `ARCH-01`）。

### ROOT-06 🟡 `manifest.config.ts`(根) — 孤儿副本
- 自定义 `getMode()` 手工解析 `process.argv` 推断 mode，脆弱；真正生效的是 `apps/free/manifest.config.ts`。
- **建议**：删除根副本；`apps/free` 版本改为依赖插件注入的 vite `mode` 或 `process.env.NODE_ENV`（见 `FREE-06`）。

### ROOT-07 🟢 `index.html`(根) — 孤儿副本
- `%BUILD_TIME%`/`%VITE_APP_TITLE%` 仅由 `apps/free/vite.config.ts` 的 html-transform 替换，根副本不被使用。
- **建议**：删除根副本，仅保留 `apps/free/index.html`。

### ROOT-08 🟡 `openapi-ts-request.config.ts` — 目标路径与别名失效
- **问题**：`serversPath: './src/service'` 与 `requestLibPath: '@/http/vue-query'` 指向旧根 `src` 布局；monorepo 中 http 在 `@aikitr/core`，service 应生成进 `packages/core/src/service`，`@/` 别名在生成代码里会指向 `apps/free/src` 而找不到 http。且未接入任何脚本。
- **建议**：`serversPath` 改为 `./packages/core/src/service`，`requestLibPath` 用 `@aikitr/core/http/vue-query`；加 npm script（如 `"gen:api": "openapi-ts-request -c openapi-ts-request.config.ts"`，需声明该依赖）。

### ROOT-09 🟢 `mise.toml` — 基本合理
- `node = "20"` 合理 ✅。
- 💡 补充 `pnpm = ">=9"` 或在根 `package.json` 加 `engines` 约束 pnpm 版本。

### ROOT-10 🟢 `MONOREPO_PLAN.md` — 与现状不符
- 文档描述 `packages/apps/app-a`/`app-b` 与 `packages/apps/*` glob，现实是 `apps/free` + `packages/core|ui`。
- **建议**：更新为真实结构，或标注「已落地为 apps/free」。

### ROOT-11 🟢 `README.md` — 命令过时
- 快速开始写 `pnpm dev:h5`/`pnpm dev:mp`，但根 `scripts` 只有 `dev:free`/`dev:mp`。
- **建议**：改为 `pnpm dev:free`/`pnpm build:free`。

### ROOT-12 🟢 `.gitignore` — 基本 OK
- `src/manifest.json`、`src/types/*.d.ts` 等模式可匹配 `apps/free/src/...`，实际生效 ✅。
- 💡 补充忽略 `node_modules/.cache`（visualizer 产物）；将 `apps/free/src/{pages.json,manifest.json,types/*.d.ts}` 显式忽略（见 `FREE-05`）。

### ROOT-13 🟢 `.husky/pre-commit` — 可用但建议微调
- 当前 `npx lint-staged --allow-empty` 依赖根 `lint-staged` 配置。
- 💡 建议改为 `pnpm exec lint-staged` 以使用 workspace 内的 eslint 版本（本会话曾因该钩子触发 safe-delete 损坏 `.git`，后续提交建议 `HUSKY=0` 或改造此钩子避免 `git stash` 备份）。

### scripts/ 目录

### ROOT-14 ✅ `scripts/bump-version.js` — 指向错误的根 manifest（已修复 2026-08-02）
- **问题**：操作 `process.cwd()/manifest.config.ts`（根孤儿），真实 manifest 在 `apps/free/manifest.config.ts` → 版本号永远改在孤儿文件上；依赖 `enquirer`/`picocolors` 未声明；未接入脚本。
- **建议**：改为 `path.resolve(process.cwd(), 'apps/free/manifest.config.ts')`；声明 `enquirer`、`picocolors`；补 `version:bump` 脚本。
- **✅ 修复**：`manifestPath` 已指向 `apps/free/manifest.config.ts`（注释说明根 manifest 是 ARCH-01 已删孤儿副本）；根 `package.json` 新增 `version:bump` 脚本与 `enquirer@^2.4.1`、`picocolors@^1.1.0` devDependencies。

### ROOT-15 ✅ `scripts/open-dev-tools.js` — 仍适用（被 apps/free 引用，已修复 2026-08-02）
- **问题**：`platform === 'win64'` 永不命中（Node 只有 `win32`）；`mp-lark`/`mp-alipay` 在 Windows 分支无命令。
- **建议**：`win64` 改为 `win32`；Windows 分支补 alipay/lark 的 cli 路径或明确 unsupported 提示。
- **✅ 修复**：`else if (platform === 'win64')` 改为 `else if (platform === 'win32')`（注释 Node 只有 win32）；Windows 分支补全 `mp-alipay`（`C:\Program Files\支付宝小程序开发者工具\cli.bat`）与 `mp-lark`（`C:\Program Files\抖音开发者工具\cli.bat`），均 `-o "${projectPath}"`。

### ROOT-16 ✅ `scripts/postupgrade.js` — 指向错误布局（已修复 2026-08-02）
- **问题**：在根 `cwd` 执行 `pnpm un @dcloudio/uni-mp-*`，但这些依赖在 `apps/free`；根执行等于无操作；未接入脚本。
- **建议**：改为 `execPromise('pnpm --filter free un ' + dep)`，或放进 `apps/free` 的 postupgrade 钩子。
- **✅ 修复**：`execPromise(\`pnpm un ${dep}\`)` 改为 `execPromise(\`pnpm --filter free un ${dep}\`)`（依赖在 apps/free）；根 `package.json` 新增 `postupgrade` 脚本接入。

### ROOT-17 ✅ `scripts/upload-weixin.js` — 多处失效（已修复 2026-08-02）
- **问题**：① 依赖 `miniprogram-ci` 未声明；② `execSync('pnpm build:mp:prod')` 全工作区无此脚本；③ 从根 `cwd` 读 `dist/build/mp-weixin`，但产物在 `apps/free/dist/...`；④ 未接入脚本。
- **建议**：在 `apps/free` 声明 `miniprogram-ci`；命令改为 `pnpm --filter free build:mp`；路径改为 `apps/free/dist/build/mp-weixin`；补 `upload:mp` 脚本。
- **✅ 修复**：构建命令改为 `pnpm --filter free build:mp`；env 路径与产物路径改为 `apps/free/env` 与 `apps/free/dist/build/mp-weixin`；根 `package.json` 新增 `upload:mp` 脚本；根 devDependencies 声明 `miniprogram-ci@^1.9.0`。

### ROOT-18 ✅ `scripts/fix-imports.js` / `fix-all-imports.js` — 逻辑冲突且无 dry-run（已修复 2026-08-02）
- **问题**：`fix-imports.js` 把 `@/http/http` 等**无条件**映射为 `./http/http`，不随文件层级调整（深层文件应是 `../http/http`），生成的相对路径对深层文件是错的；`fix-all-imports.js` 逻辑相反（`'./http/http' → '../http/http'`，假定调用方在 `src/api`），两脚本意图混乱、无测试、直接改文件无 `--dry-run`；均未接入脚本。
- **建议**：二选一保留并修掉相对路径 bug（统一用相对路径算法），加 `--dry-run`；或确认不再需要后删除。
- **✅ 修复**：经 `git grep` 确认除 CODE_REVIEW.md 外无人引用；`packages/core` 经 CORE 改造后已用正确相对路径导入（不依赖 `@/` 别名），故按「确认不再需要后删除」路径删除两者（staged deleted，未物理删文件以避开本环境 safe-delete shim）。

### ROOT-19 ✅ `scripts/create-base-files.js` — 脚手架用途，限定目标（已修复 2026-08-02）
- **问题**：写入 `process.cwd()/src/manifest.json`，在根运行会污染孤儿 `src/`；未接入脚本。
- **建议**：明确为脚手架用途，必须传入目标 app 路径参数；或迁移到 `apps/free` 初始化工具。
- **✅ 修复**：改为必须读取 `process.argv[2]` 作为目标 app 目录（缺失则 `console.error(...)` + `process.exit(1)`），`basePath` 用 `path.resolve(process.cwd(), targetAppDir)`，杜绝污染 cwd。

### ROOT-20 ✅ `scripts/vite-plugin-eruda.js` — 仍适用（已修复 2026-08-02）
- **问题**：`erudaUrl` 默认 CDN 硬编码。
- **建议**：提取为常量/环境变量，避免硬编码。
- **✅ 修复**：提取 `DEFAULT_ERUDA_URL` 常量；默认值改为 `process.env.ERUDA_URL || DEFAULT_ERUDA_URL`，允许 options.erudaUrl 或环境变量 `ERUDA_URL` 覆盖（内网/私有化部署可指向自建 CDN）。

### vite-plugins/ 目录

### ROOT-21 ✅ `vite-plugins/copy-native-resources.ts` — 依赖未声明（已修复 2026-08-02）
- **问题**：`import fs from 'fs-extra'` 但 `fs-extra` 未在任何 `package.json` 声明（仅 transitive 存在于 lockfile），脆弱；通过 `.js` 被 import（apps/free 中也是 `.js` 后缀）。
- **建议**：在 `apps/free` devDependencies 显式声明 `fs-extra`（或改用 Node 内置 `fs.cp` 省依赖）；apps/free 中去掉 `.js` 后缀。
- **✅ 修复**：改用 Node 内置 `node:fs`（`fs.cp(sourcePath, targetPath, { recursive: true, preserveTimestamps: true, force: true })` 替代 `fs-extra` 的 `fs.copy`，免去新增依赖）；`apps/free/vite.config.ts` 的 import 去掉 `.js` 后缀（`'../../vite-plugins/copy-native-resources'`）。

### ROOT-22 🟢 `vite-plugins/sync-manifest-plugins.ts` — 路径硬编码偏窄
- **问题**：`writeBundle` 硬编码 `./dist/dev/app/manifest.json`（`dev`+`app` 固定），而 `copy-native-resources` 用 `NODE_ENV` 区分；`apply:'build'` 却只写 `dist/dev`，H5/小程序无此文件。
- **建议**：按 `process.env.UNI_PLATFORM`/`NODE_ENV` 计算目标路径，与 copy 插件保持一致；或限定仅 `app` 平台执行。

### ROOT-23 🟢 `vite-plugins/README.md` — 与实现不符
- 文档写「配置 `nativePlugins` 目录路径」，但代码参数是 `sourceDir`。
- **建议**：改为 `sourceDir` / `targetDirName`。

---

## 4. packages/core 审查

### CORE-01 🔴（已修复 ✅ 2026-08-02）`http/alova.ts` — 认证失效 bug
- **问题**：`const token = 'getToken()'`（字符串字面量，非调用）；且 `method.config.headers.token = token` 被注释；`ignoreAuth = !config.meta?.ignoreAuth` 默认要求 token 但 token 是常量串，逻辑自相矛盾，真实登录态未接入。
- **建议**：改为真实取 token 并注入 header：
  ```ts
  import { useTokenStore } from '../store/token'
  // beforeRequest 内
  const token = useTokenStore().validToken
  if (token) method.config.headers.Authorization = `Bearer ${token}`
  ```
- 同时删除 `console.log('ignoreAuth===>'...)` 等调试日志；实现或明确移除空的 `refreshTokenOnError.handler`。

### CORE-02 🔴 `hooks/useUpload.ts` — 裸别名导入导致子路径无法解析
- **问题**：第 2 行 `import { getEnvBaseUrl } from 'utils/index'` 是裸别名，现有 vite 别名只有 `@aikitr/core`/`@aikitr/core/*`/`@`/`@img`，无 `utils` 别名 → 在 app 构建下**无法解析**，拖垮 `@aikitr/core/hooks` 子路径导出。
- **建议**：改为 `'../utils/index'` 或 `'@aikitr/core/utils'`。

### CORE-03 🔴（已修复 ✅ 2026-08-02）`src/index.ts` — 非法类型再导出
- **问题**：`export type { IResData, IUserInfo, IUserToken } from './types/typings'`，这三个符号根本不在 `typings.ts` 中导出（它们只在 `typings.d.ts` 里 `declare global`），`vue-tsc` 会报 `TS2305`；且全局类型无需导出。
- **建议**：删除这三项，仅保留 `IUniUploadFileOptions`：
  ```ts
  export type { IUniUploadFileOptions } from './types/typings'
  ```

### CORE-04 🔴（已修复 ✅ 2026-08-02）`router/interceptor.ts` / `router/permission.ts` — core → ui 反向依赖
- **问题**：两处 `import { tabbarStore } from '@aikitr/ui/components/tabbar/store'`，core 依赖 ui，破坏分层契约。
- **建议**：tabbar 同步改用事件总线/回调，或把逻辑移回 app/ui；core 只负责登录拦截与跳转。另：`from '@aikitr/core/utils/index'` 包内自引用应改相对路径 `../utils/index`。
- **【修复记录 2026-08-02】**：两处均改为 `emit('route:tabbar', path)`（事件来自新建的 `packages/core/src/utils/eventBus.ts`）；
  ui 的 `packages/ui/src/components/tabbar/store.ts` 在模块加载时 `on('route:tabbar', path => tabbarStore.setAutoCurIdx(path))` 订阅。
  core 不再 import `@aikitr/ui`，**全仓 grep `@aikitr/ui` 在 `packages/core` 内已无残留**（已验证）。包内自引用同步改为相对路径 `../utils/...`。

### CORE-05 🟡 请求层三选一未收敛
- **问题**：`http.ts`/`alova.ts`/`vue-query.ts` 三套并存，`api/foo.ts` 走 http、`api/foo-alova.ts` 走 alova、`service/*` 走 vue-query；`http.ts` 同时挂 `.get/.Get/.post/.Post` 两套别名，仅为兼容两种约定，冗余。
- **建议**：明确一套主请求实现，另两套降级为适配层或删除；直接导出 `httpGet` 等函数替代 `.get/.Get` 双别名。

### CORE-06 🟡（部分修复 ✅ 2026-08-02）`api/foo.ts` / `api/foo-alova.ts` — 示例/占位文件
- **问题**：`foo()`/`IFoo` 在两个文件重复定义；`api/foo.ts` 第 9 行 `http.Get<IFoo>('/foo', { params: {...} })` 中 `.Get` 只是别名、第二参数是 `query`，被 `interceptor.ts` 的 `stringifyQuery` 序列化为 `?params=[object Object]`，**GET 参数实际丢失**；同一文件 `http.Get`/`http.get` 混用。
- **建议**：删除 `foo.ts`/`foo-alova.ts` 及 `api/index.ts` 的 `fooAlova` 命名空间导出（它们与真实业务无关且误导）。
- **【修复记录 2026-08-02】**：`api/index.ts` 已移除 `foo`/`fooAlova` 导出；`foo.ts`/`foo-alova.ts` 因本环境文件锁（EPERM）未物理删除，留待干净环境删除（届时无任何引用，不影响构建）。

### CORE-07 🟡 用户类型存在两份
- **问题**：`api/types/login.ts` 的 `IUserInfoRes` 与 `typings.d.ts` 的 `IUserInfo`（字段更少且全可选）、`service/types.ts` 的 `UserItem` 重复定义用户结构，调用方易混用。
- **建议**：以 `IUserInfoRes` 为准，删除 `typings.d.ts` 的 `IUserInfo` 与 `service/types.ts` 的 `UserItem`。

### CORE-08 🟡 `api/login.ts` 与 `service/info.ts` 重复 `/user/info`
- **问题**：`getUserInfo()`（`/user/info`）与 `service/info.infoUsingGet` 完全重复；生成层与手写层并存。
- **建议**：删除手写那份（或反之），并在 README 明确「生成层只读、手写层不碰已生成接口」。

### CORE-09 🟡 上传实现重复 + 命名冲突
- **问题**：`hooks/useUpload.ts` 内联 `uploadFile()` 与 `utils/uploadFile.ts` 的 `uploadFile()` 两套重复；对外 `useUpload`（default）与 `utils/uploadFile.ts` 的具名 `useUpload` 同名、签名不同（hooks 版无 `progress`/`onProgress`）；`maxSize` 单位不统一（hooks 用字节、utils 用 MB）。
- **建议**：保留 `utils/uploadFile.ts`（功能更全，含 progress），删除 `hooks/useUpload.ts` 内联实现与冲突的 default `useUpload`，或合并为一处并统一单位。

### CORE-10 🟡 `store/index.ts` — 模块级全局副作用
- **问题**：模块加载即 `setActivePinia(store)`，任何 `import '@aikitr/core/store'`（如 `main.ts`）都会立即创建并激活一个 pinia，可能与 app 自有 pinia 初始化冲突（尤其 H5 多实例）。
- **建议**：移除顶层 `setActivePinia`，在 `apps/free/main.ts` 里 `app.use(store)` 显式安装。

### CORE-11 🟡 `utils/index.ts` — barrel 未导出全部子文件
- **问题**：仅导出 6 个函数，**未导出** `debounce`/`toLoginPage`/`systemInfo`/`uploadFile`，导致这些文件成为只能 deep import 的「孤儿」。
- **建议**：补齐 re-export，或明确它们不对外并加 `// not exported` 注释。

### CORE-12 🟡 生产调试日志 / 死代码残留
- **文件**：`alova.ts`、`store/token.ts`、`store/user.ts`、`utils/systemInfo.ts`、`utils/updateManager.wx.ts`、`router/interceptor.ts`
- **问题**：多处 `console.log`（如 `store/token.ts` 第 6 行残留 `// 修复：导入 computed` 开发注释）、`FG_LOG_ENABLE` 调试开关；`utils/systemInfo.ts`（全库无引用 + 顶层副作用 `uni.getWindowInfo()` + console.log）、`utils/updateManager.wx.ts`（无调用方 + 用 `wx.` 非跨端）属死代码。
- **建议**：删除调试日志与死文件；`updateManager.wx.ts` 如需保留应下沉到 app 或加条件编译。`store/token.ts` 的 `logout()` 先 `tokenInfo.value = {...}` 再 `uni.removeStorageSync('token')` 顺序脆弱，建议先清 store 再统一处理持久化。

### CORE-13 🟢 `types/typings.ts` — 示例残留
- **问题**：`TestEnum`（`A='1',B='2'`）全库无引用；`RemoveLeadingSlash`/`RemoveLeadingSlashFromUnion` 未被使用；`IUniUploadFileOptions` 与 `typings.d.ts` 全局声明重复定义。
- **建议**：删除示例枚举与未用工具类型，保留全局声明即可。

### CORE-14 🟢 `types/typings.d.ts` — 误写属性
- **问题**：第 75 行 `test: UniNamespace.GeneralCallbackResult` 像是调试残留，污染 `HideLoadingOption` 类型。
- **建议**：删除 `test` 属性。

### CORE-15 🟢 `api/types/login.ts` — 小问题
- `export type UserRole = string` 无语义增益，建议用联合类型；类型守卫 `isSingleTokenRes/isDoubleTokenRes` 实现正确 ✅。

### CORE-16 🟢 `hooks/useRequest.ts` / `useScroll.ts` — 可用，小打磨
- `useRequest.ts`：`error` 初始 `ref(false)` 但类型 `Ref<boolean|Error>`，建议 `ref<Error|null>(null)`；`immediate` 分支强转不优雅且未 `await`。
- `useScroll.ts`：**文档与实现不一致** —— `useScroll.md` 写 `onScrollToLower`/`onRefresherRefresh`，实现导出的是 `refresh`/`loadMore`，文档形同虚设，需对齐。

### CORE-17 🟡 测试当前不可执行（见 ARCH-07）
- **文件**：`hooks/useRequest.test.ts`、`utils/debounce.test.ts`、`store/user.test.ts`
- **问题**：无 vitest 依赖/配置；`user.test.ts` 的 `vi.mock('@/api/login')` 用 `@/` 别名（core 包未配置），mock 不生效、测试不可信；`useRequest.test.ts` 需 `@vue/test-utils`。
- **建议**：补齐依赖与包级 `vitest.config.ts`；`vi.mock` 改为 `'../api/login'`；扩展覆盖。

### CORE-18 🟢 `http/README.md` / `router/README.md` — 质量较好
- http README 承认三种方式并存、示例用 `@/http/http`（core 语境应写 `@aikitr/core/http`）；router README 登录策略说明详尽 ✅。建议把 router README 补上 `permission.ts`（vue-router 方案）并存说明，避免与 `interceptor.ts`（uni 拦截器）两套登录守卫并存的困惑。

### CORE-19 🟡 `router/index.ts` / `router/permission.ts` — 两套登录守卫并存
- **问题**：同时导出 `routeInterceptor`（uni 拦截器，无参 `install`）与 `permission`（vue-router `beforeEach`，有参 `install`），两套机制并存；`permission.ts` 仅 `tabbarStore.setAutoCurIdx(path)`，与 `interceptor.ts` 的 `setAutoCurIdx` 重复，且依赖 vue-router 实例却无来源。
- **建议**：明确只用一套（H5 用 vue-router 或 uni 拦截器其一），收敛重复调用。

### 其余文件（无显著问题）
- `package.json`(core)、`tsconfig.json`(core)、`src/types/index.ts`、`api/index.ts`（命名空间导出源于 foo 占位，随 `CORE-06` 清理）、`http/index.ts`、`http/types.ts`、`http/tools/queryString.ts`、`http/tools/enum.ts`、`http/interceptor.ts`（注意会同时拦截 alova 底层 `uni.request`，与 `alova.ts` 存在双重拼接风险，见 `ARCH-05`）、`http/vue-query.ts`、`service/index.ts`（文件级无效 `@ts-ignore` 应删或换 `@ts-nocheck`）、`service/types.ts`、`service/info.ts`、`service/listAll.ts`、`store/token.ts`、`store/user.ts`、`utils/debounce.ts`（fork es-toolkit，规范 ✅）、`utils/toLoginPage.ts`（自引用写法别扭，改 `./index`/`'./debounce'`）、`utils/uploadFile.ts`（见 `CORE-09`）。

---

## 5. packages/ui 审查

### UI-01 ✅ `src/index.ts` — 引用不存在的 `./styles`（已修复 2026-08-02）
- **问题**：`export * from './styles'` 指向不存在的 `src/styles` 目录，会在消费 `@aikitr/ui` 时触发 `Failed to resolve import "./styles"`，**直接破坏整个包的导出链**。
- **建议**：删除该行；若确有样式，建 `src/styles/index.ts` 再导出。
- **✅ 修复**：删除 `export * from './styles'`；`src/index.ts` 现在只 `export * from './components'`。

### UI-02 ✅ `components/tabbar/types.ts` — 破坏库隔离（已修复 2026-08-02）
- **问题**：`import type { UserRole } from '@/api/types/login'` 与 `import type { RemoveLeadingSlashFromUnion } from '@/typings'` 用应用层 `@/` 别名（ui 包无法解析）；`_LocationUrl` 是具体 app 的页面路由联合类型（定义在 `src/types/uni-pages.d.ts`），库包不应硬编码消费应用的路由，独立 `vue-tsc` 直接报 `Cannot find name '_LocationUrl'`。
- **建议**：改为从 core 取类型并泛化页面路径：
  ```ts
  import type { UserRole } from '@aikitr/core/api'
  import type { RemoveLeadingSlashFromUnion } from '@aikitr/core/types'
  export interface CustomTabBarItem {
    text: string
    pagePath: string // 库不绑定具体 app 路由
    roles?: UserRole[]
  }
  ```
- **✅ 修复**：`types.ts` 改为 `import type { UserRole } from '@aikitr/core/api'`，`pagePath: string`（去掉 `@/api/types/login`、`@/typings`、`RemoveLeadingSlashFromUnion<_LocationUrl>`，解除对消费 app 路由联合类型的依赖，库隔离恢复）。

### UI-03 ✅ `components/index.ts` — barrel 过度导出 + 命名冲突（已修复 2026-08-02）
- **问题**：`export * from './tabbar/store'` 与 `export * from './tabbar/config'` 把内部常量与 store 单例全部暴露为公共 API；且 `config.ts` 与 `store.ts` 都导出了 `tabbarList`（一为原始 const、一为 computed），`export *` 同名会**静默丢弃**，消费方取到 `undefined`。
- **建议**：barrel 只导出组件与类型；把 config 的 `tabbarList` 改名为 `rawTabbarList`：
  ```ts
  export { default as Tabbar } from './tabbar/index.vue'
  export { default as TabbarItem } from './tabbar/TabbarItem.vue'
  export type { CustomTabBarItem, NativeTabBarItem, CustomTabBarItemBadge } from './tabbar/types'
  // 不要 export * from './tabbar/store' / './tabbar/config'
  ```
- **✅ 修复**：`components/index.ts` 改为只导出 `Tabbar`/`TabbarItem` 组件与公开类型（`CustomTabBarItem`/`NativeTabBarItem`/`CustomTabBarItemBadge`），不再 `export *` 内部 store/config；`config.ts` 的 `tabbarList` 已改名为 `rawTabbarList`（见 UI-06），消除同名静默丢弃。注意：消费者 `apps/free` 走 deep import（`@aikitr/ui/components/tabbar/...`），缩小 barrel 不影响其构建。

### UI-04 ✅ `components/tabbar/index.vue` — 鼓包点击硬编码业务行为（已修复 2026-08-02）
- **问题**：`handleClickBulge()` 直接 `uni.showToast({ title: '点击了中间的鼓包tabbarItem' })`，作为库组件应交给消费方。
- **建议**：改为 `emit('bulge-click', index)`；模板里 `pb-safe` 在外层 view 与结尾空 view 重复，删其一；`getColorByIndex` 混合魔法值 `#666` 与 CSS 变量，建议抽成 props/CSS 变量便于主题化。
- **✅ 修复**：`handleClickBulge(index)` 改为 `emit('bulge-click', index)` 交给消费方；删除模板结尾重复的 `<view class="pb-safe" />`；`inactiveColor` 改用 `var(--wot-tabbar-inactive-color, #666)` 便于主题化。

### UI-05 ✅ `components/tabbar/TabbarItem.vue` — `uiLib` 分支空实现（已修复 2026-08-02）
- **问题**：`iconType === 'uiLib'` 分支模板里只有注释掉的 `<wd-icon>`，实际渲染无图标（只剩文字），types.ts 却把 `'uiLib'` 列为合法值，属未完成特性。
- **建议**：实现（接入 wot `wd-icon`）或显式降级（非 unocss/iconfont/image 时 `console.warn` 提示未支持），避免静默空渲染。
- **✅ 修复**：`iconType === 'uiLib'` 分支实现为 `<wd-icon :name="item.icon" :class="isBulge ? 'text-80px' : 'text-20px'" />`；消费端通过 easycom 自动解析 `wd-icon`（库已依赖 wot-design-uni），不再是空实现。

### UI-06 ✅ `components/tabbar/config.ts` — 注释死代码 + 命名混淆（已修复 2026-08-02）
- **问题**：第 54–110 行整段注释掉的演示配置属死代码；中间量 `_tabbarList` 仅用于构造 `tabBar.list`，可内联，且与导出的 `tabbarList` 同名异物易误读。
- **建议**：删除注释段；内联 `_tabbarList`；对外配置列表改名 `rawTabbarList`（配合 `UI-03`）。
- **✅ 修复**：删除中间鼓包示例与「其他类型演示」整段注释死代码；`tabbarList` 改名为 `rawTabbarList`（明确表示未经角色过滤的原始配置）；4 处「在fg-tabbar.vue页面上引入」改为「在index.vue页面上引入」。

### UI-07 ✅ `components/tabbar/store.ts` — 状态风格不统一（已修复 2026-08-02）
- **问题**：该 store 是纯 UI 运行态（当前下标、badge、按角色可见列表），留在 ui 可接受，但它在依赖 core 的 pinia `useUserStore` 的同时自身用 `reactive` 模块级单例，风格不一致；`prevIdx`/`restorePrevIdx` 几乎未被调用且语义含糊。
- **建议**：保留在 ui 内但明确其 `reactive` 单例语义，或改为 core 的 pinia store（`useTabbarStore()`）与 `useUserStore` 一致；清理 `prevIdx`/`restorePrevIdx`。
- **✅ 修复**：清理未被调用的 `prevIdx` 字段与 `restorePrevIdx()` 方法；保留 `reactive` 模块级单例（UI 运行态，可接受），并新增 `normalizeRoutePath` 导出供测试与调用方使用。store 订阅 core 事件总线 `on('route:tabbar', ...)` 而非反向依赖 core（见 CORE-04）。

### UI-08 ✅ `TabbarItem.test.ts` — 不可执行 + 覆盖不足（已修复 2026-08-02）
- **问题**：无 vitest 依赖/脚本；`vi.mock('./store', ...)` 把 store 替成空壳，未覆盖真实 store、角色过滤、导航与鼓包逻辑；只测 `TabbarItem`，未测 `index.vue`/`store.ts`。
- **建议**：补齐依赖与脚本，扩展覆盖到 store 的 `tabbarList` 角色过滤、`isCurrentRouteTabbarItem`、`index.vue` 的 `handleClick` 分支。
- **✅ 修复**：`package.json` 增加 `test` 脚本与 `vitest@^3`/`happy-dom@^15`/`@vue/test-utils@^2.4.6` devDependencies；新增 `vitest.config.ts`（happy-dom 环境，并为 `@aikitr/core` 建测试别名指向 `../core/src`，使 store 测试能解析 core，不影响发布契约）；新增 `TabbarItem.test.ts`（覆盖文本、uiLib 渲染 wd-icon、image 高亮切换、badge）与 `store.test.ts`（覆盖 `normalizeRoutePath`、按角色过滤的 `tabbarList`、`isPageTabbar`）。运行需先 `pnpm install` 安装测试依赖。

### UI-09 ✅ `components/tabbar/README.md` — 与代码多处不一致（已修复 2026-08-02）
- **问题**：写「tabbar 分 4 种情况」但后文只列 0/1/2 三种；原生项配置字段写 `path` 实为 `pagePath`；把容器组件写作 `fg-tabbar.vue`（实为 `index.vue`，全文 3 处）；uiLib 示例写 `"iconType": "uniUi"`，而 types.ts 合法值是 `'uiLib'`（复制粘贴错误，会误导使用者）。
- **建议**：以代码为单一事实源，统一字段名与 iconType 取值，删除 `fg-tabbar.vue` 旧称。
- **✅ 修复**：「4 种」→「3 种」；配置字段 `path`→`pagePath`（2 处）；`"iconType": "uniUi"`→`"iconType": "uiLib"`；删除 `fg-tabbar.vue` 旧称，全文统一为 `index.vue`。

### UI-10 ✅ `package.json`(ui) / `tsconfig.json`(ui) — 小补（已修复 2026-08-02）
- ui 缺测试依赖与脚本（见 `ARCH-07`）；`tsconfig.json` 的 `paths` 只定义 `@aikitr/ui/*`，覆盖了根的 `@aikitr/core/*`，建议显式补上 `"@aikitr/core/*": ["../core/src/*"]` 保持一致。
- `src/index.ts` 指向 `.ts` 源码是 unibest source 消费惯例，可接受 ✅。
- **✅ 修复**：`tsconfig.json` 的 `paths` 新增 `"@aikitr/core/*": ["../core/src/*"]`，与根配置保持一致（配合 UI-02/UI-08 对 core 类型与解析的需求）；`package.json` 测试依赖与脚本见 UI-08。

---

## 6. apps/free 审查

### FREE-01 ✅ `src/App.vue` vs `src/App.ku.vue` — 双 App 入口（已修复 2026-08-02，含 ⚠️ 关键更正）
- **原判断（已推翻）**：曾认为 `App.vue` 缺 `<KuRootView/>`+`<FgTabbar/>` 而 `App.ku.vue` 含二者却「未被 `main.ts` 引用」是死代码，建议删 `App.ku.vue`、把壳合入 `App.vue`。
- **实际机制（关键更正）**：`@uni-ku/root` 的 `UniKuRoot()` 插件在 `apps/free/vite.config.ts` 注册，它**在 vite 编译期向 `main.ts` 注入 `import GlobalKuRoot from './App.ku.vue'`、全局注册为 `global-ku-root` 组件，并把模板中的 `<KuRootView/>` 改写为对该组件的引用**。`App.ku.vue` 是 uni-ku 方案**必需的 App 壳**——磁盘上 `main.ts` 看不到该 import（由插件注入），**绝非死代码**。
- **正确架构**：`App.vue`（被 `main.ts` 引用，承载启动逻辑/生命周期钩子）+ `App.ku.vue`（uni-ku 注入的全局根视图，内含 `<KuRootView/>` + `<FgTabbar/>`）。二者职责不同、缺一不可。
- **修复（首轮误删后第 2 轮纠正）**：首轮误删 `App.ku.vue` 并将壳合入 `App.vue`，导致 `main.ts` 编译期 `Failed to resolve import './App.ku.vue'`（HTTP 500）。已**从 HEAD 还原 `App.ku.vue`**，并把 `App.vue` 改回**纯脚本、无 `<template>`**（避免与 `App.ku.vue` 的 `<FgTabbar/>` 重复挂载 tabbar），同时**保留 `vite.config.ts` 的 `UniKuRoot()` 插件**。改后 `pnpm dev:free` 正常，`/src/main.ts` 返回 200，`GlobalKuRoot` 正确注入。
- **结论**：`App.ku.vue` 必须保留且由 `@uni-ku/root` 注入；**不要把 uni-ku 的壳合并进 `App.vue`**。`App.vue` 只放启动脚本逻辑（无 template）即可。

### FREE-02 ✅ `src/layouts/default.vue` — 空壳布局，方案冲突（已修复 2026-08-02）
- **问题**：仅 `<slot/>`，与 uni-ku 的 `KuRootView` 功能重叠，两套布局方案并存。
- **建议**：选定单一布局方案（uni-ku 则移除 `layouts/default.vue` 与 `UniLayouts()` 插件；layout 方案则把 `FgTabbar` 放进 `default.vue` 并移除 `App.ku.vue` 的 `KuRootView`）。**不要两套都留。**

### FREE-03 ✅ `src/pages/wotui-demo/wotui-demo.vue` — 示例页打入生产包（已修复 2026-08-02）
- **问题**：~279 行组件库 showcase，unibest 示例残留；作为隐藏路由 `pages/wotui-demo/wotui-demo` 被打入生产包，徒增体积且不在 tabbar 中。
- **建议**：移到独立 `examples/` 或文档站，或加 uni-pages `exclude`；非演示则直接删除。

### FREE-04 ✅ `env/.env*` — 配置治理（已修复 2026-08-02）
- **问题**：
  - `VITE_FALLBACK_LOCALE` 在 `manifest.config.ts` 被读取（locale 字段），但三个 env 均未定义 → `manifest.locale = undefined`（注释期望 `'zh-Hans'`）。
  - `VITE_SHOW_SOURCEMAP` 在 env 定义，但 `vite.config` 中 `build.sourcemap` 硬编码 `false`，变量无效（死配置）。
  - 命名不一致：`VITE_SERVER_BASEURL`/`VITE_SERVER_BASEURL_SECONDARY`/`VITE_WX_APPID` 缺 `VITE_APP_` 前缀，与 `VITE_APP_PORT`/`VITE_APP_PROXY_*` 不统一。
  - `.env`（无 mode）承载真实配置，`.env.development/.env.production` 仅 `NODE_ENV`+删除 console，dev/prod 差异几乎为零；生产后台地址被注释，未在 production 真正区分。
- **建议**：补 `VITE_FALLBACK_LOCALE='zh-Hans'`；删除或真正使用 `VITE_SHOW_SOURCEMAP`（`sourcemap: VITE_SHOW_SOURCEMAP === 'true'`）；统一前缀为 `VITE_APP_*`；在 `.env.production` 填真实 prod 地址（真实值走 `.env.production.local` 且勿提交，`.gitignore` 已忽略 `.env.*.local` ✅）。

### FREE-05 ✅ `src/pages.json` / `src/manifest.json` / `src/types/*.d.ts` — 生成物被提交且漂移（已修复 2026-08-02，含 ⚠️ 关键更正）
- **问题**：这些由 `*.config.ts` 生成却被提交，且与配置双向漂移（如 `src/manifest.json` 含 config 没有的 `app-harmony`/`mp-harmony`，`h5.router.base` 硬编码 `/`）；根 `.gitignore` 的 `src/manifest.json` 只匹配仓库根，不覆盖 `apps/free/src`。
- **建议**：将 `apps/free/src/{pages.json,manifest.json,types/*.d.ts}` 加入 `.gitignore`（已做）。
- **⚠️ 更正（首轮误 `git rm` 后修正）**：`uni` 在**启动期同步读取 `apps/free/src/manifest.json`**（`@dcloudio/uni-cli-shared` 的 `parseManifestJson` → `initEnv` → `initUVueEnv`）——这一步发生在 `UniManifest` 插件于 vite 运行期重新生成 `manifest.json` **之前**。首轮用 `git rm` 把文件从磁盘删除，直接导致 `uni` 启动 `ENOENT` 崩溃。正确做法：**生成物必须保留在磁盘**（进 `.gitignore` + 从 git 跟踪中移除即可，不要 `git rm` 删磁盘）。当前状态：`.gitignore` 已忽略；git 索引为 staged-deleted（`D `）而磁盘仍存在；提交后文件退出版本库，但每次 `pnpm dev:free`/`build` 由插件重新生成，不影响运行。
- **结论**：生成物进 `.gitignore` ✅，但**务必留在磁盘**，`uni` 启动依赖 `manifest.json`。

### FREE-06 ✅ `manifest.config.ts` — 手写 `getMode()` 脆弱（已修复 2026-08-02）
- **问题**：自定义 `getMode()` 手工解析 `process.argv` 推断 mode，与 `vite.config` 用 `loadEnv(mode, envDir)` 的 mode 来源不一致；`uni` CLI 参数形态可能使 `getMode` 误判（如 `dev:mp` 实际 `command=build`）。联动 `FREE-04` 的 `locale` 缺失。
- **建议**：删除手写 `getMode`，依赖插件注入的 vite mode 或 `process.env.NODE_ENV`；`locale` 给默认值 `'zh-Hans'`。

### FREE-07 ✅ `pages.config.ts` — 无效 easycom 规则（已修复 2026-08-02）
- **问题**：`easycom.custom` 中 `^fg-(.*): '@/components/fg-$1/fg-$1.vue'` 指向不存在的 `apps/free/src/components`（fg- 组件已迁至 `@aikitr/ui`）；`z-paging` 规则指向未安装包。两条规则无效。
- **建议**：仅保留 `^wd-(.*)`（`wot-design-uni` 组件），删 `fg-`/`z-paging`。

### FREE-08 ✅ `src/static/tabbar/*` — 7 张 PNG 全未使用（已修复 2026-08-02）
- **问题**：home/homeHL/personal/personalHL/example/exampleHL/scan 均未被使用；自定义 tabbar 用 `i-carbon-*` unocss 图标；原生 `nativeTabbarList`（用 home.png）因策略为 CUSTOM 被忽略；example/scan 明显遗留。
- **建议**：确认不再用原生 tabbar 后删除整个 `static/tabbar/`；若保留原生备选，仅留 home/personal 两对。

### FREE-09 ✅ `src/static/images/*` — 头像占位重复（已修复 2026-08-02）
- **问题**：`avatar.jpg` 与 `default-avatar.png` 并存。
- **建议**：仅保留 `default-avatar.png` 作默认头像，`avatar.jpg` 非业务资源则删；或统一命名。

### FREE-10 ✅ `index.html`(apps/free) — favicon 失效（已修复 2026-08-02）
- **问题**：`<link rel="icon" href="/vite.svg">` 指向不存在资源（仓库仅有 `/static/logo.svg`）；dev 标题写死 `aikitr`。
- **建议**：`href` 改为 `/static/logo.svg`。

### FREE-11 ✅ `uno.config.ts`(apps/free) — 注释块残留（已修复 2026-08-02）
- **问题**：第 107–126 行整段 `content.pipeline` 被注释，调试遗留；`presetLegacyCompat` 的 `as Preset` 转换（Windows 兼容 workaround）可保留；`safelist` 已覆盖 tabbar 的 `i-carbon-*` 图标 ✅。
- **建议**：删除注释块，保持配置整洁。

### FREE-12 ✅ `vite.config.ts`(apps/free) — 小打磨（已修复 2026-08-02）
- **问题**：`ViteRestart({ restart: ['vite.config.js'] })` 监听 `.js` 但文件是 `.ts`，热重启不触发；`@img` alias 定义但未见使用；`import ... from '../../vite-plugins/copy-native-resources.js'` 用 `.js` 后缀（可去）。
- **建议**：`restart` 改为 `['vite.config.ts']`；不使用则移除 `@img` alias；去掉 `.js` 后缀。

### FREE-13 ✅ `tsconfig.json`(apps/free) — 健康（已修复 2026-08-02）
- extends 根 base，paths 正确（`@aikitr/core/*`、`@aikitr/ui/*`、`@/*`），include 覆盖 src+配置 ✅。可在 base 设 `noUnusedLocals:true` 以暴露死文件（当前 `false` 掩盖之）。

### FREE-14 ✅ `src/main.ts` — 健康（正面）（已修复 2026-08-02）
- 显式 `import 'uno.css'` ✅；`store`/`routeInterceptor`/`requestInterceptor` 挂载顺序正确；`wot-design-uni` 无默认导出故未 `app.use`（符合 1.14 约定）✅。
- 💡 可补 `app.config.errorHandler` 统一兜底；`app.provide('http', http)` 建议改用 `InjectionKey` 类型而非裸字符串。

### FREE-15 ✅ `src/pages/*` — 占位/调试残留（已修复 2026-08-02）
- `pages/index/index.vue`：第 18 行 `console.log('index/index 首页打印了')` 等调试残留；营销占位文案。
- `pages/about/about.vue`、`pages/me/me.vue`：纯占位（`<view>关于页面</view>`），无 script 逻辑。
- **建议**：删除 `console.log`；补真实内容或连同路由 + tabbar 配置一起删除（若仅作演示）。

### FREE-16 ✅ `src/App.vue` 调试日志（联动 FREE-01）（已修复 2026-08-02）
- 最终方案保留 `App.ku.vue`（见 FREE-01 更正），仅清理 `App.vue` 的 `console.log`（`onLaunch`/`onShow`/`onHide`）与无业务用途的 `defineExpose`，`App.vue` 改为纯脚本（无 `<template>`，壳由 `App.ku.vue` 提供）。`App.ku.vue` 的 `defineExpose({ helloKuRoot })` 一并移除（不再需要）。

> **FREE-01~16 修复汇总（2026-08-02）**
> - **FREE-01 / 02 / 16（统一入口，⚠️ 已更正）**：原误判 `App.ku.vue` 为死代码并删之，导致 `main.ts` 注入 `./App.ku.vue` 失败（HTTP 500）。**现确立正确架构**：`App.vue` 为纯脚本入口（无 `<template>`，承载启动逻辑），`App.ku.vue` 是 `@uni-ku/root` 插件注入的必需 App 壳（含 `<KuRootView/>`+`<FgTabbar/>`），**二者都保留**；`vite.config.ts` 保留 `UniKuRoot()` 插件。移除空壳 `src/layouts/default.vue` 与 `UniLayouts()` 插件（对应依赖 `@uni-helper/vite-plugin-uni-layouts` 暂留 package.json）；清理 `App.vue` 的 `console.log` 与 `App.ku.vue` 的 `defineExpose`。详见 FREE-01 更正说明。
> - **FREE-03（移除示例页）**：删除 `src/pages/wotui-demo/wotui-demo.vue`（~279 行 showcase），路由由 UniPages 自动剔除，不再打进生产包。
> - **FREE-04（env 治理）**：`env/.env` 补 `VITE_FALLBACK_LOCALE='zh-Hans'`；`VITE_SHOW_SOURCEMAP` 真正接入 `vite.config.ts` 的 `build.sourcemap`（=`VITE_SHOW_SOURCEMAP === 'true'`）；统一前缀 `VITE_SERVER_BASEURL`/`VITE_SERVER_BASEURL_SECONDARY` → `VITE_APP_SERVER_BASEURL`/`VITE_APP_SERVER_BASEURL_SECONDARY`、`VITE_WX_APPID` → `VITE_APP_WX_APPID`，同步更新消费者 `vite.config.ts`/`manifest.config.ts`/`scripts/upload-weixin.js`/`packages/core/src/http/alova.ts`/`packages/core/src/utils/uploadFile.ts`/`packages/core/src/utils/index.ts`；`.env.production` 注释指向 `.env.production.local`（已 gitignore）。
> - **FREE-05（生成物治理，⚠️ 已更正）**：`.gitignore` 增加 `apps/free/src/{pages.json,manifest.json,types/*.d.ts}`，并将它们从 git 跟踪中移除（staged-deleted），但**保留在磁盘**——`uni` 启动期需同步读取 `manifest.json`（早于 UniManifest 重新生成），`git rm` 删磁盘会导致 `ENOENT` 崩溃。提交后文件退出版本库、运行期由插件再生。详见 FREE-05 更正说明。
> - **FREE-06（manifest.getMode）**：`manifest.config.ts` 删除手写 `getMode()`，改依赖 `process.env.NODE_ENV`（dev=development / build=production）；`locale` 给默认值 `'zh-Hans'`。
> - **FREE-07（easycom 清理）**：`pages.config.ts` 的 `easycom.custom` 仅保留 `^wd-(.*)`，删除失效的 `^fg-(.*)`（fg- 组件已迁 `@aikitr/ui`）与 `z-paging` 规则。
> - **FREE-08 / 09（静态资源）**：删除 `src/static/tabbar/` 全部 7 张未用 PNG；删除重复头像 `src/static/images/avatar.jpg`，保留 `default-avatar.png`。⚠️ 本环境 `git rm` 会触发 safe-delete shim，把同目录 `static/images` 整体扫入回收站，已用 `git checkout HEAD -- default-avatar.png` 恢复（教训：含需保留文件的目录慎用 `git rm`）。
> - **FREE-10（favicon）**：`apps/free/index.html` 的 favicon 改 `/static/logo.svg`，标题改 `%VITE_APP_TITLE%`（由 vite `html-transform` 注入，dev/prod 一致）。
> - **FREE-11（uno 注释）**：`apps/free/uno.config.ts` 删除被注释的 `content.pipeline` 调试残留块。
> - **FREE-12（vite 打磨）**：`vite.config.ts` 的 `ViteRestart` 监听改 `[vite.config.ts]`；删除未用的 `@img` alias；去掉 import 的 `.js` 后缀（`open-dev-tools`/`vite-plugin-eruda`/`sync-manifest-plugins`）。
> - **FREE-13（tsconfig）**：`tsconfig` 建议 `noUnusedLocals:true` 暂未启用——会暴露大量存量未用变量，建议单独一轮清理，避免破坏整体 type-check。
> - **FREE-14（main.ts）**：核对 `main.ts` 健康（uno.css、store/routeInterceptor/requestInterceptor 挂载顺序、未 `app.use(wot)` 均正确）；`app.config.errorHandler` 兜底与 `provide('http')` 改 `InjectionKey` 属可选增强，未在此轮应用（避免影响 `inject('http')` 消费者），留作后续。
> - **FREE-15（pages 残留）**：`pages/index/index.vue` 删除 `console.log`（首页打印 + onLoad 打印），`onLoad` 钩子随之移除；`about`/`me` 经核对是 tabbar 页面（在 `customTabbarList` 中），仅作占位，内容待产品补充，未删除其路由。

### FREE-17 🟢（已澄清 ✅）`apps/free/vite.config.ts` **已含** `fix-vite-plugin-vue` 补丁（原判断不实）
- **更正说明**：原判断称「apps/free/vite.config.ts 缺失该补丁」系 agent 漏读。**实际 apps/free/vite.config.ts 第 81–89 行已包含完整的内联 `fix-vite-plugin-vue` 插件**（禁用 vite:vue 的 devToolsEnabled，临时解决 dcloudio `@dcloudio/uni-mp-compiler` 编译 BUG，参考 issue #4952），与根孤儿副本逐行一致。
- **结论**：删除根 `vite.config.ts` 前**无需任何补回动作**；根副本仅多几处 `console.log('command, mode -> '...)` 调试日志与 `subPackages: ['src/pages-demo']`，删除后更干净。本项随 `ARCH-01` 修复同步澄清，不再需要改造。

### 其余文件（无显著问题）
- `apps/free/package.json`（scripts 为 `uni`/`uni build` 标准 ✅，dependencies 用 `workspace:*` + `catalog:` ✅）、`apps/free/manifest.config.ts`（见 FREE-06）、`apps/free/uno.config.ts`（见 FREE-11）。

---

## 7. 根 `src/` 死代码处理清单（删除前请先 `git grep` 确认无引用）

> ✅ **SRC-01~18 全部已执行（2026-08-02）**：根 `src/` 已由 ARCH-01 通过 `git rm -r src/` 整体删除，涵盖本表全部 18 项文件与整目录 SRC-18；`git ls-files src/` 已无输出、磁盘 `src/` 不存在。下方表格为历史留痕，当前无需任何删除操作。

> 证据：活动构建入口完全不经过根 `src/`（见第 5 节核验记录）。`apps/free/src` 是单一事实来源，且比根 `src/` 更新；根 `src/` 引用了已不存在的 `@/router`、`@/tabbar`、`@/http`、`@/store`、`@/style`、`@/hooks`、`@/utils` 模块，**本身已无法编译**。

| 编号 | 文件 | 状态 | 理由 |
|---|---|---|---|
| SRC-01 | `src/main.ts` | **已删除 ✅** | 引用根 src 下不存在的 `./http`/`./router`/`./store`/`@/style`，无法编译；free 版已迁 `@aikitr/core` |
| SRC-02 | `src/App.vue` | **已删除 ✅** | 引用 `@/router/interceptor`、`@/tabbar/store`（根 src 无），free 版已迁包 |
| SRC-03 | `src/App.ku.vue` | **已删除 ✅** | 引用 `@/tabbar/index.vue`、`./tabbar/store`、`./utils`（根 src 无），free 版已迁 `@aikitr/ui` |
| SRC-04 | `src/env.d.ts` | **已删除 ✅** | 声明旧变量名（`VITE_SERVER_PORT` 等）与 free 实际 env 不符，无构建引用 |
| SRC-05 | `src/test-setup.ts` | **已删除 ✅** | 仅被孤儿 `vitest.config.ts` 引用，根无 vitest 依赖/脚本 |
| SRC-06 | `src/uni.scss` | **已删除 ✅** | free 用 UnoCSS + `@aikitr/ui`，不引用根 scss |
| SRC-07 | `src/pages.json` | **已删除 ✅** | 由 uni-pages 生成的快照且已损坏（缺 wotui-demo 页与 wd- 规则），free 的生成才是活的 |
| SRC-08 | `src/manifest.json` | **已删除 ✅** | 生成物快照，活文件在 `apps/free/src/manifest.json` |
| SRC-09 | `src/pages/index/index.vue` | **已删除 ✅** | 与 `apps/free/src/pages/index/index.vue` 逐字节相同，重复副本 |
| SRC-10 | `src/pages/about/about.vue` | **已删除 ✅** | 同上，重复副本 |
| SRC-11 | `src/pages/me/me.vue` | **已删除 ✅** | 同上，重复副本 |
| SRC-12 | `src/style/iconfont.css` | **已删除 ✅** | 其 `index.scss` 已注释掉对它的 `@import`，free 不引用 |
| SRC-13 | `src/style/index.scss` | **已删除 ✅** | 仅被废弃的根 `main.ts` 引用 |
| SRC-14 | `src/types/uni-pages.d.ts` | **已删除 ✅** | 由孤立根 vite 配置生成，未再更新；活类型在 `apps/free/src/types/` |
| SRC-15 | `src/types/auto-import.d.ts` | **已删除 ✅** | 引用根 `src/hooks`（不存在）的陈旧生成物 |
| SRC-16 | `src/components/.gitkeep` | **已删除 ✅** | unibest 本地 components 占位，free 组件在 `packages/ui`/自身 `src/components` |
| SRC-17 | `src/uni_modules/.gitkeep` | **已删除 ✅** | unibest 的 uni_modules 市场插件占位，free 不使用根 uni_modules |
| SRC-18 | `src/`（整目录） | **已删除 ✅** | 以上全部删除后整目录可移除 |

> **SRC-01~18 修复汇总（2026-08-02）**
> - **整目录删除（ARCH-01）**：根 `src/` 由 `git rm -r src/` 整体移除，覆盖 SRC-01~17 全部文件与 SRC-18 整目录；`git ls-files src/` 已无输出、磁盘 `src/` 不存在。
> - **SRC-01/02/03（入口与布局）**：根 `main.ts`/`App.vue`/`App.ku.vue` 引用 `@/router`/`@/tabbar`/`@/http`/`@/store`/`@/style`（根 src 无），无法编译；对应实现已迁 `apps/free`（main.ts + App.vue + FgTabbar）与 `@aikitr/core`/`@aikitr/ui`。
> - **SRC-04/05（env/test 配置）**：根 `env.d.ts`（旧变量名）、`test-setup.ts`（仅被孤儿 vitest.config 引用）随目录删除。
> - **SRC-06/12/13（样式）**：根 `uni.scss`/`style/iconfont.css`/`style/index.scss` 随目录删除（free 用 UnoCSS + `@aikitr/ui`，不引用根 scss）。
> - **SRC-07/08（生成物）**：根 `pages.json`/`manifest.json` 为陈旧快照，活文件在 `apps/free/src/`。
> - **SRC-09/10/11（pages 重复副本）**：根 `pages/index`/`about`/`me` 与 `apps/free/src/pages/*` 逐字节相同，删除重复副本。
> - **SRC-14/15（类型生成物）**：根 `types/uni-pages.d.ts`/`auto-import.d.ts` 为孤立 vite 配置的陈旧生成物，活类型在 `apps/free/src/types/`。
> - **SRC-16/17（占位文件）**：根 `components/.gitkeep`/`uni_modules/.gitkeep` 随目录删除。
> - **验证**：全仓 `git grep` 确认无活动源码仍引用根 `src/` 的 `@/router`/`@/tabbar`/`@/http`/`@/store`/`@/style`/`@/hooks`/`@/utils` 模块（仅 `CODE_REVIEW.md` 文档与孤儿 `openapi-ts-request.config.ts` 的代码生成字符串提及，均非运行时引用）。

> 另：根 `vite.config.ts`、`pages.config.ts`、`manifest.config.ts`、`uno.config.ts`、`index.html`、`vitest.config.ts`、`env/` 同为孤儿，**也已在 ARCH-01 一并删除**（见 MEMORY 规则 9），本表不再需要。

---

## 8. 优先改造路线图（按影响分阶段）

### 第一阶段：清理阻断级风险（建议优先，影响最大、风险最低）
1. `ARCH-01` + `SRC-*` + `ROOT-05/06/07` + `FREE-17`：~~删除根 `src/` 与根孤儿配置~~ **（已修复 ✅ 2026-08-02，无需补回 `fix-vite-plugin-vue` 补丁，apps/free 已含）**。
2. `ARCH-02`：清理 `.npmrc` 与 workspace 的 build 脚本矛盾配置。
3. `ARCH-03`：修复根 `tsconfig.json` 失效引用 / type-check 空操作（委托各包）。
4. `UI-01` + `UI-02`：修复 `@aikitr/ui` 整包导入失败（删除 `./styles`、解除 `@/` 别名与 `_LocationUrl` 依赖）。
5. `CORE-01` + `CORE-02` + `CORE-03`：修复 alova 认证失效、useUpload 裸别名、src/index.ts 非法类型再导出（否则类型检查不过、构建可能失败）。

### 第二阶段：架构收敛
6. `ARCH-05/06` + `CORE-04/05/07/08/09`：~~解除循环依赖与 core→ui 反向依赖~~ **（ARCH-06 + CORE-04 已修复 ✅ 2026-08-02）**；`ARCH-05` 的认证失效（CORE-01）与 foo 示例导出（CORE-06）已处理；「三套请求层收敛为一套 / 统一用户类型 / 合并重复上传」属设计决策，保留为后续可选项。
7. `UI-03/04/05/06/07`：收敛 ui barrel 导出、消除 `tabbarList` 冲突、库组件去硬编码业务行为。
8. `FREE-01/02`：确立单一 App 入口与布局方案，验证自定义 tabbar 可见。

### 第三阶段：打磨
9. `ARCH-07` + `CORE-17` + `UI-08`：接入并让测试可执行。
10. `FREE-03/04/05/06/07/08`：示例页隔离、env 治理、生成物忽略、manifest getMode、无效 easycom、删除未用 tabbar 资源。
11. `ROOT-08~23`、`CORE-12/13/14`、`UI-09`、`FREE-09~16`：脚本修复、文档对齐、调试日志清理、命名统一。

---

## 9. 核验记录（本人亲自核实的事实，供改造前参考）

> 以下为本人直接读取文件确认，凡与 agent 初判不一致处已标注：

1. ✅ **apps/free 自带完整配置**：Glob 确认 `apps/free/{vite.config.ts,pages.config.ts,manifest.config.ts,uno.config.ts}` 均存在；根 `package.json` 的 `dev:free` = `pnpm --filter free dev:h5` → 在 `apps/free` 内执行 `uni`，使用 `apps/free/vite.config.ts`。**根配置确为孤儿副本**。
2. ✅ **根 `tsconfig.json`**：`include: []` + `references` 含不存在的 `packages/apps/app-a`（真实是 `apps/free`）。`type-check: tsc --noEmit` 为空操作。`ARCH-03` 成立。
3. ✅ **`.npmrc` 存在**：内容为 `ignoredBuiltDependencies: ['@uni-helper/unocss-preset-uni','core-js','esbuild']`，与 workspace `onlyBuiltDependencies` 同包反意。`ARCH-02` 成立。
4. ✅ **apps/free/vite.config.ts 主动引用根脚本**：`import ... from '../../scripts/open-dev-tools.js'`、`'../../vite-plugins/copy-native-resources.js'` 等 → `open-dev-tools`/`vite-plugin-eruda`/`copy-native-resources`/`sync-manifest-plugins` **这四个脚本是真实被使用的**（agent 判断一致）；其余 6 个 scripts 是孤儿。
5. 🔧 **更正 agent 初判**：`@dcloudio/types ^3.4.8` vs 运行时 `3.0.0-40706...` 是 **unibest 官方模板常规搭配**（types 包独立发版），**非版本不一致 bug**，见 `ARCH-04`，保持不动即可。
6. 🔧 **更正 agent 初判**：根孤儿 `vite.config.ts` 含 `fix-vite-plugin-vue` 内联插件（dcloudio 编译 BUG 修复）与 `console.log`/`subPackages:['src/pages-demo']`。原 `FREE-17` 称「生效的 `apps/free/vite.config.ts` 缺失该补丁」系 **agent 漏读不实**——已逐行核对 apps/free 第 81–89 行，**该补丁已存在**，清理根副本前无需补回。根副本仅多调试日志，删除后更干净。
7. ✅ **根 `pages.config.ts` 第 2 行** `import { tabBar } from './src/tabbar/config'`，根 `src/` 无 `tabbar` 目录 → 根配置本身已损坏，进一步证实其为孤儿。

---

*本文档由审查流程自动汇总，逐条建议均可在后续对话中按编号（如 `CORE-03`）指定改造。改造前对标注「需起服务验证」的运行时项（如 `FREE-01` tabbar 显示）请先本地运行确认。*
