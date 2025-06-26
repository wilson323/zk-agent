# AI智能体平台 (ai-chat-interface)

> **🚨 重要提醒：所有开发人员必须首先熟读 [PROJECT-DEVELOPMENT-STANDARDS.md](./PROJECT-DEVELOPMENT-STANDARDS.md)，这是本项目的核心开发规范！**

## 🎯 项目概述

本平台整合了三种专业AI智能体，通过统一的界面设计和交互模式，为用户提供无缝的AI服务体验：

- **💬 对话智能体**: 基于FastGPT的智能对话系统，支持多种专业场景
- **📐 CAD分析专家**: 专业的CAD文件解析和安防设备布局分析
- **🎨 海报设计师**: AI驱动的创意海报生成和设计助手

### ✨ 核心特性

- 🎯 **统一入口**: 所有智能体在主页面左侧统一展示，一键切换
- 🎨 **现代UI**: 基于统一设计系统的现代化界面，支持暗色模式
- 📱 **响应式设计**: 完美适配桌面、平板、手机等各种设备
- ⚡ **流畅动效**: 基于Framer Motion的精美动画和过渡效果
- 🔄 **智能路由**: 根据智能体类型自动跳转到对应的专业界面
- 🌙 **主题切换**: 支持明暗主题切换，保护用户视觉体验

## 🎨 UI设计系统

### 设计理念
本系统采用现代化、专业化的设计理念，遵循以下核心原则：

- **一致性**: 所有界面元素保持视觉和交互的一致性
- **专业性**: 体现AI技术的专业性和可靠性
- **易用性**: 优化用户操作流程，减少认知负担
- **美观性**: 现代化的视觉设计，提升用户体验

### 主色调系统
```css
/* 主品牌色 - 专业绿色 */
--primary-400: #6cb33f;  /* 主品牌色 */
--primary-500: #5a9f35;
--primary-600: #4a8729;

/* 应用场景 */
- 智能体图标背景渐变
- 交互按钮主色调
- 悬停状态高亮
- 选中状态指示
```

### 欢迎页面动效设计

#### 🤖 卡通角色动画
- **浮动效果**: 机器人角色上下浮动 (-15px to 0px)
- **摆动动画**: 轻微的左右摆动 (-5° to 5°)
- **周期性**: 4秒循环，营造生动感

#### ✨ 背景粒子系统
- **数量**: 20个动态粒子
- **运动轨迹**: 随机抛物线运动
- **缩放变化**: 1.0 到 1.2 倍缩放
- **颜色**: 主品牌色半透明渐变

#### 🎴 智能体卡片动效
- **进入动画**: 依次淡入，每张卡片延迟0.2秒
- **悬停效果**: 1.05倍缩放 + 绿色阴影
- **点击反馈**: 0.95倍缩放提供触觉反馈

### 组件动画规范

#### 侧边栏动画
```typescript
// 滑入动画
sidebarVariants = {
  open: { x: 0, transition: { type: "spring", damping: 30 } },
  closed: { x: -320, transition: { type: "spring", damping: 30 } }
}
```

#### 卡片悬停动画
```typescript
// 卡片交互动画
cardHoverVariants = {
  hover: { 
    scale: 1.02, 
    boxShadow: "0 8px 24px rgba(108, 179, 63, 0.15)" 
  },
  tap: { scale: 0.98 }
}
```

### 响应式断点
```css
/* 移动设备 */
@media (max-width: 640px) { 
  - 单列布局
  - 全屏智能体卡片
  - 抽屉式侧边栏
}

/* 平板设备 */
@media (min-width: 641px) and (max-width: 1024px) { 
  - 双列卡片布局
  - 可折叠侧边栏
}

/* 桌面设备 */
@media (min-width: 1025px) { 
  - 三列卡片布局
  - 固定侧边栏
  - 丰富悬停交互
}
```

## 🏗️ 系统架构

### 页面布局结构

#### 主页面 (`/`)
```
┌─────────────────────────────────────────────────────────────┐
│               欢迎页面 (Welcome Screen)                      │
├─────────────────────────────────────────────────────────────┤
│  🤖 卡通角色动画 (浮动+摆动)                                 │
│     ✨ 环绕小图标动效 (💬📐🎨)                              │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ 💬 对话助手  │ │ 📐 CAD分析   │ │ 🎨 海报设计 │           │
│  │             │ │             │ │             │           │
│  │ ZKTeco助手  │ │ CAD分析师   │ │ 海报设计师  │           │
│  │ 智能对话    │ │ 图纸解读    │ │ 创意生成    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│           🌟 背景粒子动效 (20个动态粒子)                    │
└─────────────────────────────────────────────────────────────┘
```

#### 聊天界面 (`/chat`)
```
┌─────────────────────────────────────────────────────────────┐
│ [≡] AI智能体平台                              [🌙] [⚙️]     │
├───────────────────────────────────────────────────────────├
│ 左侧边栏(320px)        │          主交互区域                  │
│ ┌─────────────────────┐│ ┌─────────────────────────────────────┐│
│ │ 🌟 AI助手           ││ │         对话界面                    ││
│ │   智能对话平台       ││ │ ┌─────────────────────────────────┐ ││
│ │                     ││ │ │ 📬 开始与 ZKTeco助手 对话       │ ││
│ │ 🤖 智能体            ││ │ │   友好、专业、全面              │ ││
│ │ ┌─💬 ZKTeco助手──┐   ││ │ │                                │ ││
│ │ │ 通用AI助手      │   ││ │ │ [问答] [创意写作] [信息检索]   │ ││
│ │ │ 问答|创意|检索   │   ││ │ └─────────────────────────────────┘ ││
│ │ └─────────────────┘   ││ │                                   ││
│ │ ┌─📐 CAD分析师───┐   ││ │ ┌─────────────────────────────────┐ ││
│ │ │ CAD文件分析     │   ││ │ │ 💬 输入消息...                  │ ││
│ │ │ 图纸|工程|3D    │   ││ │ │                       [发送]   │ ││
│ │ └─────────────────┘   ││ │ └─────────────────────────────────┘ ││
│ │ ┌─🎨 海报设计师──┐   ││ └─────────────────────────────────────┘│
│ │ │ 创意海报生成    │   ││                                       │
│ │ │ 设计|创意|品牌   │   ││                                       │
│ │ └─────────────────┘   ││                                       │
│ │                     ││                                       │
│ │ 💬 最近对话          ││                                       │
│ │ ├ 📝 AI技术讨论      ││                                       │
│ │ ├ 📐 CAD图纸分析     ││                                       │
│ │ └ 🎨 创意海报设计     ││                                       │
│ └─────────────────────┘│                                       │
└───────────────────────┴───────────────────────────────────────┘
```

### 智能体类型映射
```typescript
// 智能体类型定义
type AgentType = 'conversation' | 'cad-analyzer' | 'poster-generator';

// 路由映射
const AGENT_ROUTES = {
  'conversation': '/chat',      // 对话界面
  'cad-analyzer': '/cad-analyzer',   // CAD分析页面  
  'poster-generator': '/poster-generator'  // 海报生成页面
};

// UI样式映射
const AGENT_STYLES = {
  'conversation': 'from-primary-500 to-primary-600',
  'cad-analyzer': 'from-primary-600 to-primary-700', 
  'poster-generator': 'from-primary-400 to-primary-500'
};
```

## 🔧 技术实现

### 前端技术栈
- **框架**: Next.js 15.3.2 + React 18 + TypeScript
- **UI组件**: Radix UI + Tailwind CSS + shadcn/ui
- **动画库**: Framer Motion (页面动效、组件动画)
- **状态管理**: React Hooks + Context API
- **图标系统**: Lucide React (300+ 矢量图标)
- **主题系统**: CSS Variables + Tailwind Dark Mode

### 核心组件架构
```typescript
// 主页面组件
export default function ChatPage() {
  const [currentView, setCurrentView] = useState<"welcome" | "chat" | "cad" | "poster">("welcome");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // 智能体选择处理
  const handleAgentSelect = (agent: Agent) => {
    switch (agent.type) {
      case "conversation":
        setCurrentView("chat");
        break;
      case "cad-analyzer":
        router.push("/cad-analyzer");
        break;
      case "poster-generator":
        router.push("/poster-generator");
        break;
    }
  };
}
```

### 动效实现
```typescript
// 欢迎页面动效
const avatarAnimation = {
  animate: {
    y: [0, -15, 0],           // 上下浮动
    rotate: [0, 5, -5, 0],    // 左右摆动
  },
  transition: {
    repeat: Infinity,
    duration: 4,
    ease: "easeInOut",
  }
};

// 背景粒子动效
const particleAnimation = {
  animate: {
    y: [0, -100, 0],
    x: [0, Math.random() * 100 - 50, 0],
    scale: [1, 1.2, 1],
  },
  transition: {
    repeat: Infinity,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }
};
```

## 📱 智能体功能详解

### 1. 💬 对话智能体 (conversation)
**类型**: ZKTeco助手  
**功能**: 通用AI对话，知识问答，智能助手

**核心特性**:
- 🔄 流式对话体验，实时响应
- 🧠 多轮上下文记忆
- 📎 文件上传支持  
- 📚 对话历史管理
- 🎯 专业领域问答

**交互界面**:
- 左侧: 智能体信息 + 对话历史
- 右侧: 对话窗口 + 消息输入框
- 底部: 文件上传 + 功能按钮

### 2. 📐 CAD分析专家 (cad-analyzer)
**支持格式**: DWG, DXF, PDF, STEP, IGES

**核心功能**:
- 🏗️ **建筑结构识别**: 自动识别墙体、门窗、楼梯等建筑元素
- 📹 **安防设备统计**: 精确统计摄像头、门禁、传感器数量和位置
- 🔌 **线路布局分析**: 分析电气线路、网络布线的合理性
- ⚠️ **风险评估**: 识别安全隐患和布局问题
- 📊 **专业报告**: 生成HTML/PDF格式的详细分析报告

**分析流程**:
```
文件上传 → 格式验证 → AI解析 → 实体识别 → 
设备统计 → 布局分析 → 风险评估 → 报告生成
```

### 3. 🎨 海报设计师 (poster-generator)
**设计风格**: 现代简约、复古风格、创意艺术、商务专业、时尚潮流、极简主义

**核心功能**:
- 🎨 **智能设计**: 基于文本描述自动生成海报
- 📐 **多尺寸支持**: 手机海报(9:16)、横版海报(16:9)、方形海报(1:1)、A4打印
- 🌈 **配色方案**: 6种专业配色主题可选
- 🖼️ **参考上传**: 支持上传参考图片
- ⚡ **实时预览**: 参数调整后即时生成预览
- 💾 **多格式导出**: 支持JPG、PNG、PDF格式下载

**设计流程**:
```
创意描述 → 风格选择 → 尺寸配置 → 配色方案 → 
实时生成 → 预览确认 → 格式导出 → 下载保存
```

## 🚀 快速开始

### 环境要求
```bash
Node.js >= 18.0.0
npm >= 9.0.0 或 yarn >= 1.22.0
```

### 安装步骤

1. **克隆项目**
```bash
git clone [repository-url]
cd ai-chat-interfacebyss
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **环境配置**
```bash
cp .env.production.example .env.local
```

配置必要的环境变量：
```env
# FastGPT API配置
FASTGPT_API_URL=your_fastgpt_api_url
FASTGPT_API_KEY=your_fastgpt_api_key

# CAD分析服务配置  
CAD_ANALYSIS_API_URL=your_cad_api_url

# 海报生成服务配置
POSTER_GENERATION_API_URL=your_poster_api_url
```

4. **启动开发服务器**
```bash
npm run dev
# 或  
yarn dev
```

访问 `http://localhost:3000` 查看应用

5. **生产构建**
```bash
npm run build
npm run start
```

## 📂 项目结构

```
ai-chat-interfacebyss/
├── app/                          # Next.js App Router
│   ├── page.tsx                 # 🏠 主页面 (欢迎界面 + 智能体选择)
│   ├── chat/                    # 💬 对话界面
│   │   └── page.tsx
│   ├── cad-analyzer/            # 📐 CAD分析界面  
│   │   └── [fileId]/page.tsx
│   ├── poster-generator/        # 🎨 海报设计界面
│   │   └── page.tsx
│   ├── api/                     # 🔌 API路由
│   │   ├── fastgpt/            # FastGPT代理
│   │   ├── cad/                # CAD分析API
│   │   └── poster/             # 海报生成API
│   └── globals.css             # 🎨 全局样式
├── components/                   # 🧩 React组件
│   ├── ui/                     # 基础UI组件 (shadcn/ui)
│   ├── chat/                   # 💬 聊天组件
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   └── welcome-screen.tsx
│   ├── agui/                   # 🤖 智能体UI组件  
│   │   ├── CADAnalyzerContainer.tsx
│   │   └── PosterGeneratorContainer.tsx
│   └── admin/                  # ⚙️ 管理界面组件
├── lib/                         # 📚 工具库
│   ├── utils.ts                # 通用工具函数
│   ├── stores/                 # 状态管理
│   ├── types/                  # TypeScript类型定义
│   └── hooks/                  # 自定义Hooks
├── public/                      # 📁 静态资源
│   ├── images/                 # 图片资源
│   └── icons/                  # 图标资源
├── styles/                      # 🎨 样式文件
├── UI-DESIGN-SYSTEM.md         # 🎨 UI设计系统规范
└── README.md                   # 📖 项目文档
```

## 🎨 UI设计规范

详细的UI设计规范请参考: [UI-DESIGN-SYSTEM.md](./UI-DESIGN-SYSTEM.md)

### 核心设计原则
1. **一致性**: 统一的视觉语言和交互模式
2. **专业性**: 体现AI技术的可靠性和先进性  
3. **易用性**: 简化操作流程，降低学习成本
4. **美观性**: 现代化设计，愉悦的用户体验

### 主题色彩规范
- **主品牌色**: `#6cb33f` (专业绿色)
- **辅助色**: 基于主色的渐变色谱
- **语义色**: 成功、警告、错误、信息状态色
- **中性色**: 完整的灰色色阶

### 动效设计规范
- **过渡动画**: 0.2s ease 标准过渡
- **悬停效果**: 1.02倍缩放 + 阴影
- **页面切换**: 淡入淡出 + 位移动画
- **加载状态**: 骨架屏 + 进度指示

## 📋 开发指南

### 代码规范
- **TypeScript**: 严格类型检查，完整类型定义
- **ESLint**: 代码质量检查，统一代码风格
- **Prettier**: 代码格式化，保持一致性
- **组件设计**: 单一职责，高内聚低耦合

### 提交规范
```bash
feat: 新功能
fix: 修复问题
docs: 文档更新
style: 样式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具、依赖更新
```

### 性能优化
- **代码分割**: 按路由自动代码分割
- **图片优化**: Next.js Image组件优化
- **缓存策略**: API响应缓存，静态资源缓存
- **Bundle分析**: 定期分析包大小

## 🚀 部署指南

### 生产环境部署
1. **环境变量配置**
2. **构建优化**
3. **Docker容器化**
4. **反向代理配置**
5. **SSL证书配置**

### 监控与维护
- **性能监控**: Core Web Vitals指标
- **错误追踪**: 异常监控和报告
- **日志管理**: 结构化日志收集
- **备份策略**: 数据备份和恢复

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交变更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- **项目维护**: AI Chat Interface开发团队
- **技术支持**: [技术支持邮箱]
- **功能建议**: [功能建议渠道]

---

**版本**: 2.0.0  
**最后更新**: 2024年12月  
**构建状态**: ✅ 稳定运行 