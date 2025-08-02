# ZK-Agent 前端组件设计规范

## 概述

本文档详细描述 ZK-Agent 项目的前端组件设计规范，包括组件架构设计、设计模式、状态管理、样式系统、性能优化、测试策略等方面的设计原则和实现细节。

## 1. 组件架构概览

### 1.1 技术栈

- **框架**: Next.js 14+ (App Router)
- **UI库**: Radix UI + Tailwind CSS
- **状态管理**: React Context + RxJS
- **表单处理**: React Hook Form + Zod
- **动画**: Framer Motion
- **图标**: Lucide React
- **类型检查**: TypeScript 5.x
- **测试**: Jest + React Testing Library + Playwright

### 1.2 组件层次结构

```
ZK-Agent Frontend Architecture
├── App Layer (Next.js App Router)
│   ├── Layout Components
│   │   ├── RootLayout               # 根布局
│   │   ├── DashboardLayout          # 仪表板布局
│   │   ├── AuthLayout               # 认证布局
│   │   └── PublicLayout             # 公共页面布局
│   ├── Page Components
│   │   ├── HomePage                 # 首页
│   │   ├── DashboardPage            # 仪表板
│   │   ├── AgentsPage               # 智能体管理
│   │   ├── TasksPage                # 任务管理
│   │   ├── KnowledgePage            # 知识库
│   │   └── SettingsPage             # 设置页面
│   └── Error Boundaries
│       ├── GlobalErrorBoundary      # 全局错误边界
│       ├── PageErrorBoundary        # 页面错误边界
│       └── ComponentErrorBoundary   # 组件错误边界
├── Feature Layer (业务功能组件)
│   ├── Multi-Agent System
│   │   ├── AgentCard                # 智能体卡片
│   │   ├── AgentCreator             # 智能体创建器
│   │   ├── AgentTeamBuilder         # 团队构建器
│   │   ├── TaskExecutor             # 任务执行器
│   │   └── PerformanceMonitor       # 性能监控
│   ├── AG-UI Integration
│   │   ├── ChatInterface            # 聊天界面
│   │   ├── MessageBubble            # 消息气泡
│   │   ├── ToolCallDisplay          # 工具调用显示
│   │   ├── StreamingIndicator       # 流式指示器
│   │   └── CADAnalysisViewer        # CAD分析查看器
│   ├── Knowledge Management
│   │   ├── KnowledgeGraph           # 知识图谱
│   │   ├── SearchInterface          # 搜索界面
│   │   ├── DocumentViewer           # 文档查看器
│   │   ├── TagManager               # 标签管理器
│   │   └── RelationshipEditor       # 关系编辑器
│   └── User Management
│       ├── UserProfile              # 用户资料
│       ├── TeamManagement           # 团队管理
│       ├── PermissionMatrix         # 权限矩阵
│       └── ActivityTimeline         # 活动时间线
├── UI Layer (通用UI组件)
│   ├── Layout Components
│   │   ├── Header                   # 页头
│   │   ├── Sidebar                  # 侧边栏
│   │   ├── Navigation               # 导航
│   │   ├── Breadcrumb               # 面包屑
│   │   └── Footer                   # 页脚
│   ├── Data Display
│   │   ├── Table                    # 表格
│   │   ├── Card                     # 卡片
│   │   ├── List                     # 列表
│   │   ├── Timeline                 # 时间线
│   │   ├── Chart                    # 图表
│   │   └── Badge                    # 徽章
│   ├── Form Components
│   │   ├── Input                    # 输入框
│   │   ├── Select                   # 选择器
│   │   ├── Checkbox                 # 复选框
│   │   ├── Radio                    # 单选框
│   │   ├── Switch                   # 开关
│   │   ├── Slider                   # 滑块
│   │   ├── DatePicker               # 日期选择器
│   │   └── FileUpload               # 文件上传
│   ├── Feedback Components
│   │   ├── Alert                    # 警告
│   │   ├── Toast                    # 提示
│   │   ├── Modal                    # 模态框
│   │   ├── Drawer                   # 抽屉
│   │   ├── Tooltip                  # 工具提示
│   │   ├── Popover                  # 弹出框
│   │   └── Loading                  # 加载状态
│   └── Navigation Components
│       ├── Button                   # 按钮
│       ├── Link                     # 链接
│       ├── Tabs                     # 标签页
│       ├── Pagination               # 分页
│       ├── Menu                     # 菜单
│       └── Dropdown                 # 下拉菜单
└── Foundation Layer (基础设施)
    ├── Hooks
    │   ├── useAuth                  # 认证钩子
    │   ├── useApi                   # API钩子
    │   ├── useWebSocket             # WebSocket钩子
    │   ├── useLocalStorage          # 本地存储钩子
    │   ├── useDebounce              # 防抖钩子
    │   ├── useIntersection          # 交叉观察器钩子
    │   └── useVirtualization        # 虚拟化钩子
    ├── Context Providers
    │   ├── AuthProvider             # 认证提供者
    │   ├── ThemeProvider            # 主题提供者
    │   ├── NotificationProvider     # 通知提供者
    │   ├── ModalProvider            # 模态框提供者
    │   └── WebSocketProvider        # WebSocket提供者
    ├── Utils
    │   ├── cn (className merger)    # 类名合并
    │   ├── formatters               # 格式化工具
    │   ├── validators               # 验证工具
    │   ├── api-client               # API客户端
    │   └── event-emitter            # 事件发射器
    └── Types
        ├── component-props          # 组件属性类型
        ├── api-responses            # API响应类型
        ├── form-schemas             # 表单模式类型
        └── global-types             # 全局类型
```

## 2. 组件设计原则

### 2.1 设计原则

#### 单一职责原则 (SRP)
```typescript
// ❌ 违反单一职责原则
const UserDashboard = () => {
  // 用户信息管理
  const [user, setUser] = useState();
  // 任务管理
  const [tasks, setTasks] = useState();
  // 通知管理
  const [notifications, setNotifications] = useState();
  // 主题管理
  const [theme, setTheme] = useState();
  
  return (
    <div>
      {/* 混合了多种职责的复杂组件 */}
    </div>
  );
};

// ✅ 遵循单一职责原则
const UserProfile = () => {
  // 只负责用户信息显示和编辑
};

const TaskList = () => {
  // 只负责任务列表显示
};

const NotificationCenter = () => {
  // 只负责通知管理
};

const UserDashboard = () => {
  return (
    <DashboardLayout>
      <UserProfile />
      <TaskList />
      <NotificationCenter />
    </DashboardLayout>
  );
};
```

#### 开闭原则 (OCP)
```typescript
// 基础按钮组件，对扩展开放，对修改封闭
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className,
  loading,
  disabled,
  ...props 
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
};

// 扩展特殊按钮，不修改基础组件
const SubmitButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="primary" {...props} />
);

const DeleteButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="danger" {...props} />
);
```

#### 组合优于继承
```typescript
// ✅ 使用组合模式
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => (
  <div className={cn('bg-white rounded-lg shadow-md', className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className }: CardProps) => (
  <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
    {children}
  </div>
);

const CardContent = ({ children, className }: CardProps) => (
  <div className={cn('px-6 py-4', className)}>
    {children}
  </div>
);

const CardFooter = ({ children, className }: CardProps) => (
  <div className={cn('px-6 py-4 border-t border-gray-200', className)}>
    {children}
  </div>
);

// 使用组合构建复杂组件
const AgentCard = ({ agent }: { agent: Agent }) => (
  <Card>
    <CardHeader>
      <h3 className="text-lg font-semibold">{agent.name}</h3>
      <Badge variant={agent.status === 'ACTIVE' ? 'success' : 'secondary'}>
        {agent.status}
      </Badge>
    </CardHeader>
    <CardContent>
      <p className="text-gray-600">{agent.description}</p>
      <div className="mt-4">
        <AgentCapabilities capabilities={agent.capabilities} />
      </div>
    </CardContent>
    <CardFooter>
      <Button variant="primary">Configure</Button>
      <Button variant="secondary">View Details</Button>
    </CardFooter>
  </Card>
);
```

### 2.2 组件分类

#### 展示组件 (Presentational Components)
```typescript
// 纯展示组件，只负责UI渲染
interface UserAvatarProps {
  user: {
    name: string;
    avatar?: string;
    email: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'md', 
  showName = false,
  className 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
  };
  
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
  
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn(
        'rounded-full bg-gray-300 flex items-center justify-center',
        sizeClasses[size]
      )}>
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="font-medium text-gray-600">{initials}</span>
        )}
      </div>
      {showName && (
        <div>
          <p className="font-medium text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      )}
    </div>
  );
};
```

#### 容器组件 (Container Components)
```typescript
// 容器组件，负责数据获取和状态管理
const UserProfileContainer: React.FC<{ userId: string }> = ({ userId }) => {
  const { data: user, loading, error } = useUser(userId);
  const { updateUser } = useUserMutations();
  const [isEditing, setIsEditing] = useState(false);
  
  const handleSave = async (userData: Partial<User>) => {
    try {
      await updateUser(userId, userData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };
  
  if (loading) return <UserProfileSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <NotFound />;
  
  return (
    <UserProfile
      user={user}
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={handleSave}
      onCancel={() => setIsEditing(false)}
    />
  );
};
```

#### 高阶组件 (HOC)
```typescript
// 认证高阶组件
function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole
) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();
    
    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
      }
      
      if (user && requiredRole && user.role !== requiredRole) {
        router.push('/unauthorized');
      }
    }, [user, loading, router]);
    
    if (loading) return <LoadingSpinner />;
    if (!user) return null;
    if (requiredRole && user.role !== requiredRole) return null;
    
    return <Component {...props} />;
  };
}

// 使用示例
const AdminPanel = withAuth(AdminPanelComponent, 'ADMIN');
const UserDashboard = withAuth(UserDashboardComponent);
```

## 3. 状态管理架构

### 3.1 Context + RxJS 模式

#### 认证状态管理
```typescript
// lib/auth/auth-context.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '@/types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

// RxJS Subject for state management
class AuthStore {
  private authSubject = new BehaviorSubject<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  
  public auth$ = this.authSubject.asObservable();
  
  get currentState() {
    return this.authSubject.value;
  }
  
  updateState(partialState: Partial<AuthState>) {
    this.authSubject.next({
      ...this.currentState,
      ...partialState,
    });
  }
  
  async login(email: string, password: string) {
    this.updateState({ loading: true, error: null });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const user = await response.json();
      this.updateState({ user, loading: false });
    } catch (error) {
      this.updateState({ 
        error: error instanceof Error ? error.message : 'Login failed',
        loading: false 
      });
    }
  }
  
  async logout() {
    this.updateState({ loading: true });
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      this.updateState({ user: null, loading: false });
    } catch (error) {
      this.updateState({ loading: false });
    }
  }
  
  async updateUser(userData: Partial<User>) {
    const currentUser = this.currentState.user;
    if (!currentUser) return;
    
    this.updateState({ loading: true });
    
    try {
      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        throw new Error('Update failed');
      }
      
      const updatedUser = await response.json();
      this.updateState({ user: updatedUser, loading: false });
    } catch (error) {
      this.updateState({ 
        error: error instanceof Error ? error.message : 'Update failed',
        loading: false 
      });
    }
  }
}

const authStore = new AuthStore();
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(authStore.currentState);
  
  useEffect(() => {
    const subscription = authStore.auth$.subscribe(setAuthState);
    return () => subscription.unsubscribe();
  }, []);
  
  const contextValue: AuthContextType = {
    ...authState,
    login: authStore.login.bind(authStore),
    logout: authStore.logout.bind(authStore),
    updateUser: authStore.updateUser.bind(authStore),
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### 多智能体状态管理
```typescript
// lib/multi-agent/agent-context.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { Agent, AgentTeam, TaskExecution } from '@/types/multi-agent';

interface AgentState {
  agents: Agent[];
  teams: AgentTeam[];
  executions: TaskExecution[];
  loading: boolean;
  error: string | null;
}

class AgentStore {
  private agentsSubject = new BehaviorSubject<Agent[]>([]);
  private teamsSubject = new BehaviorSubject<AgentTeam[]>([]);
  private executionsSubject = new BehaviorSubject<TaskExecution[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  
  public state$ = combineLatest([
    this.agentsSubject,
    this.teamsSubject,
    this.executionsSubject,
    this.loadingSubject,
    this.errorSubject,
  ]).pipe(
    map(([agents, teams, executions, loading, error]) => ({
      agents,
      teams,
      executions,
      loading,
      error,
    }))
  );
  
  // Agent management
  async createAgent(agentData: Omit<Agent, 'id' | 'created_at'>) {
    this.loadingSubject.next(true);
    
    try {
      const response = await fetch('/api/multi-agent/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });
      
      if (!response.ok) throw new Error('Failed to create agent');
      
      const newAgent = await response.json();
      const currentAgents = this.agentsSubject.value;
      this.agentsSubject.next([...currentAgents, newAgent]);
      
    } catch (error) {
      this.errorSubject.next(
        error instanceof Error ? error.message : 'Failed to create agent'
      );
    } finally {
      this.loadingSubject.next(false);
    }
  }
  
  async loadAgents() {
    this.loadingSubject.next(true);
    
    try {
      const response = await fetch('/api/multi-agent/agents');
      if (!response.ok) throw new Error('Failed to load agents');
      
      const agents = await response.json();
      this.agentsSubject.next(agents);
      
    } catch (error) {
      this.errorSubject.next(
        error instanceof Error ? error.message : 'Failed to load agents'
      );
    } finally {
      this.loadingSubject.next(false);
    }
  }
  
  // Team management
  async createTeam(teamData: Omit<AgentTeam, 'id' | 'created_at'>) {
    this.loadingSubject.next(true);
    
    try {
      const response = await fetch('/api/multi-agent/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      });
      
      if (!response.ok) throw new Error('Failed to create team');
      
      const newTeam = await response.json();
      const currentTeams = this.teamsSubject.value;
      this.teamsSubject.next([...currentTeams, newTeam]);
      
    } catch (error) {
      this.errorSubject.next(
        error instanceof Error ? error.message : 'Failed to create team'
      );
    } finally {
      this.loadingSubject.next(false);
    }
  }
  
  // Real-time execution updates
  subscribeToExecutions(taskId: string) {
    const eventSource = new EventSource(`/api/multi-agent/tasks/${taskId}/stream`);
    
    eventSource.onmessage = (event) => {
      const execution: TaskExecution = JSON.parse(event.data);
      const currentExecutions = this.executionsSubject.value;
      
      const existingIndex = currentExecutions.findIndex(e => e.id === execution.id);
      
      if (existingIndex >= 0) {
        // Update existing execution
        const updatedExecutions = [...currentExecutions];
        updatedExecutions[existingIndex] = execution;
        this.executionsSubject.next(updatedExecutions);
      } else {
        // Add new execution
        this.executionsSubject.next([...currentExecutions, execution]);
      }
    };
    
    return () => eventSource.close();
  }
}

const agentStore = new AgentStore();
const AgentContext = createContext<AgentState & {
  createAgent: (data: Omit<Agent, 'id' | 'created_at'>) => Promise<void>;
  loadAgents: () => Promise<void>;
  createTeam: (data: Omit<AgentTeam, 'id' | 'created_at'>) => Promise<void>;
  subscribeToExecutions: (taskId: string) => () => void;
} | null>(null);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AgentState>({
    agents: [],
    teams: [],
    executions: [],
    loading: false,
    error: null,
  });
  
  useEffect(() => {
    const subscription = agentStore.state$.subscribe(setState);
    return () => subscription.unsubscribe();
  }, []);
  
  const contextValue = {
    ...state,
    createAgent: agentStore.createAgent.bind(agentStore),
    loadAgents: agentStore.loadAgents.bind(agentStore),
    createTeam: agentStore.createTeam.bind(agentStore),
    subscribeToExecutions: agentStore.subscribeToExecutions.bind(agentStore),
  };
  
  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgents = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgents must be used within an AgentProvider');
  }
  return context;
};
```

### 3.2 自定义 Hooks

#### API 数据获取 Hook
```typescript
// hooks/use-api.ts
import { useState, useEffect, useCallback } from 'react';
import { BehaviorSubject } from 'rxjs';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  dependencies?: any[];
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): ApiState<T> & {
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
} {
  const { immediate = true, dependencies = [] } = options;
  
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  
  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  }, [fetcher]);
  
  const mutate = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }));
  }, []);
  
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate, ...dependencies]);
  
  return {
    ...state,
    refetch: execute,
    mutate,
  };
}

// 使用示例
const UserList = () => {
  const { data: users, loading, error, refetch } = useApi(
    () => fetch('/api/users').then(res => res.json()),
    { immediate: true }
  );
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <div>
      <Button onClick={refetch}>Refresh</Button>
      {users?.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
};
```

#### WebSocket Hook
```typescript
// hooks/use-websocket.ts
import { useEffect, useRef, useState } from 'react';
import { Subject, Observable } from 'rxjs';

interface UseWebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
) {
  const {
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 3,
    reconnectInterval = 3000,
  } = options;
  
  const [connectionStatus, setConnectionStatus] = useState<
    'Connecting' | 'Open' | 'Closing' | 'Closed'
  >('Closed');
  
  const ws = useRef<WebSocket | null>(null);
  const messageSubject = useRef(new Subject<MessageEvent>());
  const reconnectCount = useRef(0);
  
  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionStatus('Connecting');
    ws.current = new WebSocket(url);
    
    ws.current.onopen = () => {
      setConnectionStatus('Open');
      reconnectCount.current = 0;
      onOpen?.();
    };
    
    ws.current.onclose = () => {
      setConnectionStatus('Closed');
      onClose?.();
      
      // Auto-reconnect
      if (reconnectCount.current < reconnectAttempts) {
        reconnectCount.current++;
        setTimeout(connect, reconnectInterval);
      }
    };
    
    ws.current.onerror = (error) => {
      onError?.(error);
    };
    
    ws.current.onmessage = (event) => {
      messageSubject.current.next(event);
    };
  };
  
  const disconnect = () => {
    if (ws.current) {
      setConnectionStatus('Closing');
      ws.current.close();
    }
  };
  
  const sendMessage = (data: string | object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      ws.current.send(message);
    }
  };
  
  useEffect(() => {
    connect();
    return () => {
      disconnect();
      messageSubject.current.complete();
    };
  }, [url]);
  
  return {
    connectionStatus,
    sendMessage,
    connect,
    disconnect,
    messages$: messageSubject.current.asObservable(),
  };
}

// 使用示例
const TaskExecutionMonitor = ({ taskId }: { taskId: string }) => {
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  
  const { connectionStatus, messages$ } = useWebSocket(
    `/api/multi-agent/tasks/${taskId}/ws`,
    {
      onOpen: () => console.log('Connected to task execution stream'),
      onClose: () => console.log('Disconnected from task execution stream'),
    }
  );
  
  useEffect(() => {
    const subscription = messages$.subscribe((event) => {
      try {
        const execution: TaskExecution = JSON.parse(event.data);
        setExecutions(prev => {
          const existingIndex = prev.findIndex(e => e.id === execution.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = execution;
            return updated;
          }
          return [...prev, execution];
        });
      } catch (error) {
        console.error('Failed to parse execution data:', error);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [messages$]);
  
  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'Open' ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span>Connection: {connectionStatus}</span>
      </div>
      
      <div className="space-y-2">
        {executions.map(execution => (
          <ExecutionCard key={execution.id} execution={execution} />
        ))}
      </div>
    </div>
  );
};
```

## 4. 样式系统设计

### 4.1 Tailwind CSS 配置

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Gray scale
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'hard': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};

export default config;
```

### 4.2 设计系统组件

#### 主题提供者
```typescript
// components/theme/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ 
  children: React.ReactNode;
  defaultTheme?: Theme;
}> = ({ children, defaultTheme = 'system' }) => {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme;
    if (stored) {
      setTheme(stored);
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      
      const handler = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);
  
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

#### 设计令牌
```typescript
// lib/design-tokens.ts
export const designTokens = {
  // Spacing
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
  },
  
  // Typography
  typography: {
    fontSizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  
  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Z-index
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
  
  // Transitions
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },
} as const;

// CSS-in-JS helper
export const createStyles = (styles: Record<string, any>) => styles;

// Responsive breakpoints
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
```

## 5. 性能优化策略

### 5.1 组件懒加载

```typescript
// components/lazy-loading.tsx
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from './ui/loading-spinner';

// 懒加载组件
const AgentCreator = lazy(() => import('./multi-agent/agent-creator'));
const TaskExecutor = lazy(() => import('./multi-agent/task-executor'));
const KnowledgeGraph = lazy(() => import('./knowledge/knowledge-graph'));
const CADAnalysisViewer = lazy(() => import('./ag-ui/cad-analysis-viewer'));

// 懒加载包装器
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const LazyWrapper: React.FC<LazyComponentProps> = ({ 
  children, 
  fallback = <LoadingSpinner /> 
}) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// 使用示例
const MultiAgentDashboard = () => {
  const [activeTab, setActiveTab] = useState('agents');
  
  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents">
          <LazyWrapper fallback={<AgentListSkeleton />}>
            <AgentCreator />
          </LazyWrapper>
        </TabsContent>
        
        <TabsContent value="tasks">
          <LazyWrapper fallback={<TaskListSkeleton />}>
            <TaskExecutor />
          </LazyWrapper>
        </TabsContent>
        
        <TabsContent value="knowledge">
          <LazyWrapper fallback={<KnowledgeGraphSkeleton />}>
            <KnowledgeGraph />
          </LazyWrapper>
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### 5.2 虚拟化列表

```typescript
// components/ui/virtual-list.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5,
  });
  
  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 使用示例
const TaskList = () => {
  const { data: tasks } = useApi(() => fetch('/api/tasks').then(r => r.json()));
  
  return (
    <VirtualList
      items={tasks || []}
      height={600}
      itemHeight={80}
      renderItem={(task, index) => (
        <TaskCard key={task.id} task={task} />
      )}
      className="border rounded-lg"
    />
  );
};
```

### 5.3 图片优化

```typescript
// components/ui/optimized-image.tsx
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  fallback?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  fallback = '/images/placeholder.svg',
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImgSrc(fallback);
          setIsLoading(false);
        }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

// 头像组件优化
const UserAvatar: React.FC<{
  user: { name: string; avatar?: string };
  size?: 'sm' | 'md' | 'lg';
}> = ({ user, size = 'md' }) => {
  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
  };
  
  const { width, height } = sizeMap[size];
  
  if (!user.avatar) {
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
    
    return (
      <div 
        className={cn(
          'rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-lg'
        )}
        style={{ width, height }}
      >
        {initials}
      </div>
    );
  }
  
  return (
    <OptimizedImage
      src={user.avatar}
      alt={user.name}
      width={width}
      height={height}
      className="rounded-full"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    />
  );
};
```

### 5.4 代码分割和预加载

```typescript
// lib/code-splitting.ts
import { ComponentType } from 'react';

// 动态导入工具
export const dynamicImport = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    ssr?: boolean;
    loading?: ComponentType;
  }
) => {
  const { ssr = true, loading } = options || {};
  
  return dynamic(importFn, {
    ssr,
    loading: loading ? () => React.createElement(loading) : undefined,
  });
};

// 路由级别的代码分割
export const routeComponents = {
  Dashboard: dynamicImport(
    () => import('@/app/dashboard/page'),
    { loading: () => <DashboardSkeleton /> }
  ),
  
  Agents: dynamicImport(
    () => import('@/app/agents/page'),
    { loading: () => <AgentsSkeleton /> }
  ),
  
  Chat: dynamicImport(
    () => import('@/app/chat/page'),
    { loading: () => <ChatSkeleton /> }
  ),
  
  Knowledge: dynamicImport(
    () => import('@/app/knowledge/page'),
    { loading: () => <KnowledgeSkeleton /> }
  ),
};

// 预加载关键组件
export const preloadCriticalComponents = () => {
  // 预加载聊天相关组件
  import('@/components/chat/ChatInterface');
  import('@/components/chat/MessageBubble');
  
  // 预加载智能体相关组件
  import('@/components/agents/AgentCard');
  import('@/components/agents/AgentCreator');
  
  // 预加载知识库相关组件
  import('@/components/knowledge/KnowledgeGraph');
  import('@/components/knowledge/SearchInterface');
};

// 基于用户交互的预加载
export const useInteractionPreload = () => {
  const preloadOnHover = useCallback((componentPath: string) => {
    return () => {
      import(componentPath).catch(console.error);
    };
  }, []);
  
  const preloadOnFocus = useCallback((componentPath: string) => {
    return () => {
      import(componentPath).catch(console.error);
    };
  }, []);
  
  return { preloadOnHover, preloadOnFocus };
};
```

## 6. 组件测试策略

### 6.1 单元测试

```typescript
// __tests__/components/ui/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });
  
  it('applies correct variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
  
  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 6.2 集成测试

```typescript
// __tests__/components/chat/ChatInterface.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { AuthProvider } from '@/lib/auth/auth-context';
import { WebSocketProvider } from '@/lib/websocket/websocket-context';

// Mock WebSocket
jest.mock('@/lib/websocket/websocket-context', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => children,
  useWebSocket: () => ({
    sendMessage: jest.fn(),
    messages: [],
    isConnected: true,
  }),
}));

const renderChatInterface = () => {
  return render(
    <AuthProvider>
      <WebSocketProvider>
        <ChatInterface />
      </WebSocketProvider>
    </AuthProvider>
  );
};

describe('ChatInterface Integration', () => {
  it('sends message when form is submitted', async () => {
    renderChatInterface();
    
    const input = screen.getByPlaceholderText('输入消息...');
    const sendButton = screen.getByRole('button', { name: '发送' });
    
    fireEvent.change(input, { target: { value: 'Hello AI' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
    });
  });
  
  it('displays typing indicator when AI is responding', async () => {
    renderChatInterface();
    
    // 模拟发送消息
    const input = screen.getByPlaceholderText('输入消息...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.submit(input.closest('form')!);
    
    await waitFor(() => {
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });
  });
  
  it('handles file upload', async () => {
    renderChatInterface();
    
    const fileInput = screen.getByLabelText('上传文件');
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
  });
});
```

### 6.3 E2E测试

```typescript
// e2e/chat-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // 登录用户
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // 等待重定向到聊天页面
    await page.waitForURL('/chat');
  });
  
  test('complete chat interaction', async ({ page }) => {
    // 发送消息
    await page.fill('[data-testid="chat-input"]', 'Hello, how can you help me?');
    await page.click('[data-testid="send-button"]');
    
    // 验证消息显示
    await expect(page.locator('[data-testid="user-message"]')).toContainText('Hello, how can you help me?');
    
    // 等待AI回复
    await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 10000 });
    
    // 验证回复内容不为空
    const aiMessage = page.locator('[data-testid="ai-message"]').first();
    await expect(aiMessage).not.toBeEmpty();
  });
  
  test('file upload and analysis', async ({ page }) => {
    // 上传文件
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles('test-files/sample.pdf');
    
    // 验证文件上传成功
    await expect(page.locator('[data-testid="uploaded-file"]')).toContainText('sample.pdf');
    
    // 发送分析请求
    await page.fill('[data-testid="chat-input"]', '请分析这个文件');
    await page.click('[data-testid="send-button"]');
    
    // 验证分析结果
    await expect(page.locator('[data-testid="analysis-result"]')).toBeVisible({ timeout: 30000 });
  });
  
  test('multi-agent collaboration', async ({ page }) => {
    // 导航到多智能体页面
    await page.click('[data-testid="multi-agent-nav"]');
    
    // 创建智能体团队
    await page.click('[data-testid="create-team-button"]');
    await page.fill('[data-testid="team-name-input"]', 'Research Team');
    
    // 添加智能体
    await page.click('[data-testid="add-agent-button"]');
    await page.selectOption('[data-testid="agent-type-select"]', 'researcher');
    await page.click('[data-testid="confirm-add-agent"]');
    
    // 启动任务
    await page.fill('[data-testid="task-input"]', '研究人工智能的最新发展');
    await page.click('[data-testid="start-task-button"]');
    
    // 验证任务执行
    await expect(page.locator('[data-testid="task-status"]')).toContainText('执行中');
    
    // 等待任务完成
    await expect(page.locator('[data-testid="task-result"]')).toBeVisible({ timeout: 60000 });
  });
});
```

## 7. 开发工具链

### 7.1 Storybook配置

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(js|jsx|ts|tsx)',
    '../app/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-design-tokens',
    '@storybook/addon-docs',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../'),
      };
    }
    return config;
  },
};

export default config;
```

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      toc: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

### 7.2 组件Story示例

```typescript
// components/ui/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '通用按钮组件，支持多种样式和状态。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: '按钮样式变体',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: '按钮尺寸',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用按钮',
    },
    loading: {
      control: 'boolean',
      description: '是否显示加载状态',
    },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading...',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled',
    disabled: true,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

### 7.3 开发调试工具

```typescript
// components/dev/DevTools.tsx
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useTheme } from '@/lib/theme/theme-context';

const DevTools = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <>
      {/* 开发工具触发按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700"
        title="开发工具"
      >
        🛠️
      </button>
      
      {/* 开发工具面板 */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">开发工具</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            {/* 环境信息 */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">环境信息</h4>
              <div className="text-xs space-y-1">
                <div>环境: {process.env.NODE_ENV}</div>
                <div>版本: {process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</div>
                <div>API: {process.env.NEXT_PUBLIC_API_URL || 'localhost'}</div>
                <div>主题: {theme}</div>
              </div>
            </div>
            
            {/* 用户信息 */}
            {user && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">用户信息</h4>
                <div className="text-xs space-y-1">
                  <div>ID: {user.id}</div>
                  <div>邮箱: {user.email}</div>
                  <div>角色: {user.role}</div>
                </div>
              </div>
            )}
            
            {/* 快捷操作 */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">快捷操作</h4>
              <div className="space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full text-left text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  切换主题
                </button>
                <button
                  onClick={() => localStorage.clear()}
                  className="w-full text-left text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  清除本地存储
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full text-left text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  重新加载页面
                </button>
              </div>
            </div>
            
            {/* 性能信息 */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">性能信息</h4>
              <div className="text-xs space-y-1">
                <div>内存使用: {(performance as any).memory?.usedJSHeapSize ? 
                  `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                  '不可用'
                }</div>
                <div>连接类型: {(navigator as any).connection?.effectiveType || '未知'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DevTools;
```

## 8. 部署优化

### 8.1 构建优化

```javascript
// next.config.mjs
const nextConfig = {
  // 实验性功能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'lucide-react',
    ],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // 压缩配置
  compress: true,
  
  // 图片优化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1年
  },
  
  // 输出配置
  output: 'standalone',
  
  // PWA配置
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
  },
  
  // Webpack配置
  webpack: (config, { dev, isServer, webpack }) => {
    // 生产环境优化
    if (!dev && !isServer) {
      // 代码分割优化
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            enforce: true,
          },
        },
      };
      
      // 压缩优化
      config.optimization.minimize = true;
    }
    
    // 添加别名
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    
    return config;
  },
  
  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // 头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### 8.2 性能监控

```typescript
// lib/performance/performance-monitor.tsx
import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Web Vitals 监控
export const PerformanceMonitor = () => {
  useEffect(() => {
    // 监控核心Web指标
    getCLS((metric) => {
      console.log('CLS:', metric);
      // 发送到分析服务
      sendToAnalytics('CLS', metric);
    });
    
    getFID((metric) => {
      console.log('FID:', metric);
      sendToAnalytics('FID', metric);
    });
    
    getFCP((metric) => {
      console.log('FCP:', metric);
      sendToAnalytics('FCP', metric);
    });
    
    getLCP((metric) => {
      console.log('LCP:', metric);
      sendToAnalytics('LCP', metric);
    });
    
    getTTFB((metric) => {
      console.log('TTFB:', metric);
      sendToAnalytics('TTFB', metric);
    });
  }, []);
  
  return null;
};

// 发送性能数据到分析服务
const sendToAnalytics = (metricName: string, metric: any) => {
  if (process.env.NODE_ENV === 'production') {
    // 发送到Google Analytics或其他分析服务
    if (typeof gtag !== 'undefined') {
      gtag('event', metricName, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_delta: metric.delta,
      });
    }
  }
};

// 组件性能分析HOC
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) => {
  return function PerformanceTrackedComponent(props: P) {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        console.log(`${componentName} 渲染时间: ${renderTime.toFixed(2)}ms`);
        
        // 记录长时间渲染的组件
        if (renderTime > 100) {
          console.warn(`${componentName} 渲染时间过长: ${renderTime.toFixed(2)}ms`);
        }
      };
    }, []);
    
    return <WrappedComponent {...props} />;
  };
};

// 内存使用监控
export const useMemoryMonitor = () => {
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        
        console.log(`内存使用: ${usedMB}MB / ${totalMB}MB (限制: ${limitMB}MB)`);
        
        // 内存使用过高警告
        if (usedMB > limitMB * 0.8) {
          console.warn('内存使用过高，可能存在内存泄漏');
        }
      }
    };
    
    // 每30秒检查一次内存使用
    const interval = setInterval(checkMemory, 30000);
    
    return () => clearInterval(interval);
  }, []);
};
```

## 9. 最佳实践总结

### 9.1 组件设计原则

1. **单一职责**: 每个组件只负责一个明确的功能
2. **可复用性**: 设计通用的、可配置的组件
3. **可测试性**: 组件应该易于测试和调试
4. **性能优化**: 避免不必要的重渲染和资源浪费
5. **可访问性**: 遵循WCAG无障碍标准
6. **类型安全**: 使用TypeScript确保类型安全
7. **错误处理**: 优雅地处理错误状态
8. **响应式设计**: 适配不同设备和屏幕尺寸

### 9.2 代码质量保证

1. **TypeScript**: 强类型检查，减少运行时错误
2. **ESLint**: 代码规范检查，保持代码一致性
3. **Prettier**: 代码格式化，统一代码风格
4. **Husky**: Git钩子自动化，确保提交质量
5. **测试覆盖率**: 保持80%以上的测试覆盖率
6. **代码审查**: 严格的PR审查流程
7. **性能监控**: 持续监控应用性能
8. **错误追踪**: 实时错误监控和报告

### 9.3 团队协作规范

1. **组件文档**: 使用Storybook记录组件使用方法
2. **设计系统**: 统一的设计语言和组件库
3. **版本管理**: 语义化版本控制
4. **持续集成**: 自动化测试和部署
5. **知识分享**: 定期技术分享和代码审查
6. **规范文档**: 维护完整的开发规范文档

### 9.4 性能优化策略

1. **代码分割**: 按需加载，减少初始包大小
2. **图片优化**: 使用现代图片格式和懒加载
3. **缓存策略**: 合理使用浏览器缓存和CDN
4. **虚拟化**: 大数据列表使用虚拟滚动
5. **预加载**: 预加载关键资源
6. **压缩优化**: 代码压缩和Gzip压缩
7. **监控分析**: 持续监控和性能分析
8. **渐进式增强**: 核心功能优先，增强功能渐进

---

本文档为ZK-Agent项目前端组件设计的完整指南，涵盖了从架构设计到部署优化的全流程最佳实践。开发团队应严格遵循这些规范，确保代码质量和项目的长期可维护性。

文档版本: v1.0.0  
最后更新: 2024年1月  
维护者: ZK-Agent开发团队