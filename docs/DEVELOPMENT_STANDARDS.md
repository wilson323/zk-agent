# ZK-Agent 开发规范

> 版本：v1.0 · 2025-08-01  
> 维护人：架构委员会

---

## 目录
1. 开发流程总览
2. 分支管理与提交规范
3. 代码风格与质量门禁
4. PR 流程与 Code Review
5. 依赖管理与版本策略
6. 文档规范
7. CI/CD 流程准则
8. 安全、合规与开源策略

---

## 1. 开发流程总览
```
main
 ├─ release/*             # 受保护分支，发布版本
 └─ feature/<ticket-id>   # 功能分支
      └─ fix/<ticket-id>  # HOTFIX 分支
```
1. **每日流程**：
   - 09:30 Stand-up → 更新 GitHub Project 卡片
   - 开发 → 本地 lint/test → push → PR → 自动 CI
   - Reviewer 24h 内审完 → Merge → `main` → 自动部署 Dev 环境
2. **版本节奏**：双周迭代；每月一次 Minor Release。

## 2. 分支管理与提交规范
- **Git Flow 简化版**。
- 提交信息遵循 Conventional Commits：
  - `feat: 支持多语言聊天`
  - `fix(auth): 修复 token 过期刷新问题`
  - `docs(ci): 更新工作流文档`
- 每个 PR 必须关联 Issue / Project 卡片。

## 3. 代码风格与质量门禁
| 语言 | 工具 | 规则 | 说明 |
|------|------|------|------|
| TypeScript | ESLint, Prettier | `.eslintrc.enhanced.js` | 严格模式 + React Hooks |
| Python | Ruff, Black | `pyproject.toml` | W605/W605 级别警告视为错误 |
| Docker | hadolint | 基础镜像安全 |

- **质量门禁**：CI 若出现 lint/测试/构建失败，PR Block。

## 4. PR 流程与 Code Review
1. 至少 1 个 Reviewer (核心逻辑需 2)。
2. **Checklist**：
   - [ ] 单元测试通过
   - [ ] 覆盖率不下降
   - [ ] 文档已更新
   - [ ] 无敏感信息泄漏
3. Merge 采用 **Squash**，保持历史清晰。

## 5. 依赖管理与版本策略
- 使用 **pnpm workspaces**，锁文件集中 (`pnpm-lock.yaml`)。
- 每次新增依赖必须：
  1. 比对 bundle 大小变化 (`pnpm exec size-limit`).
  2. 更新 `docs/DEPENDENCY_LOG.md`。
- 版本策略：SemVer，自动 Dependabot。

## 6. 文档规范
- 所有文档置于 `docs/` 并使用 **中文**，标题使用 H1。
- 文件命名 `kebab-case`。
- 重大变更添加 `CHANGELOG.md` 条目。

## 7. CI/CD 流程准则
- **CI**：
  1. `lint → type-check → test → build` 四阶段并行矩阵 (linux/windows)。
  2. 缓存 pnpm/pytest 层级。
- **CD**：
  - Dev 环境：推送 `main` 自动部署到 `dev.zk-agent.local`。
  - Staging/Prod：通过 GitHub Environment 审批。

## 8. 安全、合规与开源策略
- 依赖许可证扫描 (Snyk)。
- Secrets 检测 (gitleaks)。
- 第三方代码需符合 Apache-2.0 / MIT。

---

> 本文为唯一官方开发规范。若需修改，请在 PR 中 @Architecture Board 并通过评审后合并。