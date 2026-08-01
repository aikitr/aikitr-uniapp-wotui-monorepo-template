import fs from 'node:fs'
import path from 'node:path'

const coreSrcPath = path.resolve('packages/core/src')

function replaceImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content

  // Replace @/xxx imports with relative imports within core package
  content = content.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, importPath) => {
    // Map common imports to their actual locations in core package
    const mappings = {
      'http/http': './http/http',
      'http/alova': './http/alova',
      'http/vue-query': './http/vue-query',
      'http/types': './http/types',
      'http/interceptor': './http/interceptor',
      'api/login': './api/login',
      'api/types/login': './api/types/login',
      'store': './store',
      'store/token': './store/token',
      'store/user': './store/user',
      'router/interceptor': './router/interceptor',
      'router/permission': './router/permission',
      'utils': './utils/index',
      'utils/debounce': './utils/debounce',
      'utils/toLoginPage': './utils/toLoginPage',
      'utils/uploadFile': './utils/uploadFile',
      'hooks/useScroll': './hooks/useScroll',
      'hooks/useRequest': './hooks/useRequest',
      'hooks/useUpload': './hooks/useUpload',
      'typings': './types/typings',
    }

    if (mappings[importPath]) {
      return `from '${mappings[importPath]}'`
    }

    // Default: use relative path from current file
    const dir = path.dirname(filePath)
    const target = path.resolve(dir, importPath)
    const relativePath = path.relative(dir, target).replace(/\\/g, '/')
    return `from '${relativePath}'`
  })

  if (content !== original) {
    fs.writeFileSync(filePath, content)
    console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`)
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkDir(fullPath)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) {
      replaceImports(fullPath)
    }
  }
}

walkDir(coreSrcPath)
console.log('Done fixing core package imports')
