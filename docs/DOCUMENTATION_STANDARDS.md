# ZK-Agent 文档规范

版本：v1.0 · 2025-08-01  
维护人：技术写作组

---

## 1. 目录结构
```
docs/
 ├── architecture/     # 架构图、设计说明书
 ├── guides/           # 使用指南 / FAQ
 ├── specs/            # 模块规格说明
 ├── reports/          # 评审 / 性能 / 安全报告
 └── ...
```
> **原则**：同一主题只存在一份权威文档；历史版本移入 `docs/archive/`。

## 2. 命名规则
- 文件：`kebab-case.md`
- 目录：`kebab-case/`
- 图片：同名文件夹 `assets/<doc-name>/overview.png`

## 3. 元数据头 (Front-Matter)
所有正式文档需在头部包含 YAML Front-Matter：
```yaml
---
title: ZK-Agent 架构设计说明书
version: 1.2
lastUpdated: 2025-08-01
owner: @arch-board
---
```

## 4. 版本控制与发布
- **Major** 变更：需提 PR 并走架构评审。
- **Minor**/Patch：直接提交，Reviewer 验证。
- 合并后自动发布至内部 **DocsSite** (mkdocs-material)。

## 5. Markdown 书写约定
- 标题层级：H1 单一、H2 开始分节。
- 代码引用：使用 ```lang code fence，必要时添加行号。
- 表格尽量简洁，可滚动行使用 `<details>` 折叠。
- 图片使用 `.png`，禁止 `.bmp/.jpeg`。

## 6. PlantUML / Mermaid
- 架构图**必须**提供源文件 (`.puml/.mmd`)。
- .svg 渲染结果置于同目录 `diagram.svg`。

## 7. 校对 & 链路检查
- 使用 `markdownlint`、`codespell` 自动检查。
- GitHub Action `docs-ci.yml` 负责链接有效性、拼写。

---

> 本文档为文档规范唯一来源，如需变更请通过 PR 并 @Tech-Writer 组审核。