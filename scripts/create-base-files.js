// 基础配置文件生成脚本
// 此脚本用于生成 src/manifest.json 和 src/pages.json 基础文件
// 由于这两个配置文件会被添加到 .gitignore 中，因此需要通过此脚本确保项目能正常运行
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 获取当前文件的目录路径（替代 CommonJS 中的 __dirname）
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 最简可运行配置
// 注意：easycom 规则必须与 pages.config.ts 保持一致。
// uni-app 启动时会缓存此处的 easycom 规则（initEasycomsOnce），后续插件再生成完整的
// pages.json 也不会重新注册，缺失的规则会导致组件被编译成 resolveComponent 而在运行时找不到
// （例如 CI 全新检出时 z-paging 未注册，分页页面不请求数据、页面空白）。
const manifest = { }
const pages = {
  easycom: {
    autoscan: true,
    custom: {
      '^fg-(.*)': '@/components/fg-$1/fg-$1.vue',
      '^(?!z-paging-refresh|z-paging-load-more)z-paging(.*)': 'z-paging/components/z-paging$1/z-paging$1.vue',
      '^wd-(.*)': 'wot-design-uni/components/wd-$1/wd-$1.vue',
    },
  },
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

// 使用修复后的 __dirname 来解析文件路径
const manifestPath = path.resolve(__dirname, '../src/manifest.json')
const pagesPath = path.resolve(__dirname, '../src/pages.json')

// 确保 src 目录存在
const srcDir = path.resolve(__dirname, '../src')
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true })
}

const MIN_SIZE = `{ }`.length // 如果只有一个空对象，必定是不对的，需要重新生成

// 如果 src/manifest.json 不存在，就创建它；或者如果文件大小小于等于 MIN_SIZE，也重新创建
if (!fs.existsSync(manifestPath) || fs.statSync(manifestPath).size <= MIN_SIZE) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

// 如果 src/pages.json 不存在，就创建它；或者如果文件大小小于等于 MIN_SIZE，也重新创建
if (!fs.existsSync(pagesPath) || fs.statSync(pagesPath).size <= MIN_SIZE) {
  fs.writeFileSync(pagesPath, JSON.stringify(pages, null, 2))
}
