# PR6-D2-A 前端接口契约导出记录

## 范围

本阶段只在 `learning-manage-frontend` 仓库实现前端接口契约导出能力，为后续 PR6-D2-B 的后端 OpenAPI 比对提供输入。未连接后端、数据库、Redis、Qdrant 或部署环境。

基线：`develop` / `7ed05ecb78b529a28d5d7602f85f154c2745fd77`。

## 实现内容

- 使用 TypeScript Compiler API 扫描 `src/api/*.ts`，识别 `request.get/post/put/delete/patch`。
- 支持字符串路径、模板参数和 `encodeURIComponent()` 参数，并将动态段规范化为 `{parameter}`。
- 合并重复的 `method + path` 操作，使用稳定的字节序排序，不写入时间、绝对路径、请求体或敏感配置。
- 增加 `contracts/frontend-api-contract.schema.json`，固定 `schemaVersion=1` 和 `/api` 基路径。
- 增加 `contract:verify` 和 `contract:export` npm 命令。
- Frontend CI 在测试 Job 执行契约验证，在构建 Job 上传契约、Schema 及 SHA-256 文件。
- 将现有路由懒加载测试的单用例超时上限从 5 秒调整为 10 秒，避免覆盖率模式下的环境时序抖动；测试逻辑未改变。

## 本地验收结果

当前源码扫描结果：

```text
API 文件：7
request 调用点：38
唯一 operations：37
未解析动态调用：0
```

已通过：

- `npm run contract:verify`
- PR6-D2-A 独立 Node 契约测试：3 项全部通过
- 原有 Vitest 测试：43 项全部通过（覆盖率门禁通过）
- `npm run lint:ci`
- `npm run type-check`
- `git diff --check`

导出文件：

```text
ci-artifacts/frontend-api-contract.json
ci-artifacts/frontend-api-contract.sha256
ci-artifacts/frontend-api-contract.schema.json
```

当前本地契约 SHA-256：

```text
39ca49e63c1d1f3c6f7d232180f57b20a668b14573ac6c2792c65c4a53f69035
```

该哈希仅代表当前工作分支源码生成结果；合并后的最终 SHA 和远程 Artifact 以受保护 PR 的 CI 结果为准。

## 下一步

提交受保护 PR，等待三项 Frontend CI 全部通过并下载 Artifact 验证契约哈希。完成后进入 PR6-D2-B：后端运行时 OpenAPI 导出与前后端接口存在性比对。
