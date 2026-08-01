import { defineConfig } from 'openapi-ts-request'

export default defineConfig([
  {
    describe: 'aikitr-openapi',
    schemaPath: 'https://api.yourdomain.com/openapi.json',
    serversPath: './src/service',
    requestLibPath: `import request from '@/http/vue-query';\n import { CustomRequestOptions_ } from '@/http/types';`,
    requestOptionsType: 'CustomRequestOptions_',
    isGenReactQuery: false,
    reactQueryMode: 'vue',
    isGenJavaScript: false,
  },
])
