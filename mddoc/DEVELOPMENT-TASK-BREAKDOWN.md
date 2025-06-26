# 开发任务详细分解文档

## 🎯 项目总体目标

构建世界级的AI智能体平台，整合最优秀的CAD分析功能，实现跨平台响应式设计，确保生产级交付标准。

## 🚨 核心开发原则（强制执行）

### 基于现有代码优化的核心原则
> **关键要求：尽可能基于现有代码进行优化调整，确保没有代码冗余，是在本系统上优化而不是新建一个系统**

#### 实施要求：
1. **扩展而非重建** - 在现有组件基础上添加功能，不创建重复组件
2. **继承现有架构** - 遵循现有的文件结构和命名规范
3. **复用现有逻辑** - 优先使用已有的工具函数和服务
4. **保持接口一致** - 新功能要与现有API保持兼容
5. **渐进式增强** - 新功能可以独立开关，不影响现有功能

#### 代码实施检查：
- [ ] **组件扩展**：是否基于现有组件进行功能扩展？
- [ ] **服务复用**：是否复用了现有的服务和工具函数？
- [ ] **接口兼容**：新功能是否保持API接口向后兼容？
- [ ] **配置驱动**：增强功能是否可以通过配置开关控制？
- [ ] **测试保持**：现有测试是否仍然通过？

## 📊 任务优先级矩阵

### P0 - 核心功能（必须完成）
- 响应式布局系统
- CAD智能体功能整合
- 基础UI组件库
- API接口体系

### P1 - 重要功能（应该完成）
- 欢迎页面优化
- 智能体切换系统
- 性能监控
- 错误处理机制

### P2 - 增强功能（可以完成）
- PWA支持
- 离线功能
- 高级动画效果
- 多语言支持

## 🔧 智能体A详细任务分解

### Week 1: 基础响应式系统建设

#### 任务A1-1: 断点系统创建
**文件**: `lib/constants/breakpoints.ts`
**工作量**: 4小时
**详细步骤**:
```typescript
// 1. 定义10个响应式断点
export const BREAKPOINTS = {
  xs: '320px',    // 小屏手机 (iPhone SE)
  sm: '375px',    // 标准手机 (iPhone 12/13)
  md: '414px',    // 大屏手机 (iPhone 12 Pro Max)
  lg: '768px',    // 平板竖屏 (iPad)
  xl: '1024px',   // 平板横屏 (iPad Pro)
  '2xl': '1280px', // 标准桌面
  '3xl': '1440px', // 大屏桌面
  '4xl': '1920px', // 全高清显示器
  '5xl': '2560px', // 2K显示器
  '6xl': '3840px', // 4K显示器
} as const;

// 2. 创建断点工具函数
export const getBreakpointValue = (breakpoint: keyof typeof BREAKPOINTS) => {
  return parseInt(BREAKPOINTS[breakpoint]);
};

// 3. 媒体查询助手
export const mediaQueries = {
  xs: `(min-width: ${BREAKPOINTS.xs})`,
  sm: `(min-width: ${BREAKPOINTS.sm})`,
  md: `(min-width: ${BREAKPOINTS.md})`,
  lg: `(min-width: ${BREAKPOINTS.lg})`,
  xl: `(min-width: ${BREAKPOINTS.xl})`,
  '2xl': `(min-width: ${BREAKPOINTS['2xl']})`,
  '3xl': `(min-width: ${BREAKPOINTS['3xl']})`,
  '4xl': `(min-width: ${BREAKPOINTS['4xl']})`,
  '5xl': `(min-width: ${BREAKPOINTS['5xl']})`,
  '6xl': `(min-width: ${BREAKPOINTS['6xl']})`,
};
```

**验收标准**:
- [ ] 所有断点值符合设计规范
- [ ] 媒体查询函数工作正常
- [ ] TypeScript类型定义完整
- [ ] 单元测试覆盖率100%

#### 任务A1-2: 设备检测Hook开发
**文件**: `hooks/use-device-detection.ts`
**工作量**: 8小时
**详细步骤**:
```typescript
interface DeviceInfo {
  // 设备类型检测
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'tv';
  // 触摸支持
  hasTouch: boolean;
  // 屏幕像素比
  pixelRatio: number;
  // 屏幕方向
  orientation: 'portrait' | 'landscape';
  // 性能级别评估
  performanceLevel: 'high' | 'medium' | 'low';
  // 网络连接速度
  connectionSpeed: 'slow-2g' | '2g' | '3g' | '4g' | '5g';
  // 操作系统
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux';
  // 浏览器信息
  browser: 'chrome' | 'safari' | 'firefox' | 'edge';
  // 是否支持WebGL
  hasWebGL: boolean;
  // 内存信息（如果可用）
  memory?: number;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceType: 'desktop',
    hasTouch: false,
    pixelRatio: 1,
    orientation: 'landscape',
    performanceLevel: 'high',
    connectionSpeed: '4g',
    platform: 'windows',
    browser: 'chrome',
    hasWebGL: false,
  });

  useEffect(() => {
    const detectDevice = () => {
      // 1. 检测设备类型
      const deviceType = getDeviceType();
      
      // 2. 检测触摸支持
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // 3. 获取像素比
      const pixelRatio = window.devicePixelRatio || 1;
      
      // 4. 检测屏幕方向
      const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
      
      // 5. 评估性能级别
      const performanceLevel = evaluatePerformance();
      
      // 6. 检测网络速度
      const connectionSpeed = getConnectionSpeed();
      
      // 7. 检测平台和浏览器
      const { platform, browser } = getPlatformAndBrowser();
      
      // 8. 检测WebGL支持
      const hasWebGL = checkWebGLSupport();
      
      // 9. 获取内存信息
      const memory = (navigator as any).deviceMemory;
      
      setDeviceInfo({
        deviceType,
        hasTouch,
        pixelRatio,
        orientation,
        performanceLevel,
        connectionSpeed,
        platform,
        browser,
        hasWebGL,
        memory,
      });
    };

    detectDevice();
    
    // 监听窗口大小变化
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);
    
    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return deviceInfo;
};

// 辅助函数实现
const getDeviceType = (): DeviceInfo['deviceType'] => {
  const userAgent = navigator.userAgent;
  const width = window.innerWidth;
  
  if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width > 1920) return 'tv';
  return 'desktop';
};

const evaluatePerformance = (): DeviceInfo['performanceLevel'] => {
  const memory = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const connection = (navigator as any).connection;
  
  let score = 0;
  
  // 内存评分
  if (memory >= 8) score += 3;
  else if (memory >= 4) score += 2;
  else score += 1;
  
  // CPU核心数评分
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else score += 1;
  
  // 网络评分
  if (connection) {
    if (connection.effectiveType === '4g') score += 2;
    else if (connection.effectiveType === '3g') score += 1;
  } else {
    score += 2; // 默认假设良好网络
  }
  
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
};
```

**验收标准**:
- [ ] 准确检测所有主流设备类型
- [ ] 性能评估算法经过测试验证
- [ ] 支持实时监听设备状态变化
- [ ] TypeScript类型安全
- [ ] 浏览器兼容性测试通过

#### 任务A1-3: 响应式工具Hook开发
**文件**: `hooks/use-responsive.ts`
**工作量**: 6小时
```typescript
interface ResponsiveConfig {
  xs?: any;
  sm?: any;
  md?: any;
  lg?: any;
  xl?: any;
  '2xl'?: any;
  '3xl'?: any;
  '4xl'?: any;
  '5xl'?: any;
  '6xl'?: any;
}

interface ResponsiveState {
  // 当前断点
  currentBreakpoint: keyof typeof BREAKPOINTS;
  // 设备类别判断
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
  // 方向判断
  isPortrait: boolean;
  isLandscape: boolean;
  // 尺寸信息
  width: number;
  height: number;
  // 响应式值获取函数
  getValue: <T>(config: ResponsiveConfig) => T;
  // 断点匹配函数
  matches: (breakpoint: keyof typeof BREAKPOINTS) => boolean;
  // 范围匹配函数
  between: (min: keyof typeof BREAKPOINTS, max: keyof typeof BREAKPOINTS) => boolean;
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<Omit<ResponsiveState, 'getValue' | 'matches' | 'between'>>({
    currentBreakpoint: 'lg',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTV: false,
    isPortrait: false,
    isLandscape: true,
    width: 1920,
    height: 1080,
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // 确定当前断点
      const currentBreakpoint = getCurrentBreakpoint(width);
      
      // 确定设备类别
      const isMobile = width < getBreakpointValue('lg');
      const isTablet = width >= getBreakpointValue('lg') && width < getBreakpointValue('xl');
      const isDesktop = width >= getBreakpointValue('xl') && width < getBreakpointValue('4xl');
      const isTV = width >= getBreakpointValue('4xl');
      
      // 确定屏幕方向
      const isPortrait = height > width;
      const isLandscape = width >= height;
      
      setState({
        currentBreakpoint,
        isMobile,
        isTablet,
        isDesktop,
        isTV,
        isPortrait,
        isLandscape,
        width,
        height,
      });
    };

    updateState();
    
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', () => {
      setTimeout(updateState, 100); // 延迟确保方向变化完成
    });
    
    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  const getValue = useCallback(<T>(config: ResponsiveConfig): T => {
    const breakpoints = Object.keys(BREAKPOINTS) as (keyof typeof BREAKPOINTS)[];
    const currentIndex = breakpoints.indexOf(state.currentBreakpoint);
    
    // 从当前断点向下查找最近的配置值
    for (let i = currentIndex; i >= 0; i--) {
      const breakpoint = breakpoints[i];
      if (config[breakpoint] !== undefined) {
        return config[breakpoint];
      }
    }
    
    // 如果没找到，返回最小断点的值
    return config.xs;
  }, [state.currentBreakpoint]);

  const matches = useCallback((breakpoint: keyof typeof BREAKPOINTS): boolean => {
    return state.width >= getBreakpointValue(breakpoint);
  }, [state.width]);

  const between = useCallback((
    min: keyof typeof BREAKPOINTS, 
    max: keyof typeof BREAKPOINTS
  ): boolean => {
    return state.width >= getBreakpointValue(min) && state.width < getBreakpointValue(max);
  }, [state.width]);

  return {
    ...state,
    getValue,
    matches,
    between,
  };
};

// 辅助函数
const getCurrentBreakpoint = (width: number): keyof typeof BREAKPOINTS => {
  const breakpoints = Object.entries(BREAKPOINTS)
    .map(([key, value]) => ({ key: key as keyof typeof BREAKPOINTS, value: parseInt(value) }))
    .sort((a, b) => b.value - a.value);
  
  for (const { key, value } of breakpoints) {
    if (width >= value) {
      return key;
    }
  }
  
  return 'xs';
};
```

**验收标准**:
- [ ] 响应式值计算准确
- [ ] 断点匹配逻辑正确
- [ ] 性能优化（防抖处理）
- [ ] 内存泄漏测试通过
- [ ] 边界条件测试通过

### Week 2: 核心UI组件开发

#### 任务A2-1: Button组件响应式改造
**文件**: `components/ui/button.tsx`
**工作量**: 6小时
```typescript
import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/use-responsive';

const buttonVariants = cva(
  // 基础样式
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-9 w-9',
      },
      // 响应式触摸优化
      touchOptimized: {
        true: '',
        false: '',
      },
    },
    // 复合变体 - 根据设备类型调整
    compoundVariants: [
      {
        touchOptimized: true,
        size: 'default',
        class: 'h-11 px-6 py-3', // 移动端增大触摸目标
      },
      {
        touchOptimized: true,
        size: 'sm',
        class: 'h-10 px-4 py-2',
      },
      {
        touchOptimized: true,
        size: 'lg',
        class: 'h-12 px-8 py-3',
      },
      {
        touchOptimized: true,
        size: 'icon',
        class: 'h-11 w-11',
      },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'default',
      touchOptimized: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  // 响应式尺寸配置
  responsiveSize?: {
    xs?: VariantProps<typeof buttonVariants>['size'];
    sm?: VariantProps<typeof buttonVariants>['size'];
    md?: VariantProps<typeof buttonVariants>['size'];
    lg?: VariantProps<typeof buttonVariants>['size'];
    xl?: VariantProps<typeof buttonVariants>['size'];
  };
  // 加载状态
  loading?: boolean;
  // 图标
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    touchOptimized,
    responsiveSize,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const { isMobile, isTablet, getValue } = useResponsive();
    
    // 自动检测是否需要触摸优化
    const shouldOptimizeForTouch = touchOptimized ?? (isMobile || isTablet);
    
    // 获取响应式尺寸
    const currentSize = responsiveSize ? getValue(responsiveSize) || size : size;
    
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(
          buttonVariants({ 
            variant, 
            size: currentSize, 
            touchOptimized: shouldOptimizeForTouch 
          }),
          // 加载状态样式
          loading && 'relative text-transparent pointer-events-none',
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        // 触摸设备优化
        {...(shouldOptimizeForTouch && {
          'data-touch-optimized': 'true',
        })}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          </div>
        )}
        
        {!loading && (
          <>
            {leftIcon && (
              <span className="mr-2 flex-shrink-0">
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="ml-2 flex-shrink-0">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

**验收标准**:
- [ ] 在所有断点下显示正确
- [ ] 触摸目标满足44px最小要求
- [ ] 加载状态动画流畅
- [ ] 键盘导航可访问
- [ ] 屏幕阅读器兼容

## 🔧 智能体B详细任务分解

### Week 1: 智能体系统架构

#### 任务B1-1: 智能体注册中心开发
**文件**: `lib/agents/registry.ts`
**工作量**: 8小时
**详细步骤**:
```typescript
import { EventEmitter } from 'events';

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

export enum AgentCategory {
  GENERAL = 'general',
  TECHNICAL = 'technical',
  CREATIVE = 'creative',
  ANALYTICAL = 'analytical',
}

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  required: boolean;
  version: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  category: AgentCategory;
  status: AgentStatus;
  version: string;
  capabilities: AgentCapability[];
  config: Record<string, any>;
  // 性能指标
  metrics: {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    lastUsed: Date;
  };
  // 健康检查
  healthCheck: {
    endpoint: string;
    interval: number;
    timeout: number;
  };
  // 依赖关系
  dependencies: string[];
  // 资源需求
  resources: {
    memory: number;
    cpu: number;
    storage: number;
  };
}

export class AgentRegistry extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    super();
    this.initializeHealthChecks();
  }

  // 注册智能体
  register(agent: Agent): void {
    this.validateAgent(agent);
    
    const existingAgent = this.agents.get(agent.id);
    if (existingAgent && existingAgent.version !== agent.version) {
      this.emit('agentUpdated', { old: existingAgent, new: agent });
    }
    
    this.agents.set(agent.id, {
      ...agent,
      metrics: {
        averageResponseTime: 0,
        successRate: 100,
        totalRequests: 0,
        lastUsed: new Date(),
        ...agent.metrics,
      },
    });
    
    this.startHealthCheck(agent);
    this.emit('agentRegistered', agent);
  }

  // 注销智能体
  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    this.stopHealthCheck(agentId);
    this.agents.delete(agentId);
    this.emit('agentUnregistered', agent);
    return true;
  }

  // 获取智能体
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  // 获取所有智能体
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  // 按类别获取智能体
  getAgentsByCategory(category: AgentCategory): Agent[] {
    return this.getAllAgents().filter(agent => agent.category === category);
  }

  // 按状态获取智能体
  getAgentsByStatus(status: AgentStatus): Agent[] {
    return this.getAllAgents().filter(agent => agent.status === status);
  }

  // 获取可用智能体
  getAvailableAgents(): Agent[] {
    return this.getAgentsByStatus(AgentStatus.ONLINE);
  }

  // 查找最佳智能体
  findBestAgent(requirements: {
    category?: AgentCategory;
    capabilities?: string[];
    minSuccessRate?: number;
    maxResponseTime?: number;
  }): Agent | null {
    let candidates = this.getAvailableAgents();
    
    // 按类别过滤
    if (requirements.category) {
      candidates = candidates.filter(agent => agent.category === requirements.category);
    }
    
    // 按能力过滤
    if (requirements.capabilities) {
      candidates = candidates.filter(agent => 
        requirements.capabilities!.every(cap => 
          agent.capabilities.some(agentCap => agentCap.id === cap)
        )
      );
    }
    
    // 按性能指标过滤
    candidates = candidates.filter(agent => {
      if (requirements.minSuccessRate && agent.metrics.successRate < requirements.minSuccessRate) {
        return false;
      }
      if (requirements.maxResponseTime && agent.metrics.averageResponseTime > requirements.maxResponseTime) {
        return false;
      }
      return true;
    });
    
    if (candidates.length === 0) return null;
    
    // 按综合得分排序
    candidates.sort((a, b) => {
      const scoreA = this.calculateAgentScore(a);
      const scoreB = this.calculateAgentScore(b);
      return scoreB - scoreA;
    });
    
    return candidates[0];
  }

  // 更新智能体状态
  updateAgentStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    const oldStatus = agent.status;
    agent.status = status;
    
    this.emit('agentStatusChanged', { agent, oldStatus, newStatus: status });
    return true;
  }

  // 更新智能体指标
  updateAgentMetrics(
    agentId: string, 
    metrics: Partial<Agent['metrics']>
  ): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    agent.metrics = { ...agent.metrics, ...metrics };
    this.emit('agentMetricsUpdated', { agent, metrics });
    return true;
  }

  // 记录智能体使用
  recordUsage(agentId: string, responseTime: number, success: boolean): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    const { metrics } = agent;
    const newTotal = metrics.totalRequests + 1;
    
    // 更新平均响应时间
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * metrics.totalRequests + responseTime) / newTotal;
    
    // 更新成功率
    const successCount = Math.round(metrics.successRate * metrics.totalRequests / 100);
    const newSuccessCount = successCount + (success ? 1 : 0);
    metrics.successRate = (newSuccessCount / newTotal) * 100;
    
    metrics.totalRequests = newTotal;
    metrics.lastUsed = new Date();
    
    this.emit('agentUsed', { agent, responseTime, success });
  }

  // 验证智能体配置
  private validateAgent(agent: Agent): void {
    if (!agent.id || !agent.name || !agent.route) {
      throw new Error('智能体必须有id、name和route');
    }
    
    if (!Object.values(AgentCategory).includes(agent.category)) {
      throw new Error('无效的智能体类别');
    }
    
    if (!Object.values(AgentStatus).includes(agent.status)) {
      throw new Error('无效的智能体状态');
    }
    
    // 验证依赖关系
    for (const depId of agent.dependencies || []) {
      if (!this.agents.has(depId)) {
        console.warn(`智能体 ${agent.id} 依赖的智能体 ${depId} 未找到`);
      }
    }
  }

  // 计算智能体得分
  private calculateAgentScore(agent: Agent): number {
    const { metrics } = agent;
    let score = 0;
    
    // 成功率权重 50%
    score += (metrics.successRate / 100) * 50;
    
    // 响应时间权重 30% (反向分数)
    const maxResponseTime = 10000; // 10秒
    const responseScore = Math.max(0, (maxResponseTime - metrics.averageResponseTime) / maxResponseTime);
    score += responseScore * 30;
    
    // 使用频率权重 20%
    const usageScore = Math.min(100, metrics.totalRequests / 100);
    score += usageScore * 20;
    
    return score;
  }

  // 健康检查
  private initializeHealthChecks(): void {
    // 每分钟检查一次所有智能体的健康状态
    setInterval(() => {
      this.getAllAgents().forEach(agent => {
        if (agent.status === AgentStatus.ONLINE) {
          this.performHealthCheck(agent);
        }
      });
    }, 60000); // 1分钟
  }

  private startHealthCheck(agent: Agent): void {
    if (!agent.healthCheck?.endpoint) return;
    
    this.stopHealthCheck(agent.id);
    
    const interval = setInterval(() => {
      this.performHealthCheck(agent);
    }, agent.healthCheck.interval || 30000);
    
    this.healthCheckIntervals.set(agent.id, interval);
  }

  private stopHealthCheck(agentId: string): void {
    const interval = this.healthCheckIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(agentId);
    }
  }

  private async performHealthCheck(agent: Agent): Promise<void> {
    if (!agent.healthCheck?.endpoint) return;
    
    try {
      const startTime = Date.now();
      const response = await fetch(agent.healthCheck.endpoint, {
        method: 'GET',
        timeout: agent.healthCheck.timeout || 5000,
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        if (agent.status !== AgentStatus.ONLINE) {
          this.updateAgentStatus(agent.id, AgentStatus.ONLINE);
        }
        this.recordUsage(agent.id, responseTime, true);
      } else {
        throw new Error(`健康检查失败: ${response.status}`);
      }
    } catch (error) {
      console.error(`智能体 ${agent.id} 健康检查失败:`, error);
      this.updateAgentStatus(agent.id, AgentStatus.ERROR);
      this.recordUsage(agent.id, 0, false);
    }
  }

  // 导出/导入配置
  exportConfig(): string {
    const config = {
      agents: this.getAllAgents().map(agent => ({
        ...agent,
        metrics: undefined, // 不导出运行时指标
      })),
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(config, null, 2);
  }

  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      if (config.agents && Array.isArray(config.agents)) {
        config.agents.forEach((agent: Agent) => {
          this.register(agent);
        });
        this.emit('configImported', config);
      }
    } catch (error) {
      throw new Error(`配置导入失败: ${error.message}`);
    }
  }

  // 清理资源
  destroy(): void {
    // 停止所有健康检查
    this.healthCheckIntervals.forEach(interval => clearInterval(interval));
    this.healthCheckIntervals.clear();
    
    // 清空智能体
    this.agents.clear();
    
    // 移除所有事件监听器
    this.removeAllListeners();
  }
}

// 创建全局实例
export const agentRegistry = new AgentRegistry();

// 智能体工厂函数
export const createAgent = (config: Partial<Agent> & Pick<Agent, 'id' | 'name' | 'route'>): Agent => {
  return {
    description: '',
    icon: '🤖',
    category: AgentCategory.GENERAL,
    status: AgentStatus.ONLINE,
    version: '1.0.0',
    capabilities: [],
    config: {},
    metrics: {
      averageResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      lastUsed: new Date(),
    },
    healthCheck: {
      endpoint: `/api/health/${config.id}`,
      interval: 30000,
      timeout: 5000,
    },
    dependencies: [],
    resources: {
      memory: 512,
      cpu: 1,
      storage: 1024,
    },
    ...config,
  };
};
```

**验收标准**:
- [ ] 智能体注册和注销功能正常
- [ ] 健康检查机制工作稳定
- [ ] 性能指标计算准确
- [ ] 事件系统工作正常
- [ ] 内存管理无泄漏
- [ ] 并发安全测试通过

## 📋 质量保证和验收检查清单

### 智能体A质量检查清单
```markdown
# 智能体A每日质量检查清单

## 响应式设计检查
- [ ] 320px - 3840px 所有断点测试通过
- [ ] 触摸设备最小44px触摸目标
- [ ] 横竖屏切换流畅
- [ ] 高DPI屏幕显示清晰

## 性能指标检查
- [ ] 首屏加载时间 < 1.5s
- [ ] 动画帧率 ≥ 60fps
- [ ] 内存使用稳定
- [ ] 包体积 < 500KB (gzipped)

## 无障碍访问检查
- [ ] 键盘导航完整
- [ ] 屏幕阅读器兼容
- [ ] 对比度比例 ≥ 4.5:1
- [ ] ARIA标签完整

## 代码质量检查
- [ ] TypeScript编译无错误
- [ ] ESLint无警告
- [ ] 测试覆盖率 ≥ 80%
- [ ] 组件文档完整
```

### 智能体B质量检查清单
```markdown
# 智能体B每日质量检查清单

## API功能检查
- [ ] 所有接口响应正常
- [ ] 错误处理完善
- [ ] 数据验证严格
- [ ] 权限控制正确

## CAD功能检查
- [ ] .dwg/.dxf/.step/.iges文件解析正常
- [ ] AI分析结果准确
- [ ] 文件上传进度显示
- [ ] 历史记录保存正确

## 性能指标检查
- [ ] API响应时间 < 500ms
- [ ] 数据库查询优化
- [ ] 文件处理异步化
- [ ] 内存使用监控

## 安全性检查
- [ ] 输入验证完整
- [ ] SQL注入防护
- [ ] 文件上传安全
- [ ] 敏感信息加密
```

## 🚨 风险控制和问题处理

### 常见风险和预防措施
```markdown
# 开发风险控制矩阵

## 高风险问题
1. **文件冲突**
   - 风险：同时修改共享文件导致代码冲突
   - 预防：严格遵守文件分工，使用Git保护分支
   - 应急：立即停止开发，手动合并冲突后继续

2. **接口不匹配**
   - 风险：智能体A和B的接口定义不一致
   - 预防：共享TypeScript类型定义，自动化类型检查
   - 应急：更新接口契约，重新测试集成

3. **性能退化**
   - 风险：新功能导致系统性能下降
   - 预防：每日性能监控，自动化性能测试
   - 应急：性能剖析定位问题，回滚问题代码

## 中等风险问题
1. **依赖冲突**
   - 风险：两个智能体安装冲突的包版本
   - 预防：集中管理package.json，版本锁定
   - 应急：使用yarn resolutions解决冲突

2. **测试覆盖不足**
   - 风险：功能测试不充分导致生产问题
   - 预防：强制测试覆盖率要求，自动化测试流水线
   - 应急：紧急补充测试用例

## 低风险问题
1. **代码风格不一致**
   - 风险：影响代码可维护性
   - 预防：ESLint+Prettier自动格式化
   - 应急：统一格式化所有代码

2. **文档不完整**
   - 风险：影响后续维护
   - 预防：开发过程中同步更新文档
   - 应急：补充关键功能文档
```

### 应急处理流程
```typescript
interface EmergencyProcedure {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: string[];
  rollbackPlan: string[];
  contactList: string[];
  maxResolutionTime: number; // 分钟
}

const emergencyProcedures: EmergencyProcedure[] = [
  {
    id: 'code-conflict',
    title: '代码冲突紧急处理',
    priority: 'critical',
    steps: [
      '1. 立即停止所有开发工作',
      '2. 备份当前工作分支',
      '3. 创建冲突解决分支',
      '4. 手动合并冲突代码',
      '5. 运行完整测试套件',
      '6. 两个智能体验收确认',
      '7. 合并到主分支',
    ],
    rollbackPlan: [
      '1. 回滚到最后稳定版本',
      '2. 重新同步工作进度',
      '3. 分析冲突原因',
      '4. 更新协作规范',
    ],
    contactList: ['智能体A', '智能体B', '项目负责人'],
    maxResolutionTime: 60,
  },
];
```

这个详细的开发任务分解文档确保了：

1. **任务粒度细化**：每个任务都有具体的实施步骤、代码示例和验收标准
2. **质量标准明确**：每个功能都有详细的测试要求和性能指标
3. **风险控制完善**：预设了常见问题的预防和应急处理措施
4. **协作机制清晰**：明确了两个智能体的协作方式和冲突解决流程

接下来我将创建更多支撑文档来确保开发质量. 