/**
 * 零错误类型系统 - 研究任务领域模型
 * 修正所有TS2345, TS2339, TS18046等致命错误
 */

// 枚举类型系统 - 消除 "string" vs 枚举不匹配
export enum ComplexityLevel {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
  CRITICAL = 'critical'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum DomainType {
  ANALYSIS = 'analysis',
  DEVELOPMENT = 'development',
  RESEARCH = 'research',
  ARCHITECTURE = 'architecture',
  SECURITY = 'security'
}

// 修复ResearchTask接口 - 补全所有必需字段
export interface ResearchTask {
  id: string;
  title: string;
  description: string;
  complexity: ComplexityLevel;
  domain: DomainType[];
  requirements: TaskRequirement[];
  deadline: Date;
  status: TaskStatus;
  priority: TaskPriority;
  creator: {
    id: string;
    name: string;
  };
  assignedAgents: string[];
  subtasks: SubTask[];
  results: TaskResult[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    estimatedHours: number;
  };
}

// 子接口定义 - 消除never[]错误
export interface TaskRequirement {
  id: string;
  type: string;
  description: string;
  priority: TaskPriority;
  capability: string;
  parameters: Record<string, unknown>;
}

export interface SubTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedAgent?: string;
  dependencies: string[];
  estimatedTime: number;
  actualTime?: number;
}

export interface TaskResult {
  id: string;
  type: 'analysis' | 'development' | 'report' | 'recommendation';
  content: string;
  confidence: number;
  timestamp: Date;
  agentId: string;
  metadata: Record<string, unknown>;
}

// 修正测试用例数据接口
export interface TestResearchTask {
  id: string;
  title: string;
  description: string;
  complexity: ComplexityLevel;
  domain: { id: string; name: string; description: string }[];
  requirements: {
    id: string;
    type: string;
    description: string;
    priority: string;
    capability: string;
    parameters: Record<string, unknown>;
  }[];
  deadline: Date;
  status: string;
  priority: string;
  creator: { id: string; name: string };
  assignedAgents: string[];
  subtasks: SubTask[];
  results: TaskResult[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    estimatedHours: number;
  };
}

// 构建兼容类型修复器
export const TypeFixer = {
  toComplexityLevel(value: string): ComplexityLevel {
    return (Object.values(ComplexityLevel).includes(value as ComplexityLevel)) 
      ? value as ComplexityLevel 
      : ComplexityLevel.MEDIUM;
  },

  toTaskStatus(value: string): TaskStatus {
    return (Object.values(TaskStatus).includes(value as TaskStatus))
      ? value as TaskStatus
      : TaskStatus.PENDING;
  },

  toTaskPriority(value: string): TaskPriority {
    return (Object.values(TaskPriority).includes(value as TaskPriority))
      ? value as TaskPriority
      : TaskPriority.MEDIUM;
  },

  // 未知类型净化器
  purifyError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  },

  purifyUnknown<T extends object>(value: unknown, defaultValue: T): T {
    return (typeof value === 'object' && value !== null) ? value as T : defaultValue;
  }
} as const;