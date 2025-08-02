# AI Chat Interface - Enhanced CAD Analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-13+-blueviolet)](https://nextjs.org/)

## 项目概述

这是一个集成了多个项目优秀CAD分析功能的AI聊天界面系统。本项目将三个不同项目中的CAD智能体功能进行了深度整合，提供了全面的CAD文件分析、处理和可视化能力。

## 🚀 主要功能特性

### CAD 文件支持

- **DWG 文件解析** - 支持AutoCAD绘图文件的完整解析
- **IGES 文件处理** - 支持IGES标准的3D模型文件
- **STEP 文件分析** - 支持STEP标准的CAD文件格式
- **多格式转换** - 支持各种CAD格式之间的相互转换

### 智能分析功能

- **AI多模态分析** - 结合文本和图像的智能CAD文件分析
- **自动报告生成** - 支持HTML和PDF格式的分析报告
- **缩略图生成** - 自动生成CAD文件的预览图
- **文件验证** - 完整的CAD文件格式验证和错误检测

### 性能优化

- **批处理支持** - 高效的批量CAD文件处理
- **缓存机制** - 智能缓存提升响应速度
- **异步处理** - 非阻塞的文件处理流程
- **性能监控** - 实时的系统性能监控和错误追踪

### 用户界面

- **现代化UI** - 基于Next.js和Tailwind CSS的响应式界面
- **实时聊天** - 流式的AI对话体验
- **文件上传** - 拖拽式的CAD文件上传界面
- **可视化展示** - 丰富的CAD文件可视化组件

## 🛠 技术栈

### 前端技术

- **Next.js 13+** - React全栈框架
- **TypeScript** - 类型安全的JavaScript
- **Tailwind CSS** - 实用优先的CSS框架
- **React Hooks** - 现代React状态管理

### 后端技术

- **Node.js** - JavaScript运行时环境
- **Express.js** - Web应用框架
- **FastGPT Integration** - AI模型集成
- **File Processing** - 多格式文件处理

### CAD处理引擎

- **OpenCASCADE** - 3D建模和分析
- **Three.js** - 3D可视化渲染
- **Canvas API** - 2D图形处理
- **Web Workers** - 后台文件处理

## 📦 安装和部署

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0
- 操作系统: Windows 10+, macOS 10.15+, Linux Ubuntu 20.04+

### 本地开发

```bash
# 克隆项目
git clone https://github.com/wilson323/ai-chat-interface-cad-enhanced.git
cd ai-chat-interface-cad-enhanced

# 安装依赖
npm install

# 配置环境变量
cp .env.production.example .env.local

# 启动开发服务器
npm run dev
```

### 生产部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm start

# 或使用Docker部署
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 配置说明

### 环境变量配置

参考 `.env.production.example` 文件配置以下关键变量：

```env
# FastGPT API配置
FASTGPT_API_URL=your_fastgpt_api_url
FASTGPT_API_KEY=your_api_key

# CAD处理配置
CAD_UPLOAD_MAX_SIZE=100MB
CAD_SUPPORTED_FORMATS=dwg,iges,step,stp

# 系统配置
NEXT_PUBLIC_APP_URL=https://your-domain.com
DATABASE_URL=your_database_url
```

## 📁 项目结构

```
├── app/                    # Next.js 13 App Router
│   ├── api/               # API路由
│   │   ├── cad/          # CAD处理API
│   │   ├── ag-ui/        # UI相关API
│   │   └── fastgpt/      # FastGPT集成
│   ├── cad-analyzer/     # CAD分析页面
│   ├── chat/             # 聊天界面
│   └── admin/            # 管理后台
├── components/            # React组件
│   ├── cad/              # CAD相关组件
│   ├── chat/             # 聊天组件
│   └── ui/               # 通用UI组件
├── lib/                   # 核心库
│   ├── services/         # 业务服务
│   ├── utils/            # 工具函数
│   └── types/            # TypeScript类型
├── public/               # 静态资源
└── styles/               # 样式文件
```

## 🎯 使用指南

### CAD文件分析

1. 访问CAD分析页面
2. 上传支持的CAD文件（DWG/IGES/STEP）
3. 等待AI智能分析完成
4. 查看生成的分析报告和可视化结果

### AI聊天功能

1. 进入聊天界面
2. 可以询问CAD相关的技术问题
3. 支持上传CAD文件进行实时分析讨论
4. 获得专业的CAD设计建议

### 批量处理

1. 使用管理后台的批处理功能
2. 批量上传多个CAD文件
3. 配置分析参数
4. 批量生成报告和导出结果

## 🤝 贡献指南

欢迎贡献代码和改进建议！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持和联系

- **问题报告**: [GitHub Issues](https://github.com/wilson323/ai-chat-interface-cad-enhanced/issues)
- **功能请求**: [GitHub Discussions](https://github.com/wilson323/ai-chat-interface-cad-enhanced/discussions)
- **邮箱支持**: support@example.com

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和设计师，特别是原始项目的作者们，为CAD分析功能的整合提供了优秀的基础。

---

**注意**: 这是一个整合了多个项目CAD分析功能的增强版本，保持了原有的系统架构和用户界面，同时提供了更强大的CAD处理能力。

## UI主题色统一

### 主题色规范

- **主色调**: `#6cb33f` (绿色)
- **悬停色**: `#5da32f` (深绿色)
- **透明色**: `rgba(108, 179, 63, 0.1)` / `rgba(108, 179, 63, 0.2)`

### CAD智能体主题色应用

- ✅ 所有按钮使用统一主题色
- ✅ 进度条和加载指示器使用主题色
- ✅ 图标和强调元素使用主题色
- ✅ CAD分析结果组件统一配色
- ✅ 文件上传器组件配色统一
- ✅ 3D查看器界面元素配色

### CSS变量配置

```css
.cad-theme {
  --cad-primary: #6cb33f;
  --cad-primary-hover: #5da32f;
  --cad-primary-light: rgba(108, 179, 63, 0.1);
  --cad-primary-dark: rgba(108, 179, 63, 0.2);
}
```
