# Bundle 分析指南

## 概述

本文档提供了如何对 ZK-Agent 项目进行 bundle 分析的指南，帮助开发者优化应用大小和性能。

## 前提条件

- Node.js 18+
- pnpm
- Windows 或 Linux/macOS 环境

## 在 Windows 环境下运行分析

由于 Windows 环境下设置环境变量的方式与 Linux/macOS 不同，我们提供了几种方法来运行 bundle 分析：

### 方法 1: 使用 setup 脚本（推荐）

这个方法会自动安装所需依赖并运行分析：

```bash
pnpm run analyze:setup
```

### 方法 2: 使用批处理脚本

如果已经安装了所需依赖，可以直接运行：

```bash
pnpm run analyze:win
```

### 方法 3: 使用 cross-env

如果已安装 cross-env 依赖，可以运行：

```bash
pnpm run analyze
```

## 在 Linux/macOS 环境下运行分析

在 Linux/macOS 环境下，可以直接运行：

```bash
pnpm run analyze
```

## 分析结果

运行分析后，将在浏览器中自动打开分析结果页面，显示各个 bundle 的大小和组成。

## 常见问题

### 问题：运行 `pnpm run analyze` 时出现 "'ANALYZE' is not recognized as an internal or external command"

**解决方案**：在 Windows 环境下，请使用 `pnpm run analyze:setup` 或 `pnpm run analyze:win` 命令代替。

### 问题：分析结果没有自动在浏览器中打开

**解决方案**：分析结果文件应该生成在 `.next/analyze` 目录下，可以手动打开这些 HTML 文件查看分析结果。

## 优化建议

根据分析结果，可以考虑以下优化措施：

1. 使用动态导入（`import()`）拆分大型组件
2. 优化第三方库的导入方式
3. 移除未使用的依赖
4. 使用代码分割和懒加载
5. 优化图片和静态资源
