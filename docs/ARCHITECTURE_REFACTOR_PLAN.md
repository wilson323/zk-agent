# ZK-Agent 全局架构重构计划

## 版本信息
- 文档版本：v1.0 (2025-08-01)
- 适用项目版本：`main` 分支最新提交
- 负责人：架构委员会 (Architecture Board)

---

## 1. 背景与目标
为了确保 ZK-Agent 平台在生产环境的长期稳定性、可维护性与可拓展性，现决定全面暂停现行开发流程，重新规划整体架构并分阶段实施重构。目标如下：

1. **零异常**：TypeScript / Python / SQL / Docker 等构建与运行时错误为 0。
2. **零冗余**：消除重复代码、文档与脚本，统一规范。
3. **一致性**：前后端、脚本、基础设施遵循统一设计原则。
4. **高质量**：≥95% 自动化测试覆盖率；≥99% 重要路径监控覆盖率。
5. **易扩展**：模块边界清晰，支持插件化与多智能体横向扩展。

---

## 2. 里程碑与阶段划分

| 阶段 | 里程碑 | 主要产出 | 预计时长 |
|------|--------|----------|----------|
| 0    | 立项 & 现状审计 | • 本文档<br>• 架构风险清单 (`ARCHITECTURE_RISK_ALERT.md`)<br>• 复盘报告 | 3 天 |
| 1    | 模块/路由分层 | • `/app` & `/lib` 重构 PR<br>• Module Map (`docs/MODULE_MAP.md`) | 2 周 |
| 2    | 数据访问层统一 | • Prisma Layer 统一 & 数据库脚本剥离<br>• Migration Pipeline | 1 周 |
| 3    | 服务层契约化 | • API 服务抽象 (`lib/api/*`)<br>• DI 重构 & 单元测试 | 1.5 周 |
| 4    | UI & 性能 | • 组件库梳理 & 代码分包<br>• 性能基准 <2s | 1 周 |
| 5    | 监控 & DevOps | • Prometheus + Grafana + Alertmanager<br>• Sentry / OpenTelemetry 集成 | 1 周 |
| 6    | 收尾 & 生产演练 | • 生产演练报告<br>• SLA ≥99.9% | 1 周 |

> **说明**：各阶段可重叠进行，但必须通过上一阶段“架构评审”方可进入下一阶段。

---

## 3. 阶段实施细则

### 3.1 阶段 0 — 立项 & 现状审计
1. **代码审计**：使用 SonarQube + ESLint + Ruff (Python) 生成静态分析报告。
2. **风险清单**：输出 `ARCHITECTURE_RISK_ALERT.md`，列举所有 P0/P1 风险，分配负责人。
3. **回归基线**：`main` 分支打 `baseline-2025-08-01` tag，便于回滚。

### 3.2 阶段 1 — 模块/路由分层
- **目标**：确保 `/app` 仅处理路由 & UI，所有业务逻辑移动至 `/lib/*`；公共组件集中至 `/components`。
- **动作**：
  1. 生成 Module Map（依赖 graphviz）。
  2. 拆分耦合组件，使用 Barrel 导出 (`index.ts`).
  3. 移除重复脚本，合并 `utils/*` into `lib/utils`。
- **注意事项**：保持 API 路径不变或提供中间兼容层。

### 3.3 阶段 2 — 数据访问层统一
- 使用 Prisma ORM，所有 SQL 迁移至 Prisma Schema。
- 引入 `@prisma/extension-tracing`，统一事务与日志。
- 废弃旧的直接 SQL 调用，提供 `DatabaseService` 抽象。 

### 3.4 阶段 3 — 服务层契约化
- 建立 `lib/services`，每个服务暴露接口 (`interface Service { ... }`)。
- 使用 **Dependency Injection** (`tsyringe`) 统一实例化。
- 引入 **OpenAPI** 生成客户端 SDK，提高前后端一致性。

### 3.5 阶段 4 — UI & 性能
- 合并 Shadcn-UI 与 Tailwind 方案，集中样式。
- 动态 Import + Suspense 实现 Bundle Split。
- Lighthouse ≥ 90 分；Largest Contentful Paint < 2s。

### 3.6 阶段 5 — 监控 & DevOps
- **观测**：Prometheus + Grafana Dashboard；OTel Trace 导入 Tempo。
- **告警**：Alertmanager + Slack/Webhook 告警。
- **错误**：Sentry 前端/后端统一；异常中台。
- **CI/CD**：GitHub Actions Matrix (Linux/Windows) + Docker multi-arch。

### 3.7 阶段 6 — 收尾 & 生产演练
- 灾备演练、回滚预案验证。
- 性能压测 (k6) 容量 ≥ 2× 峰值。
- 完成《生产就绪 Checklist》签字。

---

## 4. 架构评审机制
1. **架构委员会 (AB)**：Tech Lead + QA Lead + DevOps Lead + 安全代表。
2. **评审节点**：各阶段结束前召开 1 次 ARB Review，必须：
   - 通过 **设计文档** 检查 (Markdown + PlantUML)。
   - 演示运行 Demo + 测试报告。
   - 通过 2/3 以上成员签字。
3. **追踪工具**：GitHub Projects -> `Architecture Review` Board。
4. **CI Gate**：未通过 ARB 的 PR Blocker (`.github/block-unapproved.yml`)。

---

## 5. 监控与测试策略
- **单元测试**：Jest (TS) / PyTest (Python) -> 95% 覆盖率。
- **集成测试**：Testing-Library + Playwright 全流程。
- **合约测试**：pact-js 验证服务接口。
- **性能测试**：k6、Lighthouse CI。
- **安全扫描**：Snyk + Dependabot + Trivy (容器)。

---

## 6. 开源方案与复用
- UI 组件：shadcn-ui / Chakra-UI (按需)；
- DI：tsyringe；
- Observability：OpenTelemetry, Prometheus, Grafana；
- Auth：next-auth；
- 任务队列：BullMQ；
- Python Service：FastAPI (+ pydantic)；

---

## 7. 注意事项与风险防范
1. **破坏性变更**：任何 Breaking Change 必须提供 Migration Guide。
2. **回滚策略**：使用 Git Tags + Docker Image rollback。
3. **透明沟通**：每日 Stand-up 更新，周度里程碑评审。
4. **知识沉淀**：所有关键决策必须更新到 `/docs/`，避免文档漂移。

---

## 8. 附录
- [x] 附件 A：《ARCHITECTURE_RISK_ALERT.md》
- [x] 附件 B：《MODULE_MAP.md》 (graphviz dot)
- [x] 附件 C：《生产就绪 Checklist》

---

> **最终目标：** 建立可持续演进、质量有保障、可被新团队轻松理解的 AI 多智能体平台，支撑未来规模化扩展与持续创新。