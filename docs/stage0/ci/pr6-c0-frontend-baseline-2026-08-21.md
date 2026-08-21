# 阶段 0 / PR6-C0：前端基线与本地指导文件边界记录

执行日期：2026-08-21（Asia/Shanghai）
执行状态：通过

## 1. 执行边界

本步骤只检查前端仓库，不修改后端、数据库、3306 主库、生产凭据或部署环境。

本地 `AGENTS.md` 是 Codex 工作指导文件，保留在本机，不纳入 Git 跟踪范围，不进入任何 Pull Request。

## 2. 仓库基线

```text
repository=Zhi-Hua-Yuan/learning-manage-frontend
branch=chore/pr6-c0-frontend-baseline
base_branch=develop
base_commit=b06a115cfaa8413ff2f466dfe021cd4f493aaced
origin_develop=b06a115cfaa8413ff2f466dfe021cd4f493aaced
```

基线开始前 `develop` 与 `origin/develop` 一致。C0 使用独立功能分支，未直接修改 `develop`。

## 3. 本地指导文件边界

```text
file=AGENTS.md
physical_file=preserved
git_tracked=no
local_exclude=.git/info/exclude:/AGENTS.md
pull_request=included=no
```

验证结果：

- `git ls-files AGENTS.md` 无输出；
- `git check-ignore -v AGENTS.md` 命中 `.git/info/exclude`；
- 未修改 `AGENTS.md` 内容；
- 未修改仓库 `.gitignore`；
- `AGENTS.md` 不会被加入本次或后续 PR。

## 4. 工具与依赖基线

```text
node=22.13.1
npm=10.9.2
package_manager=npm
lockfile=package-lock.json
installed_packages=318
```

依赖使用 `npm ci` 按 `package-lock.json` 安装完成。

关键文件 SHA-256：

```text
package.json=DCB036745EDAD3DA9B90FD470A91316713509F8E3C1923FCBC876E557C8ED58E
package-lock.json=38D9CF35A9981AA35322F6224BD90A0E6909A3D554133EA386392530CE764684
```

## 5. 现有验证结果

| 检查项 | 命令 | 结果 |
|---|---|---|
| 依赖安装 | `npm ci` | 通过，318 个包 |
| 类型检查 | `npm run type-check` | 通过 |
| 生产构建 | `npm run build` | 通过，Vite 转换714个模块 |
| 视图 localStorage 守卫 | `npm run lint:cache-views` | 通过 |
| 任务缓存一致性 | `npm run lint:task-cache-sync` | 通过 |
| Oxlint | `npm exec -- oxlint .` | 通过，0 warnings / 0 errors |
| ESLint | `npm exec -- eslint .` | 通过 |
| Git 空白检查 | `git diff --check` | 通过 |

C0 没有执行带 `--fix` 的 `npm run lint`，避免验证过程改写业务代码。

## 6. 测试与 CI 现状

```text
npm_test_script=ABSENT
frontend_test_files=0
github_actions_workflows=ABSENT
```

以上是 C0 的基线事实，不视为 C0 失败。Vitest、前端测试脚本和 GitHub Actions 留给 PR6-C1 至 PR6-C3。

## 7. 收尾检查

- C0 功能分支已创建：`chore/pr6-c0-frontend-baseline`；
- `AGENTS.md` 仍保留在本地但已被本地排除；
- 未产生已跟踪文件修改；
- 未提交业务代码、`node_modules`、构建产物或任何凭据；
- 未连接或修改任何项目数据库。

## 8. PR6-C1 交接

下一步为前端测试基础设施建设：引入 Vitest，增加 `test:ci`，建立首批 API、认证、路由和任务缓存测试，并继续保持 `AGENTS.md` 不进入提交范围。
