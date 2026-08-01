import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const coreSrcPath = path.resolve(__dirname, '../packages/core/src')

// Map of common imports to their actual paths
const IMPORT_MAP = {
  // api imports
  './api/login': '../api/login',
  './api/types/login': '../api/types/login',
  './api': '../api',
  
  // http imports
  './http/http': '../http/http',
  './http/types': '../http/types',
  './http/interceptor': '../http/interceptor',
  './http/alova': '../http/alova',
  './http/vue-query': '../http/vue-query',
  './http': '../http',
  
  // store imports
  './store/token': '../store/token',
  './store/user': '../store/user',
  './store': '../store',
  
  // utils imports
  './utils/index': '../utils/index',
  './utils/debounce': '../utils/debounce',
  './utils/toLoginPage': '../utils/toLoginPage',
  './utils/uploadFile': '../utils/uploadFile',
  './utils/systemInfo': '../utils/systemInfo',
  './utils': '../utils',
  
  // router imports
  './router/interceptor': '../router/interceptor',
  './router/permission': '../router/permission',
  
  // hooks imports
  './hooks/useScroll': '../hooks/useScroll',
  './hooks/useRequest': '../hooks/useRequest',
  './hooks/useUpload': '../hooks/useUpload',
}

function fixImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  const original = content
  
  // Replace all mapped imports
  for (const [oldImport, newImport] of Object.entries(IMPORT_MAP)) {
    // Escape special regex characters in oldImport
    const escapedOld = oldImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`from ['"]${escapedOld}['"]`, 'g')
    content = content.replace(regex, `from '${newImport}'`)
  }
  
  if (content !== original) {
    fs.writeFileSync(filePath, content)
    console.log(`Fixed: ${path.relative(process.cwd(), filePath)}`)
    return true
  }
  return false
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  let fixed = 0
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      fixed += walkDir(fullPath)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.vue')) {
      if (fixImports(fullPath)) {
        fixed++
      }
    }
  }
  return fixed
}

const fixedCount = walkDir(coreSrcPath)
console.log(`\nTotal files fixed: ${fixedCount}`)
