# AI Chat Interface - UI设计系统规范

## 📋 目录
1. [设计理念](#设计理念)
2. [颜色系统](#颜色系统)
3. [字体规范](#字体规范)
4. [间距系统](#间距系统)
5. [组件规范](#组件规范)
6. [动效系统](#动效系统)
7. [响应式设计](#响应式设计)
8. [暗色模式](#暗色模式)
9. [实施指南](#实施指南)

## 🎯 设计理念

本系统采用现代化、专业化的设计理念，致力于为用户提供简洁、高效、愉悦的AI对话体验。

### 核心原则
- **一致性**: 所有界面元素保持视觉和交互的一致性
- **可访问性**: 符合WCAG 2.1 AA标准，支持无障碍访问
- **响应式**: 适配多种设备和屏幕尺寸
- **高效性**: 优化用户操作流程，减少认知负担
- **美观性**: 现代化的视觉设计，提升用户体验

## 🎨 颜色系统

### 主色调 (Primary)
系统主色调采用专业的绿色系，体现AI技术的专业性和可靠性。

```css
/* 主色调 - 绿色系 */
--primary-50: #f0f9f0;
--primary-100: #dcf0dc;
--primary-200: #bae1ba;
--primary-300: #8fc98f;
--primary-400: #6cb33f;  /* 主品牌色 */
--primary-500: #5a9f35;
--primary-600: #4a8729;
--primary-700: #3d6f22;
--primary-800: #325a1e;
--primary-900: #2a4a1b;
--primary-950: #162a0e;
```

### 语义化颜色
```css
/* 成功状态 */
--success: #22c55e;
--success-foreground: #ffffff;

/* 警告状态 */
--warning: #f59e0b;
--warning-foreground: #ffffff;

/* 错误状态 */
--destructive: #ef4444;
--destructive-foreground: #ffffff;

/* 信息状态 */
--info: #3b82f6;
--info-foreground: #ffffff;
```

### 中性色
```css
/* 灰色系 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
--gray-950: #030712;
```

## 📝 字体规范

### 字体家族
```css
/* 系统字体栈 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;

/* 等宽字体（代码显示） */
font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', 
             Consolas, 'Courier New', monospace;
```

### 字体大小和行高
```css
/* 标题层级 */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }   /* 36px / 40px */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; } /* 30px / 36px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }      /* 24px / 32px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }   /* 20px / 28px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }  /* 18px / 28px */

/* 正文层级 */
.text-base { font-size: 1rem; line-height: 1.5rem; }     /* 16px / 24px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }  /* 14px / 20px */
.text-xs { font-size: 0.75rem; line-height: 1rem; }      /* 12px / 16px */
```

### 字重
```css
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

## 📐 间距系统

基于8px网格系统，确保视觉节奏的一致性。

```css
/* 间距标准 */
.space-1 { margin/padding: 0.25rem; }  /* 4px */
.space-2 { margin/padding: 0.5rem; }   /* 8px */
.space-3 { margin/padding: 0.75rem; }  /* 12px */
.space-4 { margin/padding: 1rem; }     /* 16px */
.space-6 { margin/padding: 1.5rem; }   /* 24px */
.space-8 { margin/padding: 2rem; }     /* 32px */
.space-12 { margin/padding: 3rem; }    /* 48px */
.space-16 { margin/padding: 4rem; }    /* 64px */
```

## 🧩 组件规范

### 按钮规范
```css
/* 主要按钮 */
.btn-primary {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
  color: white;
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(108, 179, 63, 0.2);
}

/* 次要按钮 */
.btn-secondary {
  background: transparent;
  color: var(--primary-600);
  border: 1px solid var(--primary-300);
  border-radius: 0.75rem;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}
```

### 卡片规范
```css
.card {
  background: white;
  border-radius: 1rem;
  border: 1px solid var(--gray-200);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(108, 179, 63, 0.1);
  border-color: var(--primary-300);
  transform: translateY(-2px);
}
```

### 输入框规范
```css
.input {
  border: 1px solid var(--gray-300);
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(108, 179, 63, 0.1);
}
```

## ✨ 动效系统

### 基础动效
```css
/* 默认过渡 */
.transition-default {
  transition: all 0.2s ease;
}

/* 慢速过渡 */
.transition-slow {
  transition: all 0.3s ease;
}

/* 快速过渡 */
.transition-fast {
  transition: all 0.15s ease;
}
```

### Framer Motion 预设
```typescript
// 页面进入动画
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

// 卡片悬停动画
export const cardHoverVariants = {
  hover: { 
    scale: 1.02, 
    boxShadow: "0 8px 24px rgba(108, 179, 63, 0.15)" 
  },
  tap: { scale: 0.98 }
};

// 侧边栏滑入动画
export const sidebarVariants = {
  open: { x: 0 },
  closed: { x: -320 }
};
```

### 欢迎页面动效规范
```typescript
// 卡通角色动画
export const avatarAnimation = {
  animate: {
    y: [0, -15, 0],
    rotate: [0, 5, -5, 0],
  },
  transition: {
    repeat: Infinity,
    duration: 4,
    ease: "easeInOut",
  }
};

// 背景粒子动画
export const particleAnimation = {
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

## 📱 响应式设计

### 断点系统
```css
/* 移动设备 */
@media (max-width: 640px) { /* sm */ }

/* 平板设备 */
@media (min-width: 641px) and (max-width: 1024px) { /* md */ }

/* 桌面设备 */
@media (min-width: 1025px) { /* lg */ }

/* 大屏设备 */
@media (min-width: 1280px) { /* xl */ }
```

### 响应式规则
- 移动端：单列布局，全宽组件，底部导航
- 平板端：双列布局，抽屉式侧边栏
- 桌面端：多列布局，固定侧边栏，丰富交互

## 🌙 暗色模式

### 暗色主题色彩
```css
/* 暗色模式变量 */
.dark {
  --background: var(--gray-900);
  --foreground: var(--gray-50);
  --card: var(--gray-800);
  --card-foreground: var(--gray-50);
  --border: var(--gray-700);
  --input: var(--gray-800);
}
```

### 暗色模式实现
```typescript
// 主题切换功能
const toggleTheme = () => {
  const isDark = document.documentElement.classList.contains('dark');
  document.documentElement.classList.toggle('dark', !isDark);
  localStorage.setItem('theme', !isDark ? 'dark' : 'light');
};
```

## 🛠 实施指南

### 开发规范
1. **组件命名**: 使用PascalCase，语义化命名
2. **CSS类名**: 使用Tailwind CSS，遵循原子化设计
3. **动画实现**: 优先使用Framer Motion
4. **状态管理**: 使用React Hook进行状态管理
5. **类型定义**: 严格的TypeScript类型约束

### 质量保证
1. **代码审查**: 所有UI变更需要代码审查
2. **视觉测试**: 使用Storybook进行组件测试
3. **可访问性测试**: 使用axe-core进行自动化测试
4. **性能监控**: 监控动画性能和渲染性能

### 文件组织
```
components/
├── ui/              # 基础UI组件
├── chat/            # 聊天相关组件
├── agui/            # AG-UI协议组件
└── admin/           # 管理界面组件

styles/
├── globals.css      # 全局样式
├── components.css   # 组件样式
└── animations.css   # 动画样式
```

## 📚 参考资源

- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Framer Motion文档](https://www.framer.com/motion/)
- [shadcn/ui组件库](https://ui.shadcn.com/)
- [WCAG 2.1 无障碍指南](https://www.w3.org/WAI/WCAG21/quickref/)

---

**版本**: 1.0.0  
**最后更新**: 2024年12月  
**维护者**: AI Chat Interface开发团队 