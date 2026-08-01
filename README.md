<p align="center">
  <img width="160" src="./src/static/logo.svg">
</p>

<h1 align="center">
  aikitr - uniapp wotui monorepo template
</h1>

<div align="center">

![node version](https://img.shields.io/badge/node-%3E%3D20-green)
![pnpm version](https://img.shields.io/badge/pnpm-%3E%3D9-green)
![GitHub package.json version (subfolder of monorepo)](https://img.shields.io/github/package-json/v/aikitr-team/aikitr-uniapp-wotui-monorepo-template)
![GitHub License](https://img.shields.io/github/license/aikitr-team/aikitr-uniapp-wotui-monorepo-template)

</div>

`aikitr-uniapp-wotui-monorepo-template` —— 基于 unibest 架构的 uniapp 开发模板，由 `uniapp` + `Vue3` + `Ts` + `Vite5` + `UnoCss` + `wot-ui` + `z-paging` 构成，使用了最新的前端技术栈，无需依靠 `HBuilderX`，通过命令行方式运行 `web`、`小程序` 和 `App`（编辑器推荐 `VSCode`，可选 `webstorm`）。

内置了 `约定式路由`、`layout布局`、`请求封装`、`请求拦截`、`登录拦截`、`UnoCSS`、`i18n多语言` 等基础功能，提供了 `代码提示`、`自动格式化`、`统一配置`、`代码片段` 等辅助功能，让你编写 `uniapp` 拥有最佳体验。

---

## 平台兼容性

| H5  | IOS | 安卓 | 微信小程序 | 字节小程序 | 快手小程序 | 支付宝小程序 | 钉钉小程序 | 百度小程序 |
| --- | --- | ---- | ---------- | ---------- | ---------- | ------------ | ---------- | ---------- |
| √   | √   | √    | √          | √          | √          | √            | √          | √          |

## ⚙️ 环境要求

- node >= 20
- pnpm >= 9
- Vue 3 + TypeScript

## 📦 快速开始

```bash
# 安装依赖
pnpm i

# 运行 H5
pnpm dev:h5

# 运行微信小程序
pnpm dev:mp
```

## 🚀 开发命令

- H5 平台：`pnpm dev:h5`，然后打开 [http://localhost:9000/](http://localhost:9000/)
- 微信小程序：`pnpm dev:mp` 然后打开微信开发者工具
- APP 平台：`pnpm dev:app`，然后打开 HBuilderX

## 📄 构建发布

- H5：`pnpm build:h5`
- 微信小程序：`pnpm build:mp`
- APP：`pnpm build:app`

## 📄 License

[MIT](https://opensource.org/license/mit/)
