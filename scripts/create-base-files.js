// Base files generator for monorepo app
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Most minimal runnable config
const manifest = {
  name: 'aikitr',
  appid: '__UNI__YOUR_APP_ID',
  description: '',
  versionName: '1.0.0',
  versionCode: '100',
  transformPx: false,
  vueVersion: '3',
}

const pages = {
  pages: [
    {
      path: 'pages/index/index',
      type: 'home',
      style: {
        navigationStyle: 'custom',
        navigationBarTitleText: '首页',
      },
    },
    {
      path: 'pages/me/me',
      type: 'page',
      style: {
        navigationBarTitleText: '我的',
      },
    },
  ],
  subPackages: [],
}

// Use the current directory as base (for app packages)
const basePath = process.cwd()
const manifestPath = path.resolve(basePath, 'src', 'manifest.json')
const pagesPath = path.resolve(basePath, 'src', 'pages.json')

// Ensure src dir exists
const srcDir = path.resolve(basePath, 'src')
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true })
}

const MIN_SIZE = `{}`.length

// Generate manifest.json if not exists or empty
if (!fs.existsSync(manifestPath) || fs.statSync(manifestPath).size <= MIN_SIZE) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log('Generated manifest.json')
}

// Generate pages.json if not exists or empty
if (!fs.existsSync(pagesPath) || fs.statSync(pagesPath).size <= MIN_SIZE) {
  fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2))
  console.log('Generated pages.json')
}
