/**
 * @description 通过 vite 自定义条件动态导入 eruda
 * @description Eruda 配置参考 https://eruda.liriliri.io/zh/docs/
 * @param {object} options
 * @param {boolean} [options.open] - 是否开启 eruda
 * @param {object} [options.erudaOptions] - eruda 配置
 * @param {string} [options.erudaUrl] - eruda 地址
 */
// ROOT-20: 将 eruda CDN 地址提取为常量，允许通过 options.erudaUrl 或环境变量 ERUDA_URL 覆盖，
// 避免硬编码到 jsdelivr（内网 / 私有化部署时可指向自建 CDN）
const DEFAULT_ERUDA_URL = 'https://cdn.jsdelivr.net/npm/eruda'

export default function vitePluginEruda(options = {}) {
  const { open = true, erudaOptions = {}, erudaUrl = process.env.ERUDA_URL || DEFAULT_ERUDA_URL } = options

  return {
    name: 'vite-plugin-eruda',

    transformIndexHtml(html) {
      const tags = [
        {
          tag: 'script',
          attrs: {
            src: erudaUrl,
          },
          injectTo: 'head',
        },
        {
          tag: 'script',
          children: `eruda.init(${JSON.stringify(erudaOptions)});`,
          injectTo: 'head',
        },
      ]

      if (!open) {
        return html
      }
      return { html, tags }
    },
  }
}
