## 项目简介

**翔云太极（XiangYun TaiJi）** 是一款面向太极拳爱好者与教学者的跨端应用，专注于 **太极拳教学、活动管理、视频课程** 等场景。

- 端形态：H5、微信小程序（基于 [UniApp](https://uniapp.dcloud.net.cn/) 跨端框架）
- 视觉风格：**中国传统文化的水墨画风格**
- 后端服务：[`xytj_backend`](../xytj_backend)（Nuxt 4 + Prisma + PostgreSQL）

> 前端门户与后端 API 解耦，前端通过封装好的 HTTP 请求与后端通信。

## 技术栈

| 类别     | 选型                                                              |
| -------- | ----------------------------------------------------------------- |
| 跨端框架 | [UniApp](https://uniapp.dcloud.net.cn/)（Vue 3 + Vite 5）         |
| 语言     | TypeScript 5.x                                                    |
| 状态管理 | [Pinia](https://pinia.vuejs.org/) + `pinia-plugin-persistedstate` |
| UI 组件  | [Wot UI](https://wot-ui.cn/)（`wot-design-uni`）                  |
| 分页组件 | [z-paging](https://z-paging.zxlee.cn/)                            |
| 样式方案 | [UnoCSS](https://unocss.dev/)（原子化 CSS）+ Sass                 |
| 网络请求 | [Alova](https://alova.js.org/) + `@alova/adapter-uniapp`          |
| 富文本   | `mp-html`                                                         |
| 对象存储 | `cos-js-sdk-v5` / `cos-wx-sdk-v5`（腾讯云 COS）                   |
| 日期处理 | [Day.js](https://day.js.org/)                                     |
| 代码规范 | ESLint + Prettier + Husky + Commitlint                            |
| 单元测试 | Vitest + `@vue/test-utils` + `happy-dom`                          |

## 项目结构

```text
xytj_portal/
├── src/
│   ├── pages/                # 页面（约定式路由）
│   │   ├── index/            # 首页
│   │   ├── activities/       # 活动
│   │   ├── articles/         # 文章
│   │   ├── coach/            # 教练
│   │   ├── courses/          # 课程
│   │   ├── training-ground/  # 训练场
│   │   ├── tools/            # 工具
│   │   ├── teacher-invitations/ # 教师邀请
│   │   ├── webview/          # 内嵌网页
│   │   ├── login/            # 登录
│   │   ├── register/         # 注册
│   │   ├── profile/          # 个人资料
│   │   ├── me/               # 我的
│   │   └── about/            # 关于
│   ├── components/           # 全局组件
│   ├── layouts/              # 布局
│   ├── api/                  # API 接口
│   ├── http/                 # HTTP 请求封装
│   ├── store/                # Pinia 状态
│   ├── tabbar/               # 底部导航
│   ├── static/               # 静态资源（图片、图标、tabbar）
│   ├── utils/                # 工具函数
│   └── App.ku.vue            # 全局根组件
├── scripts/                  # 脚本（IP 更新、初始化基础文件等）
├── pages.config.ts           # 页面路由配置
├── manifest.config.ts        # 应用清单配置
├── vite.config.ts            # Vite 构建配置
├── uno.config.ts             # UnoCSS 配置
└── package.json
```

## 快速开始

### 环境要求

- Node.js `>= 20`
- pnpm `>= 9`（推荐 `10.x`）
- Vue Official `>= 2.1.10`
- TypeScript `>= 5.0`

### 安装与运行

```bash
# 安装依赖
pnpm install

# 微信小程序开发
pnpm dev:mp-weixin

# H5 开发（默认 http://localhost:9000）
pnpm dev:h5
```

> 默认未启用 i18n 与登录策略；如需开启，可在 `pages.config.ts` 与 `src/api/` 目录中扩展。

## 开发命令

| 命令                          | 说明                                   |
| ----------------------------- | -------------------------------------- |
| `pnpm dev:mp-weixin`          | 启动微信小程序开发（推荐）             |
| `pnpm dev:mp`                 | 启动微信小程序（同上别名）             |
| `pnpm dev:h5`                 | 启动 H5 开发                           |
| `pnpm dev:app`                | 启动 APP 开发                          |
| `pnpm dev`                    | 默认平台（可在 `package.json` 中调整） |
| `pnpm build:mp-weixin`        | 构建微信小程序                         |
| `pnpm build:h5`               | 构建 H5（产物在 `dist/build/h5`）      |
| `pnpm build:app`              | 构建 APP                               |
| `pnpm type-check`             | TypeScript 类型检查                    |
| `pnpm lint` / `pnpm lint:fix` | ESLint 检查 / 自动修复                 |
| `pnpm test`                   | 运行单元测试（Vitest）                 |
| `pnpm openapi`                | 从 OpenAPI 规范生成前端请求与类型      |

## 编码规范

### Vue 组件

- 使用 Composition API + `<script setup lang="ts">`
- 标签顺序：`<script setup>` → `<template>` → `<style scoped>`（按需）
- **优先使用 UnoCSS 原子化类名**，减少自定义 CSS
- 页面配置通过 `definePage` 宏声明，顺序在 `<script setup>` 最顶部

```vue
<script setup lang="ts">
definePage({
  name: "example",
  style: { navigationBarTitleText: "示例" },
});

const onTap = () => uni.showToast({ title: "Hello" });
</script>

<template>
  <view class="p-4 bg-white">
    <button class="btn-primary" @click="onTap">点击</button>
  </view>
</template>
```

### TypeScript

- 严格使用 TypeScript，避免 `any`
- API 响应数据需定义 `interface`；联合类型使用 `type`
- 导入类型使用 `import type`

### 平台适配

通过 uni-app **条件编译** 处理多端差异：

```vue
<!-- #ifdef H5 -->
<view>H5 特有内容</view>
<!-- #endif -->

<!-- #ifdef MP-WEIXIN -->
<view>微信小程序特有内容</view>
<!-- #endif -->
```

### 路由与页面

- 页面放在 `src/pages/`，文件名即路由
- 局部组件放在对应页面的 `/components/` 子目录
- 全局组件放在 `src/components/`

## 平台兼容

| H5  | 微信小程序 | 安卓 | iOS |
| --- | ---------- | ---- | --- |
| √   | √          | √    | √   |

> H5 与微信小程序为当前主维护平台；APP 通过 `pnpm dev:app` 调试，必要时配合 HBuilderX 运行。

## 设计风格

整体采用 **中国传统文化的水墨画风格**：

- 色调：以墨黑、宣纸白、淡青、赭石为主
- 元素：留白、印章、行书标题、毛笔笔触装饰
- 交互：克制、留白多、转场舒缓

## 相关项目

- 后端服务：[`xytj_backend`](../xytj_backend)（Nuxt 4 + Prisma）
- 顶层文档：[`AGENTS.md`](../AGENTS.md)
- 前端项目规则：[`xytj_portal/.trae/rules/project_rules.md`](./.trae/rules/project_rules.md)

## 许可证

[MIT](./LICENSE) © 翔云太极
