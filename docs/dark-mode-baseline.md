# 深色模式改造基线（P0）

更新日期：2026-04-13

## 1) 基线信息

- 分支：`feat/dark-mode`
- 浅色截图目录：`docs/baseline-screenshots/`
- 已记录页面：
  - `login.png`
  - `tasks.png`
  - `dashboard.png`
  - `review.png`
  - `ai-planner.png`
  - `settings.png`

## 2) 主题入口确认

- 当前主题变量入口：`src/assets/main.css`
- 现状：已定义浅色语义变量（`:root`），尚未定义 `data-theme='dark'` 变量区块。

## 3) 硬编码颜色清点

扫描模式：`bg-white | text-gray-* | border-gray-* | bg-[#...]`

- 总计：`202`
- `bg-white`：`38`
- `text-gray-*`：`143`
- `border-gray-*`：`50`
- `bg-[#...]`：`23`

优先改造文件（P0 约定）：

- `src/views/task/TaskList.vue`：`54`
- `src/layout/BasicLayout.vue`：`36`
- `src/views/dashboard/Dashboard.vue`：`16`

## 4) 图表硬编码位置（Dashboard ECharts）

文件：`src/views/dashboard/Dashboard.vue`

- `119`：`axisLabel.color = '#9CA3AF'`
- `123`：`splitLine.lineStyle.color = '#F3F4F6'`
- `124`：`axisLabel.color = '#9CA3AF'`
- `128`：`tooltip.backgroundColor = 'rgba(255, 255, 255, 0.95)'`
- `132`：`tooltip.textStyle.color = '#374151'`
- `133`：`tooltip.extraCssText` 含 `rgba(0, 0, 0, 0.1)`
- `142`：渐变色 `'#60A5FA'`
- `143`：渐变色 `'#3B82F6'`

## 5) 策略冻结（P0 决策）

- 主题机制：`html[data-theme="light|dark"]` + CSS 变量。
- 模式策略：支持 `light`、`dark`、`system`。
- 存储键名：`tick_themeMode`（已全局检索，当前源码无冲突使用）。
