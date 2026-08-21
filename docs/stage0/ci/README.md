# 阶段 0 前端 CI 与分支保护

## 当前状态

| 阶段 | 内容 | 状态 |
|---|---|---|
| PR6-C0 | 前端基线与仓库卫生 | 已完成 |
| PR6-C1 | Vitest 测试基础设施与核心测试 | 已完成 |
| PR6-C2 | Frontend CI 与远程 Runner 验收 | 已完成 |
| PR6-C3 | `develop` Ruleset 与必需状态检查 | 执行中 |

## 冻结门禁

Frontend CI 固定为三个顺序执行的 Job：

```text
Guard and secret scan
        ↓
Frontend tests and static verification
        ↓
Frontend production build
```

C3 完成后，三项 Job 都必须成为 `develop` 的 Required Check。单人仓库不要求人工审批，但必须通过 Pull Request、最新分支校验、对话清零和全部自动化检查。

## 文档索引

- [PR6-C0 前端基线记录](pr6-c0-frontend-baseline-2026-08-21.md)
- [PR6-C1 Vitest 记录](pr6-c1-vitest-2026-08-21.md)
- [PR6-C2 GitHub Actions 记录](pr6-c2-frontend-github-actions-2026-08-21.md)
- [PR6-C3 分支保护记录](pr6-c3-frontend-branch-protection-2026-08-21.md)
- [Ruleset 期望配置](rulesets/protect-develop-v1.json)
