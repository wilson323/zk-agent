# 🎨 开发者A专属提示词：多智能体平台前端UI大师

## 🚨 核心开发铁律（必须严格遵守）

### 🔥 基于现有代码优化的绝对原则
> **关键要求：尽可能基于现有代码进行优化调整，确保没有代码冗余，是在本系统上优化而不是新建一个系统**

#### 📁 必须基于的现有文件清单：
```typescript
const EXISTING_FILES_TO_ENHANCE = {
  // 🔥 核心UI组件（必须扩展，绝不重写）
  'components/agui/CADAnalyzerContainer.tsx': '969行 - 主要CAD分析器UI',
  'components/ui/button.tsx': '基础按钮组件 - 需添加智能体主题',
  'components/ui/card.tsx': '卡片组件 - 需添加多断点适配',
  'components/ui/badge.tsx': '徽章组件 - 需移动端优化',
  'components/ui/progress.tsx': '进度条 - 需3D可视化增强',
  
  // 🎯 状态管理（必须复用）
  'lib/stores/agent-store.ts': '453行 - 智能体状态管理 - 前端使用',
  'hooks/use-toast.ts': '现有toast hook - 需智能体个性化',
  
  // 🌟 页面文件（必须增强）
  'app/page.tsx': '主页面 - 需宇宙级设计改造',
  'app/(user)/chat/page.tsx': '对话页面 - 需智能体切换器',
  'app/(user)/cad-analyzer/page.tsx': 'CAD页面 - 需灵魂设计',
  
  // 🎨 样式文件（必须基于扩展）
  'styles/globals.css': '全局样式 - 需智能体主题色彩',
  'tailwind.config.ts': 'Tailwind配置 - 需10断点系统',
};
```

#### 实施要求：
1. **扩展现有组件，绝不重复造轮子** - 在969行的`CADAnalyzerContainer.tsx`基础上增强，不创建新的分析器
2. **复用现有hooks和状态** - 利用已有的`useAgentStore`、`useToast`等，现有store已有完整的智能体管理功能
3. **保持现有API接口** - 现有的props和状态管理必须完全兼容
4. **渐进式增强** - 新功能必须可以独立开关，不影响现有功能
5. **代码去重合并** - 发现重复代码立即合并优化

#### 🔍 代码审查检查清单：
- [ ] 是否基于现有组件进行扩展？
- [ ] 是否复用了现有的工具函数？
- [ ] 是否保持了接口向后兼容？
- [ ] 是否避免了功能重复实现？
- [ ] 是否遵循了现有的命名规范？

## 🌟 多智能体平台灵魂设计理念

### 🎯 设计哲学：直击人类灵魂的体验
这不是一个单一的AI工具，而是一个**多智能体宇宙**！每个智能体都有独特的人格和专业能力：

- **💬 对话智能体** - 温暖的绿色光晕，像朋友一样聊天
- **📐 CAD解读智能体** - 蓝色科技感，精密工程的化身  
- **🎨 海报设计智能体** - 紫色创意光环，艺术大师的灵感

### 🎨 视觉设计核心（主题色：绿色 #6cb33f）
```typescript
// 基于现有Tailwind配置扩展，不替换
// 在 tailwind.config.ts 中增强
export default {
  // 保持现有配置不变
  ...existingConfig,
  
  theme: {
    extend: {
      // 保持现有主题，添加智能体色彩系统
      colors: {
        // 保持现有所有颜色
        ...existingColors,
        
        // 新增：智能体专属色彩（不替换现有）
        'agent-fastgpt': '#6cb33f',
        'agent-cad': '#3b82f6',
        'agent-poster': '#8b5cf6',
        
        // 新增：宇宙背景色谱
        'universe-bg': '#0f172a',
        'universe-stars': '#f8fafc',
        'universe-nebula': 'rgba(108, 179, 63, 0.1)',
      },
      
      // 新增：10断点响应式系统（扩展现有）
      screens: {
        // 保持现有断点
        ...existingScreens,
        
        // 新增断点（精确覆盖所有设备）
        'xs': '320px',    // iPhone SE
        '3xl': '1440px',  // 大屏笔记本
        '4xl': '1920px',  // 全高清显示器
        '5xl': '2560px',  // 2K显示器
        '6xl': '3840px',  // 4K显示器
      },
      
      // 新增：智能体个性化动画
      animation: {
        'agent-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'universe-float': 'float 6s ease-in-out infinite',
        'soul-glow': 'glow 3s ease-in-out infinite alternate',
      },
      
      // 新增：智能体特效
      boxShadow: {
        'agent-glow': '0 0 30px rgba(108, 179, 63, 0.4)',
        'cad-glow': '0 0 30px rgba(59, 130, 246, 0.4)',
        'poster-glow': '0 0 30px rgba(139, 92, 246, 0.4)',
      }
    }
  }
};
```

### 🌌 欢迎页面：智能体宇宙展示
**文件基础**: 基于现有的`app/page.tsx`进行增强
```typescript
// ✅ 正确做法：扩展现有主页面（保持原有所有功能）
'use client';

import { useState, useEffect } from 'react';
// 复用现有的所有imports
import { useAgentStore } from '@/lib/stores/agent-store'; // 使用现有的453行store
import { useToast } from '@/hooks/use-toast'; // 复用现有toast
// ... 保持所有现有imports不变

// 新增：宇宙效果组件（不影响现有功能）
import { UniverseBackground } from '@/components/effects/universe-background';
import { AgentUniverseShowcase } from '@/components/effects/agent-universe-showcase';

export default function HomePage() {
  // 保持所有现有状态和逻辑完全不变
  const { agents, currentAgent, setCurrentAgent } = useAgentStore();
  const { toast } = useToast();
  
  // 新增：宇宙动画状态（可选功能，不影响现有）
  const [enableSoulfulDesign, setEnableSoulfulDesign] = useState(false);
  const [universeAnimation, setUniverseAnimation] = useState({
    particleCount: 100,
    agentPulse: true,
    interactionMode: 'auto'
  });

  // 保持所有现有的useEffect和逻辑不变
  useEffect(() => {
    // 现有的页面初始化逻辑...
  }, []);

  // 新增：灵魂设计切换（可选功能）
  const toggleSoulfulDesign = () => {
    setEnableSoulfulDesign(!enableSoulfulDesign);
    toast({
      title: enableSoulfulDesign ? "切换到标准模式" : "开启灵魂设计模式",
      description: "多智能体宇宙体验"
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 新增：宇宙背景效果（可选，叠加层） */}
      {enableSoulfulDesign && <UniverseBackground />}
      
      {/* 保持现有的所有页面内容完全不变 */}
      <div className={cn("relative z-10", enableSoulfulDesign && "bg-transparent")}>
        {/* 现有的Header组件保持不变 */}
        <Header />
        
        {/* 现有的主要内容区域保持不变 */}
        <main className="container mx-auto px-4 py-8">
          {/* 保持现有的所有sections不变 */}
          
          {/* 新增：智能体宇宙展示（如果启用） */}
          {enableSoulfulDesign ? (
            <AgentUniverseShowcase 
              agents={agents}
              currentAgent={currentAgent}
              onAgentSelect={setCurrentAgent}
            />
          ) : (
            // 保持现有的智能体展示区域不变
            <ExistingAgentSection />
          )}
          
          {/* 保持所有其他现有sections不变 */}
        </main>
        
        {/* 保持现有的Footer不变 */}
        <Footer />
      </div>
      
      {/* 新增：灵魂设计切换按钮（不影响现有布局） */}
      <button
        onClick={toggleSoulfulDesign}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-green-500 text-white shadow-lg hover:shadow-green-500/25 transition-all"
        title="切换灵魂设计模式"
      >
        ✨
      </button>
    </div>
  );
}

// ❌ 错误做法：绝对不要重写主页面
// const NewHomePage = () => {} // 这违反了基于现有代码优化的原则！
```

## 📱 响应式设计：10断点完美适配

### 断点体系：覆盖所有设备
```typescript
// 基于现有的Tailwind配置扩展（在tailwind.config.ts中）
const ENHANCED_BREAKPOINTS = {
  // 移动设备
  xs: '320px',    // iPhone SE - 紧凑型手机
  sm: '375px',    // iPhone 12/13 - 标准手机（保持现有）
  md: '414px',    // iPhone 12 Pro Max - 大屏手机
  
  // 平板设备  
  lg: '768px',    // iPad 竖屏 - 平板竖屏（保持现有）
  xl: '1024px',   // iPad Pro - 平板横屏（保持现有）
  
  // 桌面设备
  '2xl': '1280px', // 13寸笔记本 - 标准桌面（保持现有）
  '3xl': '1440px', // 15寸笔记本 - 大屏桌面
  '4xl': '1920px', // 24寸显示器 - 全高清
  '5xl': '2560px', // 27寸显示器 - 2K
  '6xl': '3840px', // 32寸显示器 - 4K/8K
} as const;
```

### 🎯 你的核心任务矩阵

#### P0 任务：响应式基础设施（第1周）
```typescript
// 1. 增强现有的UI组件（不重写）
// 文件：components/ui/button.tsx（已存在，需增强）

// ✅ 正确做法：扩展现有Button组件
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  // 保持现有基础样式完全不变
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      // 保持所有现有variants完全不变
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
      
      // 新增：智能体主题variant（不影响现有）
      agentTheme: {
        none: '', // 默认，保持现有样式
        fastgpt: cn(
          'bg-gradient-to-r from-green-500 to-blue-500',
          'hover:from-green-600 hover:to-blue-600',
          'shadow-lg shadow-green-500/25',
          'text-white font-medium'
        ),
        cad: cn(
          'bg-gradient-to-r from-blue-500 to-indigo-600',
          'hover:from-blue-600 hover:to-indigo-700',
          'shadow-lg shadow-blue-500/25',
          'text-white font-medium'
        ),
        poster: cn(
          'bg-gradient-to-r from-purple-500 to-pink-600',
          'hover:from-purple-600 hover:to-pink-700',
          'shadow-lg shadow-purple-500/25',
          'text-white font-medium'
        ),
      },
      
      // 新增：触摸优化（基于现有size系统）
      touchOptimized: {
        false: '',
        true: cn(
          'min-h-[44px] min-w-[44px]', // 苹果HIG标准
          'touch-manipulation', // 优化触摸体验
          'select-none' // 防止文本选择
        )
      },
      
      // 新增：响应式尺寸（基于现有断点）
      responsive: {
        false: '',
        true: cn(
          'xs:text-xs xs:px-2 xs:py-1', // 极小屏幕
          'sm:text-sm sm:px-3 sm:py-2', // 标准手机
          'md:text-sm md:px-4 md:py-2', // 大屏手机
          'lg:text-base lg:px-6 lg:py-3', // 平板
          'xl:text-base xl:px-8 xl:py-3', // 大平板/小桌面
          '2xl:text-lg 2xl:px-10 2xl:py-4' // 桌面及以上
        )
      }
    },
    
    // 复合variants：智能响应式组合
    compoundVariants: [
      {
        touchOptimized: true,
        size: 'sm',
        class: 'h-11 px-4 py-3' // 移动端放大小按钮
      },
      {
        agentTheme: 'fastgpt',
        touchOptimized: true,
        class: 'shadow-lg shadow-green-500/40 active:shadow-green-500/60'
      },
      {
        agentTheme: 'cad',
        touchOptimized: true,
        class: 'shadow-lg shadow-blue-500/40 active:shadow-blue-500/60'
      },
      {
        agentTheme: 'poster',
        touchOptimized: true,
        class: 'shadow-lg shadow-purple-500/40 active:shadow-purple-500/60'
      }
    ],
    
    defaultVariants: {
      variant: "default",
      size: "default",
      agentTheme: "none",
      touchOptimized: false,
      responsive: false
    },
  }
);

// 扩展Props接口（保持现有接口兼容）
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  // 新增：智能体相关props（可选）
  agentId?: string;
  enableSoulfulDesign?: boolean;
}

// 增强Button组件（保持现有逻辑完全不变）
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    agentTheme = 'none',
    touchOptimized = false,
    responsive = false,
    agentId,
    enableSoulfulDesign = false,
    asChild = false, 
    ...props 
  }, ref) => {
    // 新增：触摸设备检测
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    
    useEffect(() => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);
    
    // 智能触摸优化：自动启用触摸优化
    const shouldOptimizeForTouch = touchOptimized || isTouchDevice;
    
    // 灵魂设计模式：自动应用智能体主题
    const effectiveAgentTheme = enableSoulfulDesign && agentId 
      ? getAgentTheme(agentId) 
      : agentTheme;
    
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(
          buttonVariants({ 
            variant, 
            size, 
            agentTheme: effectiveAgentTheme,
            touchOptimized: shouldOptimizeForTouch,
            responsive,
            className 
          })
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };

// 新增：智能体主题映射（不影响现有功能）
function getAgentTheme(agentId: string): 'fastgpt' | 'cad' | 'poster' | 'none' {
  if (agentId.includes('fastgpt') || agentId.includes('conversation')) return 'fastgpt';
  if (agentId.includes('cad') || agentId.includes('analysis')) return 'cad';
  if (agentId.includes('poster') || agentId.includes('design')) return 'poster';
  return 'none';
}

// ❌ 错误做法：绝对不要重写Button组件
// const NewSoulfulButton = () => {} // 这违反了基于现有组件扩展的原则！
```

#### P1 任务：智能体个性化UI（第2周）
```typescript
// 2. 智能体卡片组件（基于现有card组件增强）
// 文件：components/agents/agent-card.tsx（新建，但基于现有Card组件）

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgentStore } from "@/lib/stores/agent-store"; // 复用现有store
import { useResponsive } from "@/hooks/use-responsive"; // 新增但基于现有模式

interface AgentCardProps {
  agent: Agent; // 使用现有的Agent类型（由开发者B定义）
  onSelect: (agent: Agent) => void;
  variant?: 'compact' | 'detailed' | 'hero';
  showPersonality?: boolean; // 新增：显示个性化元素
  enableSoulfulDesign?: boolean; // 新增：灵魂设计模式
}

export const AgentCard = ({ 
  agent, 
  onSelect,
  variant = 'compact', 
  showPersonality = true,
  enableSoulfulDesign = false 
}: AgentCardProps) => {
  const { touchOptimized, currentBreakpoint } = useResponsive();
  const { currentAgent } = useAgentStore(); // 复用现有store
  
  // 根据智能体类型获取个性化配置
  const agentPersonality = getAgentPersonality(agent.type);
  const isSelected = currentAgent?.id === agent.id;
  
  return (
    <motion.div
      className={cn(
        "cursor-pointer transition-all duration-300 transform-gpu",
        // 触摸优化
        touchOptimized && "min-h-[88px] active:scale-95",
        // 响应式尺寸
        {
          'w-full': currentBreakpoint === 'xs',
          'w-80': currentBreakpoint >= 'sm',
          'w-96': currentBreakpoint >= 'lg'
        }
      )}
      whileHover={{ 
        scale: touchOptimized ? 1.02 : 1.05,
        y: -4,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(agent)}
    >
      {/* 基于现有Card组件构建 */}
      <Card 
        className={cn(
          "relative overflow-hidden border-2 transition-all duration-300",
          // 选中状态
          isSelected && "ring-2 ring-primary",
          // 智能体个性化样式（如果启用）
          enableSoulfulDesign && showPersonality && [
            "backdrop-blur-sm bg-white/80 dark:bg-gray-900/80",
            `border-${agentPersonality.color}-200 dark:border-${agentPersonality.color}-800`,
            `hover:border-${agentPersonality.color}-300 dark:hover:border-${agentPersonality.color}-700`,
          ]
        )}
        style={enableSoulfulDesign && showPersonality ? {
          // 智能体专属光晕效果
          boxShadow: `0 4px 20px ${agentPersonality.glowColor}`,
          background: `linear-gradient(135deg, ${agentPersonality.lightBg} 0%, transparent 100%)`,
        } : undefined}
      >
        {/* 智能体个性化背景纹理（如果启用） */}
        {enableSoulfulDesign && showPersonality && (
          <div 
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: agentPersonality.pattern,
              backgroundSize: '100px 100px'
            }}
          />
        )}
        
        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center gap-4">
            {/* 智能体头像/图标 */}
            <div className="relative">
              <div 
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold",
                  "bg-gradient-to-br shadow-lg",
                  // 响应式尺寸
                  currentBreakpoint <= 'sm' && "w-10 h-10 text-xl",
                  currentBreakpoint >= 'lg' && "w-14 h-14 text-3xl"
                )}
                style={enableSoulfulDesign ? {
                  background: agentPersonality.gradient,
                  boxShadow: `0 4px 12px ${agentPersonality.glowColor}`
                } : {
                  background: 'linear-gradient(to bottom right, #6cb33f, #4a90e2)'
                }}
              >
                {agent.avatarUrl ? (
                  <img 
                    src={agent.avatarUrl} 
                    alt={agent.name} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <span className="text-white">{agentPersonality.icon}</span>
                )}
              </div>
              
              {/* 状态指示器 */}
              <div className={cn(
                "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                agent.status === 'active' ? "bg-green-500 animate-pulse" : "bg-gray-400",
                currentBreakpoint <= 'sm' && "w-3 h-3"
              )} />
              
              {/* 智能体思考气泡（如果启用灵魂设计） */}
              {enableSoulfulDesign && agent.status === 'active' && (
                <motion.div
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg text-xs"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  {agentPersonality.mood === 'analyzing' ? '🧠' : 
                   agentPersonality.mood === 'completed' ? '✅' :
                   agentPersonality.mood === 'error' ? '❌' : '🤔'}
                </motion.div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <CardTitle className={cn(
                "truncate",
                currentBreakpoint <= 'sm' && "text-base",
                currentBreakpoint >= 'lg' && "text-xl"
              )}>
                {agent.name}
              </CardTitle>
              <CardDescription className={cn(
                "line-clamp-2",
                currentBreakpoint <= 'sm' && "text-xs",
                currentBreakpoint >= 'lg' && "text-sm"
              )}>
                {agent.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* 智能体能力标签 */}
          <div className="flex flex-wrap gap-1 mb-3">
            {agent.capabilities?.slice(0, variant === 'compact' ? 2 : 4).map(cap => (
              <Badge 
                key={cap.name} 
                variant="secondary" 
                className={cn(
                  "text-xs",
                  currentBreakpoint <= 'sm' && "text-[10px] px-1 py-0",
                  enableSoulfulDesign && `bg-${agentPersonality.color}-50 text-${agentPersonality.color}-700`
                )}
              >
                {cap.name}
              </Badge>
            ))}
          </div>
          
          {/* 选择按钮 */}
          <Button
            size={currentBreakpoint <= 'sm' ? 'sm' : 'default'}
            className="w-full"
            variant={isSelected ? 'default' : 'outline'}
            agentTheme={enableSoulfulDesign ? agentPersonality.theme : 'none'}
            touchOptimized={touchOptimized}
            enableSoulfulDesign={enableSoulfulDesign}
          >
            {isSelected ? '当前选择' : '选择智能体'}
          </Button>
          
          {/* 详细模式下的额外信息 */}
          {variant === 'detailed' && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>成功率: {agent.metrics?.successRate || 95}%</span>
                <span>响应: {agent.metrics?.avgResponseTime || 1.2}s</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// 新增：智能体个性化配置（基于设计系统）
function getAgentPersonality(agentType: string) {
  const personalities = {
    fastgpt: {
      color: 'green',
      icon: '💬',
      theme: 'fastgpt' as const,
      gradient: 'linear-gradient(135deg, #6cb33f 0%, #4a90e2 100%)',
      glowColor: 'rgba(108, 179, 63, 0.25)',
      lightBg: 'rgba(108, 179, 63, 0.05)',
      pattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236cb33f' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
    },
    cad: {
      color: 'blue',
      icon: '📐',
      theme: 'cad' as const,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      glowColor: 'rgba(59, 130, 246, 0.25)',
      lightBg: 'rgba(59, 130, 246, 0.05)',
      pattern: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233b82f6' fill-opacity='0.1'%3E%3Cpath d='M20 20h20v20H20zM0 0h20v20H0z'/%3E%3C/g%3E%3C/svg%3E")`
    },
    poster: {
      color: 'purple',
      icon: '🎨',
      theme: 'poster' as const,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      glowColor: 'rgba(139, 92, 246, 0.25)',
      lightBg: 'rgba(139, 92, 246, 0.05)',
      pattern: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%238b5cf6' fill-opacity='0.1'%3E%3Cpolygon points='30,15 45,30 30,45 15,30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
    }
  };
  
  return personalities[agentType as keyof typeof personalities] || personalities.fastgpt;
}

// ❌ 错误做法：绝对不要从零创建卡片组件
// const SoulfulAgentCard = () => {} // 这违反了基于现有Card组件扩展的原则！
```

#### P2 任务：CAD分析器UI增强（第3周）
**文件基础**: `components/agui/CADAnalyzerContainer.tsx`（969行，必须基于此增强）

```typescript
// ✅ 正确做法：扩展现有CADAnalyzerContainer（保持所有现有功能）
// 文件：components/agui/CADAnalyzerContainer.tsx

// 保持所有现有imports完全不变
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ... 保持所有现有imports

// 新增imports（不删除任何现有import）
import { UniverseBackground } from '@/components/effects/universe-background';
import { useResponsive } from '@/hooks/use-responsive';

// 扩展现有Props接口（保持所有现有props）
export interface CADAnalyzerContainerProps {
  // 保持所有现有props完全不变
  agent: Agent;
  className?: string;
  onAnalysisComplete?: (result: AnalysisResultType) => void;
  enableRealTimeCollab?: boolean;
  enableAdvancedExport?: boolean;
  enableAIInsights?: boolean;
  enableManufacturingAnalysis?: boolean;
  enableCostEstimation?: boolean;
  
  // 新增：UI增强选项（向后兼容，默认关闭）
  enableSoulfulDesign?: boolean; // 是否启用灵魂设计
  enableAgentPersonality?: boolean; // 智能体个性化
  uiTheme?: 'standard' | 'soulful' | 'professional'; // UI主题
  showAgentMood?: boolean; // 显示智能体情绪
}

export function CADAnalyzerContainer({
  // 保持所有现有参数完全不变，使用相同的默认值
  agent,
  className = "",
  onAnalysisComplete,
  enableRealTimeCollab = true,
  enableAdvancedExport = true,
  enableAIInsights = true,
  enableManufacturingAnalysis = true,
  enableCostEstimation = true,
  
  // 新增参数：默认关闭，确保向后兼容
  enableSoulfulDesign = false,
  enableAgentPersonality = false,
  uiTheme = 'standard',
  showAgentMood = false
}: CADAnalyzerContainerProps) {
  
  // 保持所有现有状态完全不变
  const { agents } = useAgentStore();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [cadResult, setCadResult] = useState<AnalysisResultType | null>(null);
  const [userSupplement, setUserSupplement] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisStages, setAnalysisStages] = useState<CADAnalysisStage[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultType | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState<any[]>([]);
  const [manufacturingAnalysis, setManufacturingAnalysis] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [costEstimate, setCostEstimate] = useState<any>(null);
  
  // 新增：UI增强状态（不影响现有功能）
  const [agentMood, setAgentMood] = useState<'focused' | 'analyzing' | 'completed' | 'error'>('focused');
  const [interactionFeedback, setInteractionFeedback] = useState<string[]>([]);
  const [soulfulAnimations, setSoulfulAnimations] = useState(enableSoulfulDesign);
  
  const { touchOptimized, currentBreakpoint } = useResponsive();
  
  // 保持所有现有的useCallback和useEffect完全不变
  const initializeAnalysisStages = useCallback((fileType: string): CADAnalysisStage[] => {
    // 保持现有逻辑完全不变
    const stages: CADAnalysisStage[] = [
      {
        id: "file-upload",
        name: "文件上传",
        description: "上传并验证CAD文件格式",
        status: 'pending',
        progress: 0
      },
      // ... 保持现有的所有stages定义不变
    ];
    
    return stages;
  }, [enableAIInsights, enableManufacturingAnalysis, enableCostEstimation]);
  
  // 保持所有现有的处理函数完全不变
  const handleFileUpload = useCallback(async (file: File) => {
    // 保持现有逻辑完全不变...
    
    // 新增：智能体情绪反应（如果启用）
    if (enableAgentPersonality) {
      setAgentMood('analyzing');
      setInteractionFeedback(['正在解析文件格式...', '初始化分析引擎...']);
    }
    
    // 继续执行现有的上传逻辑...
  }, [/* 保持现有依赖 */]);
  
  // 扩展现有的renderProgress函数（保持原有功能，添加增强选项）
  const renderProgress = useCallback(() => {
    // 保持现有的进度显示逻辑完全不变
    const existingProgressContent = (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#6cb33f]" />
          <span className="text-sm font-medium">{progressStage}</span>
        </div>
        
        <div className="space-y-2">
          {analysisStages.map((stage, index) => {
            const isActive = currentStage === index;
            const isCompleted = stage.status === 'completed';
            const isFailed = stage.status === 'failed';
            
            return (
              <div key={stage.id} className="flex items-center space-x-3">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  isCompleted ? "bg-green-500 text-white" :
                  isFailed ? "bg-red-500 text-white" :
                  isActive ? "bg-[#6cb33f] text-white" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {isCompleted ? <CheckCircle className="w-3 h-3" /> :
                   isFailed ? <AlertTriangle className="w-3 h-3" /> :
                   index + 1}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm font-medium",
                      isCompleted ? "text-green-600" :
                      isFailed ? "text-red-600" :
                      isActive ? "text-[#6cb33f]" :
                      "text-gray-500"
                    )}>
                      {stage.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {stage.progress}%
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {stage.description}
                  </p>
                  
                  {(isActive || isCompleted) && (
                    <Progress 
                      value={stage.progress} 
                      className="h-1 mt-2"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
    
    // 如果启用灵魂设计，在现有内容基础上添加增强效果
    if (enableSoulfulDesign && uiTheme === 'soulful') {
      return (
        <div className="space-y-6">
          {/* 保持现有内容完全不变 */}
          {existingProgressContent}
          
          {/* 新增：灵魂化进度效果（叠加层，不替换现有） */}
          <motion.div 
            className="relative mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <div className="relative">
                {/* 3D智能体头像 */}
                <motion.div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl relative overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)' 
                  }}
                  animate={{ 
                    boxShadow: [
                      '0 8px 25px rgba(59, 130, 246, 0.4)',
                      '0 8px 35px rgba(59, 130, 246, 0.6)',
                      '0 8px 25px rgba(59, 130, 246, 0.4)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  📐
                  
                  {/* 粒子效果背景 */}
                  <div className="absolute inset-0 opacity-20">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
                
                {/* 思考气泡 */}
                <motion.div
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  {agentMood === 'analyzing' ? '🧠' : 
                   agentMood === 'completed' ? '✅' :
                   agentMood === 'error' ? '❌' : '🤔'}
                </motion.div>
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-blue-800 mb-1">
                  {showAgentMood && agentMood === 'analyzing' && 'CAD专家正在深度分析中...'}
                  {showAgentMood && agentMood === 'focused' && 'CAD专家已准备就绪'}
                  {showAgentMood && agentMood === 'completed' && 'CAD专家分析完成！'}
                  {showAgentMood && agentMood === 'error' && 'CAD专家遇到问题'}
                  {!showAgentMood && 'CAD分析进行中...'}
                </h4>
                <p className="text-sm text-blue-600 mb-2">{progressStage}</p>
                
                {/* 实时反馈标签 */}
                {enableAgentPersonality && interactionFeedback.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <AnimatePresence>
                      {interactionFeedback.map((feedback, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs border border-blue-200"
                        >
                          {feedback}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
            
            {/* 智能体分析过程可视化 */}
            {enableAgentPersonality && (
              <motion.div 
                className="mt-4 p-3 bg-white/50 rounded-lg backdrop-blur-sm border border-blue-100"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-xs text-blue-600 mb-2">智能体思考过程：</div>
                <div className="space-y-1">
                  {analysisStages.filter(stage => stage.status === 'completed' || stage.status === 'running').map(stage => (
                    <motion.div
                      key={stage.id}
                      className="flex items-center gap-2 text-xs text-blue-700"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                      <span>{stage.name} - {stage.description}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      );
    }
    
    // 默认返回现有内容（确保向后兼容）
    return existingProgressContent;
  }, [
    // 保持现有依赖
    progressStage, 
    analysisStages, 
    currentStage,
    // 新增依赖
    enableSoulfulDesign,
    uiTheme,
    enableAgentPersonality,
    showAgentMood,
    agentMood,
    interactionFeedback
  ]);
  
  // 保持所有其他现有函数完全不变...
  // renderOverview, renderManufacturingAnalysis, renderAIInsights, etc.
  
  // 扩展现有的主渲染函数（保持所有现有布局）
  return (
    <div className={cn(
      "w-full max-w-6xl mx-auto p-6",
      // 新增：主题化样式（不影响现有布局）
      uiTheme === 'soulful' && "relative overflow-hidden",
      className
    )}>
      
      {/* 新增：灵魂化背景效果（如果启用，作为背景层） */}
      {enableSoulfulDesign && uiTheme === 'soulful' && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              background: 'radial-gradient(circle at 30% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
            }}
          />
          {/* 微妙的粒子效果 */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-20"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -100, 0],
                  opacity: [0, 0.3, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 保持现有的头部布局完全不变 */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={cn(
              "w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white",
              // 响应式调整
              currentBreakpoint <= 'sm' && "w-10 h-10",
              currentBreakpoint >= 'lg' && "w-14 h-14"
            )}>
              <Cube className={cn(
                "w-6 h-6",
                currentBreakpoint <= 'sm' && "w-5 h-5",
                currentBreakpoint >= 'lg' && "w-7 h-7"
              )} />
            </div>
            <div>
              <h2 className={cn(
                "text-2xl font-bold text-gray-900",
                currentBreakpoint <= 'sm' && "text-xl",
                currentBreakpoint >= 'lg' && "text-3xl"
              )}>
                {agent.name}
              </h2>
              <p className={cn(
                "text-gray-600",
                currentBreakpoint <= 'sm' && "text-sm"
              )}>
                {agent.description}
              </p>
            </div>
          </div>
          
          {/* 新增：智能体状态指示器（如果启用个性化） */}
          {enableAgentPersonality && (
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "bg-blue-50 text-blue-700 border-blue-200",
                  currentBreakpoint <= 'sm' && "text-xs px-2 py-1"
                )}
              >
                <motion.div
                  className="w-2 h-2 bg-blue-500 rounded-full mr-2"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
                {agentMood === 'analyzing' ? '深度分析中' :
                 agentMood === 'focused' ? '专注准备中' :
                 agentMood === 'completed' ? '分析完成' :
                 agentMood === 'error' ? '需要协助' : '就绪'}
              </Badge>
              
              {showAgentMood && (
                <motion.div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm",
                    currentBreakpoint <= 'sm' && "w-6 h-6 text-xs"
                  )}
                  style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                >
                  {agentMood === 'analyzing' ? '🔍' :
                   agentMood === 'focused' ? '🎯' :
                   agentMood === 'completed' ? '✅' :
                   agentMood === 'error' ? '⚠️' : '😊'}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* 保持现有的主要内容区域完全不变 */}
        {renderMainContent()}
      </div>
      
      {/* 新增：灵魂设计切换控制（不影响现有布局） */}
      {enableSoulfulDesign && (
        <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSoulfulAnimations(!soulfulAnimations)}
            className="bg-white/80 backdrop-blur-sm"
          >
            {soulfulAnimations ? '🌟' : '⭐'} 灵魂特效
          </Button>
          
          {enableAgentPersonality && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAgentMood(
                agentMood === 'focused' ? 'analyzing' : 
                agentMood === 'analyzing' ? 'completed' : 'focused'
              )}
              className="bg-white/80 backdrop-blur-sm"
            >
              🎭 切换情绪
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ❌ 绝对不要创建：
// const NewCADAnalyzerWithSoulfulDesign = () => {} // 这违反了基于现有代码优化的原则！
```

## 🎯 关键绩效指标（KPI）

### 用户体验指标
- **首屏加载时间** < 1.5秒（所有断点）
- **动画流畅度** ≥ 60FPS（硬件加速）
- **触摸响应** < 100ms延迟
- **跨断点一致性** 100%功能可用

### 技术质量指标
- **代码复用率** ≥ 80%（基于现有代码扩展）
- **TypeScript覆盖** 100%类型安全
- **组件测试覆盖** ≥ 85%
- **无障碍合规** WCAG 2.1 AA级

### 多智能体体验指标
- **智能体切换流畅度** < 300ms
- **个性化展示一致性** 100%
- **跨平台设计统一性** ≥ 95%
- **用户情感共鸣度** ≥ 4.5/5（用户反馈）

## 🚫 严禁行为清单

1. **绝不创建重复组件** - 必须基于现有969行的CADAnalyzerContainer进行扩展
2. **绝不重写现有hooks** - useAgentStore已有完整功能，必须复用
3. **绝不改变现有API** - 现有props接口必须保持兼容
4. **绝不忽略现有样式** - 必须基于现有的Tailwind配置
5. **绝不破坏现有功能** - 新功能必须是向后兼容的增强

## 🤝 与开发者B的协同接口

### 📡 前后端数据接口
```typescript
// 你需要使用开发者B提供的类型和API
interface AgentAPIContract {
  // 智能体数据类型（由开发者B定义和维护）
  Agent: '使用现有的Agent类型定义',
  CADAnalysisResult: '使用扩展后的分析结果类型',
  
  // Store接口（由开发者B增强，你负责使用）
  useAgentStore: {
    agents: 'Agent[]',
    currentAgent: 'Agent | null',
    setCurrentAgent: '(agent: Agent) => void',
    // ... 其他现有方法
    // 新增方法（开发者B负责实现）
    registerAgent: '(agent: Agent, service: AgentService) => void',
    getAgentHealth: '(agentId: string) => ServiceHealth',
  },
  
  // API端点（由开发者B增强，你负责调用）
  '/api/cad/upload': {
    request: 'FormData + 三项目整合参数',
    response: 'CADAnalysisResult + enhancedResults'
  }
};
```

### 📋 协同任务分工
```typescript
const COLLABORATION_TASKS = {
  Week1: {
    你负责: [
      '响应式基础组件增强（Button, Card, Badge）',
      'useResponsive hook开发',
      '10断点系统配置'
    ],
    等待开发者B: [
      'CAD上传API三项目整合参数支持',
      'Agent类型定义扩展',
      '项目A算法集成测试'
    ],
    协同任务: [
      '确认Agent接口定义',
      '测试组件与API的集成'
    ]
  },
  
  Week2: {
    你负责: [
      'AgentCard组件开发（基于现有Card）',
      'AgentSwitcher组件开发',
      '智能体个性化视觉效果'
    ],
    等待开发者B: [
      'Agent Store注册中心功能',
      '智能体服务发现算法',
      '健康检查接口'
    ],
    协同任务: [
      '测试智能体切换流程',
      '验证状态同步机制'
    ]
  },
  
  Week3: {
    你负责: [
      'CADAnalyzerContainer灵魂设计增强',
      '3D进度可视化效果',
      '智能体情绪状态显示'
    ],
    等待开发者B: [
      '三项目算法整合完成',
      'CAD分析增强结果结构',
      '实时分析状态推送'
    ],
    协同任务: [
      '测试增强分析流程',
      '验证新旧功能兼容性'
    ]
  }
};
```

## 🎨 每日自检清单

```markdown
### 今日开发检查 ✅
- [ ] 是否基于现有代码进行扩展？
- [ ] 是否体现了多智能体平台的灵魂？
- [ ] 响应式设计是否覆盖10个断点？
- [ ] 触摸优化是否满足44px标准？
- [ ] 智能体个性化是否打动人心？
- [ ] 代码是否避免了重复实现？
- [ ] 性能是否达到60FPS标准？
- [ ] 无障碍访问是否完整？
- [ ] 与开发者B的接口是否对接正确？
- [ ] 现有功能是否完全兼容？
```

## 📋 详细开发时间线

### 第1周：响应式基础设施 (Day 1-5)
- **Day 1**: 扩展Button组件智能体主题支持
- **Day 2**: 增强Card组件多断点适配  
- **Day 3**: 开发useResponsive hook和触摸检测
- **Day 4**: 配置10断点Tailwind系统
- **Day 5**: 基础组件测试和文档，与开发者B接口对接

### 第2周：智能体个性化UI (Day 6-10)
- **Day 6**: AgentCard组件开发（基于现有Card）
- **Day 7**: AgentSwitcher组件和动画效果
- **Day 8**: 智能体个性化视觉系统
- **Day 9**: 集成useAgentStore状态管理
- **Day 10**: 智能体UI系统整合测试

### 第3周：CAD分析器增强 (Day 11-15)
- **Day 11**: CADAnalyzerContainer灵魂设计选项
- **Day 12**: 3D进度可视化和智能体指导
- **Day 13**: 智能体情绪状态和实时反馈
- **Day 14**: 响应式适配和触摸优化
- **Day 15**: CAD UI增强功能测试

### 第4周：宇宙设计和最终整合 (Day 16-20)
- **Day 16**: 宇宙背景系统开发
- **Day 17**: 智能体宇宙展示组件
- **Day 18**: 主页面宇宙级改造
- **Day 19**: 全平台UI整合和优化
- **Day 20**: 最终测试、性能优化和文档

记住：你不只是在写代码，你在创造一个能够**直击人类灵魂**的多智能体宇宙！每一个像素、每一个动画、每一个交互都要让用户感受到智能体的独特个性和专业能力。

让用户在第一眼看到这个平台时就被震撼到，被感动到，被吸引到！这是一个多智能体的世界，不是一个冷冰冰的工具。 