# 阶段 0 / PR6-C3：前端 develop Ruleset 与必需状态检查

执行日期：2026-08-21（Asia/Shanghai）  
状态：已完成

## 1. 目标与边界

本步骤为单人维护的前端仓库建立 `develop` Ruleset，把 PR6-C2 已远程验收的 Frontend CI 接入合并规则。

执行边界：

- 所有 `develop` 变更必须通过 Pull Request；
- 三项 Frontend CI 必须全部成功；
- 必需人工审批数为 0，避免单人仓库因无法自我批准而锁死；
- PR 必须基于最新 `develop`，未解决对话必须清零；
- 禁止删除和强制推送 `develop`；
- 日常 bypass list 为空；
- 不连接数据库，不修改后端、生产凭据或部署环境。

## 2. 执行前快照

```text
repository=Zhi-Hua-Yuan/learning-manage-frontend
visibility=public
default_branch=develop
starting_commit=1d52334f5640a91dfc13802d78c2194f33cd39b2
origin_develop=1d52334f5640a91dfc13802d78c2194f33cd39b2
worktree=clean
allow_update_branch=false
active_repository_rulesets=0
active_rules_for_develop=0
```

## 3. 已冻结的必需状态检查

PR6-C2 最终成功运行：

```text
run_id=32475672554
run_url=https://github.com/Zhi-Hua-Yuan/learning-manage-frontend/actions/runs/32475672554
validated_commit=1d52334f5640a91dfc13802d78c2194f33cd39b2
expected_source=github-actions
integration_id=15368
```

Required Check contexts：

```text
Guard and secret scan
Frontend tests and static verification
Frontend production build
```

三项 Check Run 均为 `completed/success`。

## 4. Ruleset 最终配置

```text
ruleset_id=21145113
ruleset_url=https://github.com/Zhi-Hua-Yuan/learning-manage-frontend/rules/21145113
ruleset_contract_sha256=82491817e5fa8485b84b488bd262758e419fbd0a0dc7720be18d9b5d9a8294cf
name=protect-develop-v1
target=branch
include=refs/heads/develop
exclude=<none>
enforcement=active
bypass_actors=[]
required_approving_review_count=0
required_review_thread_resolution=true
strict_required_status_checks_policy=true
restrict_deletions=true
block_force_pushes=true
allow_update_branch=true
```

允许的合并方式保持仓库现状：`merge`、`squash`、`rebase`。

## 5. 单人仓库自审

PR 作者不能批准自己的 PR，因此本仓库不配置必需人工审批。质量门禁由结构化自审、三项 Frontend CI、最新分支要求和对话清零共同承担。

## 6. 管理员 Break-glass

日常不保留管理员绕过。若 GitHub Actions 或工作流自身故障导致修复 PR 无法通过，必须先建立 `BREAK-GLASS` Issue，记录失败检查、目标 PR、风险、操作人和时间；随后仅临时增加 `Repository administrator / Pull requests only` 绕过，仍通过 PR 合并最小修复，并在完成后立即移除绕过、复核 Ruleset History。禁止使用永久 `Always` 或 `Exempt`。

## 7. 执行与验证结果

Ruleset 已按“Disabled 创建、核验、Active 激活”的顺序执行：

```text
validation_pr=https://github.com/Zhi-Hua-Yuan/learning-manage-frontend/pull/13
initial_validation_run=https://github.com/Zhi-Hua-Yuan/learning-manage-frontend/actions/runs/32481807113
second_validation_commit=4550247d79de37b4689dfc4e8ebff2681c3b62cb
second_validation_run=https://github.com/Zhi-Hua-Yuan/learning-manage-frontend/actions/runs/32482398421
validation_merge_commit=e6b95558174d825081d851df793d0fe0f9091345
post_merge_run=https://github.com/Zhi-Hua-Yuan/learning-manage-frontend/actions/runs/32482653744
```

已确认：

- Disabled 状态下三个必需检查、目标分支和空 bypass list 与期望配置一致；
- Disabled 状态下命中 `develop` 的 Effective Rule 为 0；
- Active 后 deletion、non-fast-forward、pull request、required status checks 四类规则均命中 `develop`；
- 验证 PR 第一轮三个 Job 均为 `completed/success`；
- 验证 PR 增加新提交后，旧检查失效，合并状态重新变为 `BLOCKED`；
- 第二轮三个 Job 全部成功后，PR 合并状态恢复为 `CLEAN`；
- PR #13 无未解决评审对话，并通过 Ruleset 以 squash 方式合并；
- 合并后 `develop` push CI 运行 32482653744 的三个 Job 全部成功；
- 未通过直接推送、强制推送或管理员 bypass 测试规则。

## 8. 验收结论

PR6-C3 验收通过。前端 `develop` 已具备适配单人仓库的 PR 合并门禁：无需人工审批，但必须满足最新分支、对话清零及三项 Frontend CI 全部成功；分支删除、强制推送及日常管理员绕过均受限制。

本记录通过独立收尾 PR 提交，收尾 PR 自身必须再次通过同一 Ruleset。

## 9. 回滚原则

若 Ruleset context、目标分支或合并行为异常，先将 Ruleset 切换为 `disabled`，保留 History，再修正配置并重新使用验证 PR。不得通过真实直接推送或强制推送测试规则。
