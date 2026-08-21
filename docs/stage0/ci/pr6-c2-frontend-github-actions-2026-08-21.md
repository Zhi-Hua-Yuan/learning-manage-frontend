# 阶段 0 / PR6-C2：前端 GitHub Actions CI 接入记录

执行日期：2026-08-21（Asia/Shanghai）
执行状态：本地实现与验证通过；远程 Runner 验收待推送 PR 后完成

## 1. 执行边界

本步骤只修改前端仓库的 CI 配置、只读 lint 脚本、Node/npm 版本声明、覆盖率门槛和阶段记录。

未连接或修改项目数据库、3306 主库、后端仓库、生产凭据、部署环境或 GitHub Ruleset。

## 2. 仓库与分支

```text
repository=Zhi-Hua-Yuan/learning-manage-frontend
base=develop
base_commit=ae14dd083f9f73197742e915e30445b6f5a6ee9e
branch=chore/pr6-c2-frontend-github-actions
node=22.13.1
npm=10.9.2
```

## 3. CI 实现

新增 `.github/workflows/frontend-ci.yml`，工作流名称为 `Frontend CI`，触发方式为：

- `pull_request` 到 `develop`；
- `push` 到 `develop`；
- 手动 `workflow_dispatch`。

权限固定为 `contents: read`，启用同分支并发取消，所有第三方 Action 使用完整 commit SHA。

冻结的 Job 名称：

```text
Guard and secret scan
Frontend tests and static verification
Frontend production build
```

执行链为：

```text
Guard and secret scan
        ↓
Frontend tests and static verification
        ↓
Frontend production build
```

## 4. 本地实现内容

- 新增 `lint:ci`、`lint:oxlint:ci`、`lint:eslint:ci`，不含 `--fix` 或 `--write`；
- 新增 `.nvmrc`，固定 Node `22.13.1`；
- 在 `package.json` 中声明 `npm@10.9.2`；
- Vitest 覆盖率门槛冻结为：Statements 55%、Branches 48%、Functions 38%、Lines 60%；
- Guard 检查 lockfile、Node 版本声明、只读 lint 和禁止 `pull_request_target`；
- 测试 Job 执行只读 lint、测试覆盖率和类型检查；
- 构建 Job 重新安装锁定依赖并上传带 SHA-256 的 `dist` Artifact；
- 覆盖率和构建 Artifact 保留7天；
- CI 不使用数据库、后端账号或生产 Secret。

## 5. 本地验收

```text
node=v22.13.1
npm=10.9.2

npm run lint:ci       PASS
test files            7 passed
tests                 43 passed
coverage              Statements 58.05%
                      Branches   50.48%
                      Functions  40.00%
                      Lines      61.65%
npm run type-check    PASS
npm run build         PASS
vite modules         714
dist sensitive scan   PASS
git diff --check      PASS
```

本机首次 `npm ci` 因旧 Oxlint 原生文件被 Windows 进程占用而返回 EPERM；未修改源码。随后使用 `npm install --prefer-offline` 恢复依赖，并重新完成上述验收。该本机文件锁问题不会进入 CI 运行环境。

远程首轮运行 `32474718755` 暴露 Guard 自检误报：禁止事件字符串同时出现在 Guard 的搜索规则中，导致 Guard 将自身匹配。已将该字符串改为运行时拼接，保留禁止 `pull_request_target` 的检测语义，并提交修复后重新触发完整 CI。

## 6. 远程验收计划

推送本分支并创建 Draft PR 后，记录以下结果：

1. 三个 Job 均成功；
2. Node/npm 版本断言通过；
3. Gitleaks 扫描通过；
4. 覆盖率门槛通过；
5. 构建 Artifact 可下载且哈希文件存在；
6. 新提交能够使旧检查失效并触发第二轮完整 CI；
7. 合并后 `develop` 的 push 工作流成功。

远程验收通过后，再进入 PR6-C3 前端 `develop` Ruleset 与必需状态检查配置。
