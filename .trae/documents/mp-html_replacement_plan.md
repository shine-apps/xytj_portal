# 使用 mp-html 替代 rich-text 组件计划

## 任务概述

在 `CustomRichText.vue` 组件中添加 mp-html 组件，并使用它替代原有的 rich-text 组件，以获得更强大的富文本渲染能力。

## 背景

当前 `CustomRichText.vue` 使用微信小程序原生的 `rich-text` 组件，存在以下问题：
- HTML 解析需要手动转换为节点格式（通过 `parseHtmlToRichTextNodes`）
- 支持的标签有限
- 跨平台处理复杂（微信端需要转换，其他平台直接传 HTML）

**mp-html** 是一个功能强大的小程序富文本组件：
- 支持丰富的 HTML 标签（包括 table、video、svg 等）
- 支持图片预览、链接处理等交互功能
- 更好的跨平台兼容性
- 高效渲染性能

## 实现步骤

### 1. 安装 mp-html 依赖

在项目根目录执行：
```bash
pnpm add mp-html
```

### 2. 创建全局组件配置

在 `src/components.json` 或通过 uni-app 的 easycom 配置全局注册 mp-html 组件。

### 3. 修改 CustomRichText.vue 组件

#### 3.1 移除不再需要的导入和逻辑

- 移除 `parseHtmlToRichTextNodes` 函数的导入和调用
- 移除 `hasNodes` 计算属性（mp-html 可以直接处理空内容）
- 移除 `#ifdef MP-WEIXIN` 和 `#ifndef MP-WEIXIN` 的条件编译分支

#### 3.2 引入 mp-html 组件

```vue
<script setup lang="ts">
import mpHtml from 'mp-html/dist/uni-app/components/mp-html/mp-html'
</script>
```

#### 3.3 更新模板

将原来的：
```vue
<!-- #ifdef MP-WEIXIN -->
<rich-text
  v-if="hasNodes"
  :nodes="richTextNodes"
  :selectable="selectable"
  :user-select="selectable"
  :space="space"
  :class="className"
  @tap="handleRichTextLinkTap"
/>
<text v-else class="text-gray-400 italic">暂无内容</text>
<!-- #endif -->
<!-- #ifndef MP-WEIXIN -->
<rich-text
  v-if="content"
  :nodes="content"
  :selectable="selectable"
  :space="space"
  :class="className"
/>
<text v-else class="text-gray-400 italic">暂无内容</text>
<!-- #endif -->
```

替换为：
```vue
<mp-html
  v-if="content"
  :content="content"
  :selectable="selectable"
  :preview-img="true"
  :copy-link="true"
  :set-title="false"
  :class="className"
  @linktap="handleLinkTap"
/>
<text v-else class="text-gray-400 italic">暂无内容</text>
```

#### 3.4 实现链接点击处理函数

```vue
<script setup lang="ts">
const handleLinkTap = (e: any) => {
  const href = e.detail?.href || e.href

  if (!href) return

  // 处理外部链接
  if (href.startsWith('http://') || href.startsWith('https://')) {
    const encodedUrl = encodeURIComponent(href)
    uni.navigateTo({
      url: `/pages/webview/webview?url=${encodedUrl}`,
    })
  }
}
</script>
```

### 4. 清理不再需要的工具函数

修改 `src/utils/richText.ts`：
- 保留 `handleRichTextLinkTap`（如果其他地方还在使用）
- 移除 `parseHtmlToRichTextNodes` 函数（不再需要）
- 或者将文件重命名为 `link.ts` 并保留链接处理相关功能

### 5. 配置 Vite 支持 mp-html

由于项目使用 Vite（不是 Vue CLI），需要在 `vite.config.ts` 中添加配置以支持 mp-html 组件的转译。

在 `vite.config.ts` 的 `defineConfig` 返回对象中添加：

```typescript
optimizeDeps: {
  include: [
    'mp-html',
    'mp-html/dist/uni-app/components/mp-html/mp-html',
  ],
},
```

这个配置告诉 Vite 在预构建阶段转译 mp-html，避免运行时出现 ES Module 相关的问题。

### 6. 更新 TypeScript 类型定义

确认 `mp-html` 的类型定义是否完整，可能需要：
- 添加类型声明文件
- 或者使用 `@ts-ignore` 临时处理

### 7. 测试验证

#### 7.1 微信小程序端测试
```bash
pnpm dev:mp-weixin
```
验证：
- 富文本内容正确渲染
- 图片可以预览
- 链接点击正常跳转
- 文本选择复制功能正常

#### 7.2 H5 端测试
```bash
pnpm dev
```
验证跨平台兼容性。

#### 7.3 类型检查
```bash
pnpm type-check
```

#### 7.4 代码规范检查
```bash
pnpm lint
```

## 预期效果

1. **更简洁的代码**：移除条件编译和复杂的 HTML 解析逻辑
2. **更好的渲染效果**：支持更多 HTML 标签和样式
3. **增强的用户体验**：内置图片预览、链接处理等功能
4. **统一的跨平台体验**：所有平台使用相同的渲染方式

## 注意事项

1. mp-html 的 `content` 属性直接接受 HTML 字符串，不需要预处理
2. 需要确保组件正确引入和注册
3. 链接处理事件的参数格式可能与原来的 `handleRichTextLinkTap` 不同
4. 某些平台可能需要额外的配置

## 相关文件

- `src/components/CustomRichText.vue` - 需要修改的主组件
- `src/utils/richText.ts` - 需要清理的工具函数
- `vite.config.ts` - 需要添加 optimizeDeps 配置
- `package.json` - 需要添加依赖

## 关键说明

### 为什么不需要 vue.config.js

1. **项目使用 Vite，不是 Vue CLI**：项目基于 uni-app + Vite，使用 `@dcloudio/vite-plugin-uni` 插件系统
2. **Vite 的配置方式不同**：在 `vite.config.ts` 中使用 `optimizeDeps.include` 来处理依赖转译
3. **`vue.config.js` 是 Vue CLI 专属**：仅在使用 Vue CLI 创建的项目中需要

### Vite optimizeDeps 的作用

`optimizeDeps` 配置告诉 Vite：
- 在开发服务器启动前预构建这些依赖
- 将 ES Module 或 CommonJS 依赖转换为 ESM 格式
- 避免浏览器直接请求大量小的模块文件
- 提高开发时的加载性能

对于 mp-html 这类包含 ES Module 代码的 npm 包，配置此选项可以避免运行时错误。
