# 练拳类型动态加载改造计划

## 背景
当前练拳类型（PracticeType）为前端硬编码的字面量联合 `'BASIC_FORM' | 'SPARRING' | 'CONDITIONING' | 'OTHER'`，并通过 `PRACTICE_TYPE_OPTIONS` 常量渲染选择器。现改为从后端 `GET /api/practice/types` 动态加载，返回 `{ id, name, description }` 列表（按 sortOrder 升序，无需登录）。

## 影响范围
经 grep 确认，`PRACTICE_TYPE_OPTIONS` 被 3 个文件引用，`practiceTypeLabel` 被 4 个文件引用，`PracticeType` 类型被 4 个文件引用。删除常量后需同步修改引用方。

## 修改清单

### 1. src/service/practice.ts
- `PracticeType` 由字面量联合改为 `string`
- 新增 `PracticeTypeItem { id: string; name: string; description: string | null }`
- 新增 `getPracticeTypesAPI(): Promise<PracticeTypeItem[]>` → `http.get<PracticeTypeItem[]>('/api/practice/types')`
- 删除 `PRACTICE_TYPE_OPTIONS` 常量与 `PRACTICE_TYPE_LABELS` 映射
- `practiceTypeLabel(type: PracticeType): string` 改为直接 `return type`（name 即中文显示名）

### 2. src/pages/practice/components/CheckInPopup.vue
- 移除 `PRACTICE_TYPE_OPTIONS` 导入，新增 `getPracticeTypesAPI`、`PracticeTypeItem` 导入
- 新增 `typeOptions = ref<PracticeTypeItem[]>([])`
- `practiceType` 改为 `ref<string>('')`
- onMounted 调用 `getPracticeTypesAPI()` 填充 `typeOptions`；失败 toast "练拳类型加载失败"
- 加载完成后若 `practiceType` 为空且 options 非空，默认选中第一项的 `name`
- `initForm` 新建模式：从本地存储读取上次的 `name`，若不在当前 options 中则默认第一项
- 提交成功后存储 `practiceType.value`（即 name）到 `LAST_TYPE_KEY`
- 模板 `v-for="opt in typeOptions"`，`:key="opt.id"`，绑定 `practiceType = opt.name`，显示 `opt.name`

### 3. src/pages/practice/stats.vue（配套：移除 PRACTICE_TYPE_OPTIONS 引用）
- 移除 `PRACTICE_TYPE_OPTIONS` 导入
- `TYPE_COLORS` 改为 `Record<string, string>`，保留四类颜色
- `typeRows` 改为遍历 `Object.entries(dist)`，颜色用 `TYPE_COLORS[type] ?? '#a3a3a3'` 兜底

### 4. src/pages/practice/components/PracticeCalendar.vue（配套：移除 PRACTICE_TYPE_OPTIONS 引用）
- 移除 `PRACTICE_TYPE_OPTIONS` 导入，新增 `getPracticeTypesAPI`、`PracticeTypeItem` 导入
- `TYPE_DOT_COLORS` 改为 `Record<string, string>`
- 新增 `typeOptions = ref<PracticeTypeItem[]>([])`，onMounted 加载
- `legendItems` 改为 computed，从 `typeOptions` 生成（label 用 name，color 查 `TYPE_DOT_COLORS`，兜底灰色）
- `dotColor` 兜底为灰色

## 验证
- grep `PRACTICE_TYPE_OPTIONS` 确认无残留引用
- `pnpm type-check` 确认无新增错误（基线错误可忽略）
