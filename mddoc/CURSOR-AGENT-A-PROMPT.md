# 🎨 开发者A专属提示词：多智能体平台前端UI大师

## 🚨 核心开发铁律（必须严格遵守）

### 🔥 基于现有代码优化的绝对原则
> **关键要求：尽可能基于现有代码进行优化调整，确保没有代码冗余，是在本系统上优化而不是新建一个系统**

#### 实施要求：
1. **扩展现有组件，绝不重复造轮子** - 在969行的`CADAnalyzerContainer.tsx`基础上增强，不创建新的分析器
2. **复用现有hooks和utils** - 利用已有的`useToast`、`useAgentStore`等，不重复实现
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
// 核心色彩体系 - 直击灵魂的视觉冲击
const SOUL_COLORS = {
  // 主品牌色 - 生命绿
  primary: '#6cb33f',
  primaryHover: '#5da32f', 
  primaryLight: 'rgba(108, 179, 63, 0.1)',
  primaryGlow: 'rgba(108, 179, 63, 0.3)',
  
  // 智能体专属光谱
  agents: {
    fastgpt: {
      color: '#6cb33f',
      gradient: 'linear-gradient(135deg, #6cb33f 0%, #4a90e2 100%)',
      glow: '0 0 30px rgba(108, 179, 63, 0.4)',
      personality: 'warm-conversational'
    },
    cad: {
      color: '#3b82f6', 
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      glow: '0 0 30px rgba(59, 130, 246, 0.4)',
      personality: 'precision-engineering'
    },
    poster: {
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
      glow: '0 0 30px rgba(139, 92, 246, 0.4)',
      personality: 'creative-artistic'
    }
  },
  
  // 宇宙背景色谱
  universe: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    stars: '#f8fafc',
    nebula: 'radial-gradient(circle, rgba(108, 179, 63, 0.1) 0%, transparent 70%)',
    particles: '#64748b'
  }
};
```

### 🌌 欢迎页面：智能体宇宙展示
**文件基础**: 基于现有的`app/(user)/page.tsx`进行增强
```typescript
// 扩展现有欢迎页面，不重新创建
const EnhancedWelcomePage = () => {
  // 保持现有的所有状态和逻辑
  const { agents } = useAgentStore(); // 复用现有store
  
  // 新增：宇宙动画状态（不影响现有功能）
  const [universeAnimation, setUniverseAnimation] = useState({
    particleCount: 100,
    agentPulse: true,
    interactionMode: 'auto'
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 现有内容保持不变，在此基础上叠加宇宙效果 */}
      
      {/* 新增：多层宇宙背景 */}
      <UniverseBackground />
      
      {/* 新增：3D智能体展示区域 */}
      <div className="relative z-10">
        <AgentUniverseShowcase agents={agents} />
      </div>
      
      {/* 保持现有的其他所有元素... */}
    </div>
  );
};
```

## 📱 响应式设计：10断点完美适配

### 断点体系：覆盖所有设备
```typescript
// 基于现有的breakpoints.ts扩展
const ENHANCED_BREAKPOINTS = {
  // 移动设备
  xs: '320px',    // iPhone SE - 紧凑型手机
  sm: '375px',    // iPhone 12/13 - 标准手机
  md: '414px',    // iPhone 12 Pro Max - 大屏手机
  
  // 平板设备  
  lg: '768px',    // iPad 竖屏 - 平板竖屏
  xl: '1024px',   // iPad Pro - 平板横屏
  
  // 桌面设备
  '2xl': '1280px', // 13寸笔记本 - 标准桌面
  '3xl': '1440px', // 15寸笔记本 - 大屏桌面
  '4xl': '1920px', // 24寸显示器 - 全高清
  '5xl': '2560px', // 27寸显示器 - 2K
  '6xl': '3840px', // 32寸显示器 - 4K/8K
} as const;
```

### 🎯 你的核心任务矩阵

#### P0 任务：响应式基础设施（第1-2周）
```typescript
// 1. 增强现有的useResponsive hook（不重写）
// 文件：hooks/use-responsive.ts（已存在，需增强）
export const useResponsive = () => {
  // 保持现有逻辑，添加新功能
  const [state, setState] = useState(/* 现有状态 */);
  
  // 新增：设备性能检测
  const [performance, setPerformance] = useState({
    level: 'high' as 'low' | 'medium' | 'high',
    memory: navigator.deviceMemory || 4,
    cores: navigator.hardwareConcurrency || 4,
    connection: getConnectionSpeed()
  });
  
  // 新增：触摸优化检测
  const touchOptimized = useMemo(() => 
    isMobile || isTablet || 'ontouchstart' in window
  , [isMobile, isTablet]);
  
  return { ...state, performance, touchOptimized };
};

// 2. 增强现有Button组件（components/ui/button.tsx）
const ButtonVariants = cva(
  // 保持现有基础样式
  "inline-flex items-center justify-center...",
  {
    variants: {
      // 保持现有variants
      variant: { /* 现有的 */ },
      size: { /* 现有的 */ },
      
      // 新增：智能体主题variant
      agentTheme: {
        fastgpt: 'bg-green-500 hover:bg-green-600 shadow-green-500/25',
        cad: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25', 
        poster: 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/25',
        default: '' // 保持现有样式
      },
      
      // 新增：触摸优化
      touchTarget: {
        true: 'min-h-[44px] min-w-[44px]', // 苹果HIG标准
        false: ''
      }
    },
    
    // 复合variants：智能响应式
    compoundVariants: [
      {
        touchTarget: true,
        size: 'sm',
        class: 'h-11 px-4' // 移动端放大
      }
    ]
  }
);
```

#### P1 任务：智能体个性化UI（第3-4周）
```typescript
// 3. 智能体卡片组件（基于现有的card组件增强）
interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  variant?: 'compact' | 'detailed' | 'hero';
  showPersonality?: boolean; // 新增：显示个性化元素
}

const AgentCard = ({ agent, variant = 'compact', showPersonality = true }: AgentCardProps) => {
  const { touchOptimized, currentBreakpoint } = useResponsive();
  
  // 根据智能体类型获取个性化配置
  const agentPersonality = SOUL_COLORS.agents[agent.type as keyof typeof SOUL_COLORS.agents];
  
  return (
    <motion.div
      className={cn(
        // 基础样式（复用现有card样式）
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        // 智能体个性化
        "relative overflow-hidden transition-all duration-300",
        // 触摸优化
        touchOptimized && "min-h-[88px]",
        // 响应式尺寸
        {
          'p-4': currentBreakpoint === 'xs',
          'p-6': currentBreakpoint >= 'lg'
        }
      )}
      style={{
        // 个性化光晕效果
        boxShadow: showPersonality ? agentPersonality.glow : undefined,
        background: showPersonality ? agentPersonality.gradient : undefined
      }}
      whileHover={{ 
        scale: 1.02,
        y: -4,
        boxShadow: agentPersonality.glow 
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* 智能体个性化背景纹理 */}
      {showPersonality && (
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: getAgentPattern(agent.type),
            backgroundSize: '100px 100px'
          }}
        />
      )}
      
      {/* 智能体头像和信息 */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="relative">
          {/* 3D头像效果 */}
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{ background: agentPersonality.gradient }}
          >
            {agent.icon || getAgentIcon(agent.type)}
          </div>
          
          {/* 状态指示器 */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{agent.name}</h3>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
          
          {/* 智能体特性标签 */}
          <div className="flex gap-1 mt-2">
            {agent.capabilities?.map(cap => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
```

#### P2 任务：CAD分析器UI增强（第5-6周）
**文件基础**: `components/agui/CADAnalyzerContainer.tsx`（969行，必须基于此增强）

```typescript
// ✅ 正确做法：扩展现有CADAnalyzerContainer
export function CADAnalyzerContainer({
  // 保持所有现有props
  agent,
  className = "",
  onAnalysisComplete,
  enableRealTimeCollab = true,
  enableAdvancedExport = true,
  enableAIInsights = true,
  enableManufacturingAnalysis = true,
  enableCostEstimation = true,
  
  // 新增：UI增强选项（向后兼容）
  enableSoulfulDesign = false, // 是否启用灵魂设计
  enableAgentPersonality = false, // 智能体个性化
  uiTheme = 'standard' as 'standard' | 'soulful' | 'professional'
}: CADAnalyzerContainerProps) {
  
  // 保持所有现有状态
  const [uploading, setUploading] = useState(false);
  // ... 所有现有状态保持不变
  
  // 新增：UI增强状态（不影响现有功能）
  const [soulfulAnimations, setSoulfulAnimations] = useState(enableSoulfulDesign);
  const [agentMood, setAgentMood] = useState('focused'); // 智能体情绪状态
  const [interactionFeedback, setInteractionFeedback] = useState<string[]>([]);
  
  const { touchOptimized, currentBreakpoint } = useResponsive();
  
  // 扩展现有的renderProgress函数
  const renderProgress = () => {
    // 保持现有的进度显示逻辑
    const existingProgress = (
      <div className="space-y-4">
        {/* 现有的进度条和阶段显示 */}
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">{progressStage}</p>
      </div>
    );
    
    // 如果启用灵魂设计，增强显示效果
    if (enableSoulfulDesign) {
      return (
        <div className="relative">
          {/* 保持现有内容 */}
          {existingProgress}
          
          {/* 新增：灵魂化进度效果 */}
          <div className="mt-6 relative">
            {/* 3D智能体指导 */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
              <div className="relative">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl animate-pulse"
                  style={{ 
                    background: SOUL_COLORS.agents.cad.gradient,
                    boxShadow: SOUL_COLORS.agents.cad.glow 
                  }}
                >
                  📐
                </div>
                
                {/* 思考气泡 */}
                <motion.div
                  className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  🧠
                </motion.div>
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium text-green-800">CAD专家正在分析中...</h4>
                <p className="text-sm text-green-600">{progressStage}</p>
                
                {/* 实时反馈 */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {interactionFeedback.map((feedback, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feedback}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 阶段可视化 */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {analysisStages.map((stage, index) => (
                <motion.div
                  key={stage.id}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-all",
                    stage.status === 'completed' && "bg-green-50 border-green-200",
                    stage.status === 'running' && "bg-blue-50 border-blue-200 animate-pulse",
                    stage.status === 'pending' && "bg-gray-50 border-gray-200"
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="text-lg mb-1">
                    {stage.status === 'completed' && '✅'}
                    {stage.status === 'running' && '⚙️'}
                    {stage.status === 'pending' && '⏳'}
                  </div>
                  <p className="text-xs font-medium">{stage.name}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    return existingProgress;
  };
  
  // 保持现有的所有其他函数不变
  // handleFileUpload, executeAnalysisStages, renderOverview等
  
  // 扩展现有的主渲染函数
  return (
    <div className={cn(
      "w-full max-w-6xl mx-auto p-6",
      // 新增：主题化样式
      uiTheme === 'soulful' && "relative overflow-hidden",
      className
    )}>
      
      {/* 新增：灵魂化背景效果（如果启用） */}
      {enableSoulfulDesign && (
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              background: 'radial-gradient(circle at 30% 50%, rgba(108, 179, 63, 0.1) 0%, transparent 50%)',
            }}
          />
        </div>
      )}
      
      {/* 保持现有的头部完全不变 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
            <Cube className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{agent.name}</h2>
            <p className="text-gray-600">{agent.description}</p>
          </div>
        </div>
        
        {/* 新增：智能体状态指示器（如果启用个性化） */}
        {enableAgentPersonality && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              专注分析中
            </Badge>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: SOUL_COLORS.agents.cad.gradient }}
            >
              😊
            </div>
          </div>
        )}
      </div>

      {/* 保持现有的主要内容区域完全不变 */}
      {renderMainContent()}
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
2. **绝不重写现有hooks** - useToast、useAgentStore等必须复用
3. **绝不改变现有API** - 现有props接口必须保持兼容
4. **绝不忽略现有样式** - 必须基于现有的Tailwind配置
5. **绝不破坏现有功能** - 新功能必须是向后兼容的增强

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
```

记住：你不只是在写代码，你在创造一个能够**直击人类灵魂**的多智能体宇宙！每一个像素、每一个动画、每一个交互都要让用户感受到智能体的独特个性和专业能力。

让用户在第一眼看到这个平台时就被震撼到，被感动到，被吸引到！这是一个多智能体的世界，不是一个冷冰冰的工具。 