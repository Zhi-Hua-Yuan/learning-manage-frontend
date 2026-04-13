# 深色模式改造 TODO（小步执行版）

## 使用说明
- 状态说明：`[ ]` 未开始，`[~]` 进行中，`[x]` 已完成。
- 执行方式：严格按阶段推进，每完成一小步就勾选，避免一次性大改。
- 目标范围：覆盖登录页 + 主布局 + 所有业务页面 + 组件 + 图表。

---

## P0：准备与基线（先做）

### 1. 建立改造基线
- [x] 新建深色模式改造分支（如 `feat/dark-mode`）。（当前分支：`feat/dark-mode`）
- [x] 记录当前浅色模式截图（登录、任务、仪表盘、周报、AI、设置）。（见 `docs/baseline-screenshots/*.png`）
- [x] 确认现有主题变量入口：`src/assets/main.css`。（见 `docs/dark-mode-baseline.md`）

### 2. 清点硬编码颜色（形成清单）
- [x] 统计 `bg-white / text-gray-* / border-gray-* / bg-[#...]` 出现位置。（总计 `202`；`bg-white=38`、`text-gray-*=143`、`border-gray-*=50`、`bg-[#...]=23`）
- [x] 标记优先级最高文件：`BasicLayout.vue`、`TaskList.vue`、`Dashboard.vue`。（`TaskList=54`、`BasicLayout=36`、`Dashboard=16`）
- [x] 标记图表硬编码颜色位置（`Dashboard.vue` 的 ECharts 配置）。（`src/views/dashboard/Dashboard.vue:119,123,124,128,132,133,142,143`）

### 3. 确认改造策略
- [x] 确定主题机制：`html[data-theme="light|dark"]` + CSS 变量。（已冻结到 `docs/dark-mode-baseline.md`）
- [x] 确定模式策略：支持 `light`、`dark`、`system` 三种模式。（已冻结到 `docs/dark-mode-baseline.md`）
- [x] 确定存储键名：`tick_themeMode`（避免与现有键冲突）。（源码检索无冲突）

---

## P1：主题基础设施（变量与状态）

### 1. 扩展全局设计变量（`main.css`）
- [x] 在 `:root` 保持现有浅色变量定义（作为 light 基线）。（已在 `src/assets/main.css` 保留并扩展）
- [x] 新增 `:root[data-theme='dark']` 深色变量。（已新增）
- [x] 补齐语义变量：页面背景、卡片背景、次级背景、文本层级、边框、悬浮层、遮罩层。（已补齐）
- [x] 补齐深色阴影变量（避免直接复用浅色阴影造成发灰）。（已补齐）
- [x] 为表单、按钮、卡片基础类改为优先使用变量而非固定颜色。（`.btn-secondary/.btn-danger/.input-base/.card-base` 已变量化）
- [x] 为 `body` 增加 `color-scheme` 适配（light/dark）。（通过 `:root` / `:root[data-theme='dark']` 配置）

### 2. 主题状态管理（新增 composable/store）
- [x] 新增 `src/composables/useTheme.ts`（或 `src/stores/theme.ts`）。（已新增 `useTheme.ts`）
- [x] 定义类型：`'light' | 'dark' | 'system'`。（已定义 `ThemeMode`）
- [x] 初始化逻辑：读取 `localStorage`，无值时默认 `system`。（已实现）
- [x] 计算实际主题：`system` 时跟随 `prefers-color-scheme`。（已实现）
- [x] 将实际主题同步到 `document.documentElement.dataset.theme`。（已实现）
- [x] 监听系统主题变化（`matchMedia` change 事件）。（已实现）
- [x] 暴露 `setThemeMode`、`themeMode`、`resolvedTheme`。（已实现）

### 3. 应用入口接入
- [x] 在 `src/main.ts` 启动时初始化主题。（`createApp` 前调用 `initTheme()`）
- [x] 避免页面首屏闪烁（初始化时立即写入 `data-theme`）。（已在应用挂载前写入）
- [~] 验证刷新后主题保持一致。（逻辑已支持，待你本地手工切换/刷新确认）

---

## P2：先改公共层（布局 + 复用组件）

### 1. 布局层（`BasicLayout.vue`）
- [x] 替换容器背景、文字、边框为主题语义色。
- [x] 替换侧栏、菜单 hover、选中态颜色，确保深色对比可读。
- [x] 替换弹窗/遮罩色值（含退出登录弹窗）。
- [x] 校正移动端遮罩和阴影在深色下的层级表现。

### 2. 全局弹窗组件（`AppConfirmDialog.vue`）
- [x] 替换面板背景、标题文字、说明文字、遮罩颜色为语义变量。
- [x] 校验 `danger` / `primary` 两种变体在深色下可区分。
- [x] 校验过渡动画在深色下不出现闪烁边缘。

### 3. 全局 Toast（`GlobalToastHost.vue`）
- [x] 替换容器背景、关闭按钮 hover、文本颜色为语义变量。
- [x] 校验 success/error/warning/info 四类对比度。
- [x] 校验撤销按钮在深色下可见性。

---

## P3：逐页迁移（按业务优先级）

### 1. 任务页（`TaskList.vue`，最高优先级）
- [ ] 顶部栏、输入区、任务卡片、详情面板全部切换到语义色。
- [ ] 任务完成态、优先级标签、进度条在深色下保持可读。
- [ ] 下拉菜单、日期选择、阶段选择面板统一深色风格。
- [ ] 校验选中态 ring、边框与 hover 态不会“发灰”或“糊边”。

### 2. 仪表盘（`Dashboard.vue`）
- [ ] 统计卡片、排行列表、空状态切换到语义色。
- [ ] 为 ECharts 配置增加深/浅两套颜色参数。
- [ ] 在主题变化时重新应用图表 option（无需刷新页面）。

### 3. 周报页（`WeeklyReview.vue`）
- [ ] 摘要区、编辑区、历史列表、详情弹窗切换为语义色。
- [ ] 文本域 focus 边框在深色下保持清晰。
- [ ] 删除/导出等危险操作按钮在深色下仍有明确语义区分。

### 4. AI 规划页（`AiPlanner.vue`）
- [ ] 表单区、草稿区、失败重试区切换为语义色。
- [ ] 勾选框、导入确认弹窗、按钮状态（禁用/加载）适配深色。
- [ ] 验证“高亮色（emerald）”在深色背景下不刺眼且可读。

### 5. 设置页（`Settings.vue`）
- [ ] Tab、输入框、禁用态输入、成功弹窗切换为语义色。
- [ ] 在“个人设置”新增主题切换项（light/dark/system）。
- [ ] 切换主题后立即生效并持久化。

### 6. 登录页（`LoginView.vue`）
- [ ] 页面背景、卡片、输入框、错误提示适配深色。
- [ ] 保持登录/注册两种状态样式一致。
- [ ] 校验 logo 与阴影在深色背景下不突兀。

---

## P4：清理硬编码与统一规范

### 1. 扫描并清理残留
- [ ] 清理 `bg-[#...]` / `text-gray-*` / `border-gray-*` 的硬编码残留。
- [ ] 清理 `#xxxxxx`、`rgba(...)` 等非必要直接色值（图表特殊色除外）。
- [ ] 将可复用颜色抽回 `main.css` 变量。

### 2. 统一组件状态
- [ ] 统一 hover / active / disabled / focus 的颜色层级。
- [ ] 统一输入框 focus ring 在深浅主题下表现。
- [ ] 统一弹窗遮罩透明度，避免各页面不一致。

---

## P5：验证与回归

### 1. 手工回归（桌面 + 移动）
- [ ] 登录 -> 任务 -> 详情编辑 -> 删除撤销 全流程检查。
- [ ] 仪表盘图表在切换主题后正确重绘。
- [ ] 周报与 AI 页面的弹窗、滚动区、空状态检查。
- [ ] 手机端侧栏、抽屉、遮罩在深色下可用。

### 2. 可访问性与视觉质量
- [ ] 关键文本对比度达到可读标准（重点检查灰字）。
- [ ] 按钮与链接可区分，不仅依赖颜色。
- [ ] 键盘焦点可见（focus 样式明显）。

### 3. 工程校验
- [ ] 执行 `npm run lint` 并修复问题。
- [ ] 执行 `npm run build` 确保构建通过。
- [ ] 记录已知遗留问题与后续优化项。

---

## 验收标准（完成定义）
- [ ] 用户可在设置页切换 `浅色 / 深色 / 跟随系统`。
- [ ] 刷新页面后主题模式保持不变（`system` 除外按系统变化）。
- [ ] 所有主页面无明显浅色残留块（白底、浅灰字不可读）。
- [ ] 图表、弹窗、Toast、输入框在深色下可读且交互正常。
- [ ] 代码中主题相关逻辑集中、可维护，未引入大面积重复样式。
