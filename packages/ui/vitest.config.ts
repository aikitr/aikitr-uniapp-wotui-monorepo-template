import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// 库自身不声明 @aikitr/core 依赖（依赖消费 app 的 vite alias 解析），
// 但本包单测需要解析 @aikitr/core/*（store.ts / types.ts 运行时导入 core），
// 故在测试环境内单独建立别名，不影响发布产物契约。
export default defineConfig({
  resolve: {
    alias: {
      '@aikitr/core': fileURLToPath(new URL('../core/src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
