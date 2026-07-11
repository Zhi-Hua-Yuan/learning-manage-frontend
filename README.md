# LearningManage 前端

LearningManage 的前端项目，提供项目、阶段、任务、周总结与 AI 智能规划等学习管理能力。

后端项目默认运行在 `http://localhost:8123`，前端开发服务器通过 Vite 将 `/api` 请求代理到后端。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Axios
- Tailwind CSS
- ECharts
- ESLint、Oxlint、Prettier

## 环境要求

- Node.js：`^20.19.0 || >=22.12.0`
- npm
- 已启动的 LearningManage 后端服务
- 后端依赖的 MySQL 和 Redis 服务

可通过以下命令确认 Node.js 和 npm 版本：

```bash
node -v
npm -v
```

## 本地启动

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

Vite 启动后会在终端输出实际访问地址，通常为 `http://localhost:5173`。

## 后端代理配置

开发环境代理位于 [vite.config.ts](./vite.config.ts)：

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8123/',
      changeOrigin: true,
    },
  },
}
```

这表示前端所有以 `/api` 开头的请求都会转发至：

```text
http://localhost:8123/api
```

后端默认启动命令（在后端项目根目录执行）：

```powershell
.\mvnw.cmd spring-boot:run
```

如果后端地址或端口不同，请同步修改 `vite.config.ts` 中的 `target`，然后重启前端开发服务器。

## AI 功能入口

| 功能 | 前端路由 | 说明 |
|---|---|---|
| AI 智能规划 | `/ai-planner` | 填写学习目标、周期和补充描述，生成任务拆解草稿。 |
| AI 草稿详情 | `/ai/draft/:draftId` | 查看服务端草稿、确认创建或取消草稿。 |

AI 任务拆解的正常使用流程：

1. 登录后进入“AI 智能规划”。
2. 填写目标、周期和补充描述，生成 AI 草稿。
3. 在草稿详情页检查阶段和任务内容。
4. 确认后由后端统一创建项目、阶段和任务，并跳转至任务页面；或取消草稿。
5. 草稿是否过期、是否已确认或取消，以服务端返回状态为准。

前端不会逐条调用项目、阶段和任务创建接口。确认草稿时会携带 `operationId`，用于避免网络重试或重复点击造成重复创建。

## 前后端联调前置条件

联调 AI 草稿功能前，请确认：

- 前端和后端均已启动，且前端代理目标可访问。
- 后端已完成数据库初始化，至少包含项目、阶段、任务、AI 草稿、AI 草稿确认日志、AI 调用记录和 Prompt 模板相关表。
- Redis 已启动；AI 预览接口依赖 Redis 限流。
- 后端已安全配置可用的 `ALIYUN_API_KEY`，不要将密钥提交到 Git。
- 已准备可登录的测试账号。
- 浏览器请求会携带登录后的 JWT；接口请求统一使用 `Authorization: Bearer <token>`。
- 使用浏览器访问 `http://localhost:8123/api/health`，确认后端健康检查正常。

AI 草稿预览接口为：

```text
POST /api/ai/breakdown/preview
```

默认情况下，同一用户在 60 秒内最多可调用 3 次。超过限制时，后端会在响应体中返回业务码 `42900`；前端应提示用户稍后再试，而不是自动连续重试。

## 常用命令

类型检查：

```bash
npm run type-check
```

生产构建：

```bash
npm run build
```

本地预览生产构建产物：

```bash
npm run preview
```

代码检查：

```bash
npm run lint
```

> 当前 `npm run lint` 会执行带 `--fix` 的检查命令，可能自动修改代码文件；执行前请先确认工作区改动。

格式化 `src/` 目录：

```bash
npm run format
```

## 目录说明

```text
src/
├─ api/          # 后端接口封装
├─ components/   # 通用组件
├─ composables/  # 组合式逻辑
├─ layout/       # 应用布局
├─ router/       # 路由与登录守卫
├─ stores/       # Pinia 状态
├─ utils/        # 请求、认证等工具
└─ views/        # 页面视图
```

与 AI 草稿相关的主要文件：

- `src/api/ai.ts`：AI 草稿、确认、取消等接口类型与请求封装。
- `src/views/ai/AiPlanner.vue`：AI 任务拆解表单和草稿生成入口。
- `src/views/ai/AiDraftDetail.vue`：草稿详情、确认和取消页面。
- `src/utils/request.ts`：统一请求封装及 AI 结构化错误处理。
- `src/router/index.ts`：AI 页面路由与登录守卫。

## 联调检查清单

完成一次 AI 草稿联调时，建议至少验证：

- 成功生成草稿后进入草稿详情页。
- 刷新草稿详情页后仍能从服务端恢复内容和状态。
- 取消草稿后不可再次确认。
- 确认草稿后项目、阶段、任务均正确创建。
- 重复确认同一 `operationId` 不会创建重复项目。
- 限流、未登录和 AI 调用失败时，页面能展示明确提示且不创建本地伪数据。
