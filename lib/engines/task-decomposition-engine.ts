/**
 * 任务分解引擎
 * 基于多智能体研究最佳实践，实现智能任务分解算法
 * 
 * 核心功能：
 * - 复杂任务自动分解
 * - 子任务依赖关系分析
 * - 任务复杂度评估
 * - 分解策略优化
 */

import { EventEmitter } from 'events';
import { getLogger } from '@/lib/utils/logger';
import { getEnhancedDb } from '../database/enhanced-database-manager';

const logger = getLogger();

// ==================== 类型定义 ====================

export interface ComplexTask {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  constraints: TaskConstraint[];
  expectedOutput: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedComplexity: number; // 1-10 复杂度评分
  domain: string; // 任务领域：software_development, research, analysis等
  metadata?: Record<string, any>;
}

export interface SubTask {
  id: string;
  parentTaskId: string;
  title: string;
  description: string;
  type: TaskType;
  requiredCapabilities: string[];
  dependencies: string[]; // 依赖的其他子任务ID
  estimatedDuration: number; // 预估执行时间（分钟）
  priority: number; // 执行优先级 1-10
  inputSchema: any;
  outputSchema: any;
  validationCriteria: string[];
  metadata?: Record<string, any>;
}

export interface TaskConstraint {
  type: 'time' | 'resource' | 'quality' | 'dependency';
  description: string;
  value: any;
}

export interface DependencyGraph {
  nodes: SubTask[];
  edges: TaskDependency[];
  executionOrder: string[][]; // 并行执行组
  criticalPath: string[]; // 关键路径
  estimatedTotalTime: number;
}

export interface TaskDependency {
  from: string; // 前置任务ID
  to: string; // 后置任务ID
  type: 'sequential' | 'data' | 'resource';
  description: string;
}

export enum TaskType {
  ANALYSIS = 'analysis',
  RESEARCH = 'research',
  DESIGN = 'design',
  IMPLEMENTATION = 'implementation',
  TESTING = 'testing',
  REVIEW = 'review',
  DOCUMENTATION = 'documentation',
  COORDINATION = 'coordination'
}

export interface DecompositionStrategy {
  name: string;
  description: string;
  applicableDomains: string[];
  complexityRange: [number, number];
  decompose: (task: ComplexTask) => Promise<SubTask[]>;
}

// ==================== 任务分解引擎 ====================

export class TaskDecompositionEngine extends EventEmitter {
  private strategies: Map<string, DecompositionStrategy> = new Map();
  private decompositionHistory: Map<string, SubTask[]> = new Map();
  private performanceMetrics = {
    totalDecompositions: 0,
    successfulDecompositions: 0,
    averageSubTaskCount: 0,
    averageDecompositionTime: 0
  };

  constructor() {
    super();
    this.initializeStrategies();
    logger.info('TaskDecompositionEngine initialized');
  }

  /**
   * 初始化分解策略
   */
  private initializeStrategies(): void {
    // 软件开发任务分解策略
    this.registerStrategy({
      name: 'software_development',
      description: '软件开发项目任务分解策略',
      applicableDomains: ['software_development', 'web_development', 'mobile_development'],
      complexityRange: [3, 10],
      decompose: this.decomposeSoftwareDevelopmentTask.bind(this)
    });

    // 研究任务分解策略
    this.registerStrategy({
      name: 'research_analysis',
      description: '研究分析任务分解策略',
      applicableDomains: ['research', 'analysis', 'investigation'],
      complexityRange: [2, 8],
      decompose: this.decomposeResearchTask.bind(this)
    });

    // 通用任务分解策略
    this.registerStrategy({
      name: 'generic',
      description: '通用任务分解策略',
      applicableDomains: ['*'],
      complexityRange: [1, 10],
      decompose: this.decomposeGenericTask.bind(this)
    });
  }

  /**
   * 注册分解策略
   */
  public registerStrategy(strategy: DecompositionStrategy): void {
    this.strategies.set(strategy.name, strategy);
    logger.info(`Registered decomposition strategy: ${strategy.name}`);
  }

  /**
   * 主要分解方法
   */
  public async decomposeTask(task: ComplexTask): Promise<DependencyGraph> {
    const startTime = Date.now();
    
    try {
      this.emit('decomposition_started', { taskId: task.id });
      
      // 1. 选择合适的分解策略
      const strategy = this.selectStrategy(task);
      logger.info(`Selected strategy: ${strategy.name} for task: ${task.id}`);
      
      // 2. 执行任务分解
      const subTasks = await strategy.decompose(task);
      
      // 3. 分析依赖关系
      const dependencyGraph = await this.analyzeDependencies(subTasks);
      
      // 4. 优化执行顺序
      await this.optimizeExecutionOrder(dependencyGraph);
      
      // 5. 验证分解结果
      await this.validateDecomposition(task, dependencyGraph);
      
      // 6. 记录分解历史
      this.decompositionHistory.set(task.id, subTasks);
      
      // 7. 更新性能指标
      this.updateMetrics(subTasks.length, Date.now() - startTime, true);
      
      this.emit('decomposition_completed', { 
        taskId: task.id, 
        subTaskCount: subTasks.length,
        executionTime: Date.now() - startTime
      });
      
      return dependencyGraph;
      
    } catch (error) {
      this.updateMetrics(0, Date.now() - startTime, false);
      this.emit('decomposition_failed', { taskId: task.id, error });
      throw error;
    }
  }

  /**
   * 选择合适的分解策略
   */
  private selectStrategy(task: ComplexTask): DecompositionStrategy {
    // 优先选择领域特定策略
    for (const [name, strategy] of this.strategies) {
      if (strategy.applicableDomains.includes(task.domain) &&
          task.estimatedComplexity >= strategy.complexityRange[0] &&
          task.estimatedComplexity <= strategy.complexityRange[1]) {
        return strategy;
      }
    }
    
    // 回退到通用策略
    return this.strategies.get('generic')!;
  }

  /**
   * 软件开发任务分解策略
   */
  private async decomposeSoftwareDevelopmentTask(task: ComplexTask): Promise<SubTask[]> {
    const subTasks: SubTask[] = [];
    
    // 需求分析阶段
    subTasks.push({
      id: `${task.id}_requirements`,
      parentTaskId: task.id,
      title: '需求分析',
      description: '分析和整理项目需求，编写需求文档',
      type: TaskType.ANALYSIS,
      requiredCapabilities: ['requirement_analysis', 'documentation'],
      dependencies: [],
      estimatedDuration: 120,
      priority: 10,
      inputSchema: { requirements: task.requirements },
      outputSchema: { requirementDoc: 'string', userStories: 'array' },
      validationCriteria: ['需求完整性检查', '用户故事验收标准'],
      metadata: { phase: 'analysis' }
    });

    // 架构设计阶段
    subTasks.push({
      id: `${task.id}_architecture`,
      parentTaskId: task.id,
      title: '系统架构设计',
      description: '设计系统架构、技术选型、API设计',
      type: TaskType.DESIGN,
      requiredCapabilities: ['system_architecture', 'api_design', 'database_design'],
      dependencies: [`${task.id}_requirements`],
      estimatedDuration: 180,
      priority: 9,
      inputSchema: { requirementDoc: 'string' },
      outputSchema: { architectureDoc: 'string', apiSpec: 'object' },
      validationCriteria: ['架构可行性评估', 'API设计规范检查'],
      metadata: { phase: 'design' }
    });

    // 前端开发
    subTasks.push({
      id: `${task.id}_frontend`,
      parentTaskId: task.id,
      title: '前端开发',
      description: '实现用户界面和前端逻辑',
      type: TaskType.IMPLEMENTATION,
      requiredCapabilities: ['frontend_development', 'ui_design'],
      dependencies: [`${task.id}_architecture`],
      estimatedDuration: 300,
      priority: 8,
      inputSchema: { architectureDoc: 'string', apiSpec: 'object' },
      outputSchema: { frontendCode: 'string', components: 'array' },
      validationCriteria: ['UI/UX规范检查', '响应式设计验证'],
      metadata: { phase: 'implementation' }
    });

    // 后端开发
    subTasks.push({
      id: `${task.id}_backend`,
      parentTaskId: task.id,
      title: '后端开发',
      description: '实现后端API和业务逻辑',
      type: TaskType.IMPLEMENTATION,
      requiredCapabilities: ['backend_development', 'database_management'],
      dependencies: [`${task.id}_architecture`],
      estimatedDuration: 360,
      priority: 8,
      inputSchema: { architectureDoc: 'string', apiSpec: 'object' },
      outputSchema: { backendCode: 'string', apiEndpoints: 'array' },
      validationCriteria: ['API功能测试', '数据库设计验证'],
      metadata: { phase: 'implementation' }
    });

    // 集成测试
    subTasks.push({
      id: `${task.id}_integration`,
      parentTaskId: task.id,
      title: '系统集成测试',
      description: '前后端集成测试和端到端测试',
      type: TaskType.TESTING,
      requiredCapabilities: ['integration_testing', 'e2e_testing'],
      dependencies: [`${task.id}_frontend`, `${task.id}_backend`],
      estimatedDuration: 180,
      priority: 7,
      inputSchema: { frontendCode: 'string', backendCode: 'string' },
      outputSchema: { testResults: 'object', bugReports: 'array' },
      validationCriteria: ['测试覆盖率达标', '关键功能验证通过'],
      metadata: { phase: 'testing' }
    });

    // 部署和文档
    subTasks.push({
      id: `${task.id}_deployment`,
      parentTaskId: task.id,
      title: '部署和文档编写',
      description: '系统部署和用户文档编写',
      type: TaskType.DOCUMENTATION,
      requiredCapabilities: ['deployment', 'technical_writing'],
      dependencies: [`${task.id}_integration`],
      estimatedDuration: 120,
      priority: 6,
      inputSchema: { testResults: 'object' },
      outputSchema: { deploymentGuide: 'string', userManual: 'string' },
      validationCriteria: ['部署成功验证', '文档完整性检查'],
      metadata: { phase: 'deployment' }
    });

    return subTasks;
  }

  /**
   * 研究任务分解策略
   */
  private async decomposeResearchTask(task: ComplexTask): Promise<SubTask[]> {
    const subTasks: SubTask[] = [];
    
    // 文献调研
    subTasks.push({
      id: `${task.id}_literature`,
      parentTaskId: task.id,
      title: '文献调研',
      description: '收集和分析相关文献资料',
      type: TaskType.RESEARCH,
      requiredCapabilities: ['literature_search', 'academic_analysis'],
      dependencies: [],
      estimatedDuration: 240,
      priority: 10,
      inputSchema: { researchTopic: 'string', keywords: 'array' },
      outputSchema: { literatureReview: 'string', references: 'array' },
      validationCriteria: ['文献质量评估', '覆盖面完整性'],
      metadata: { phase: 'research' }
    });

    // 数据收集
    subTasks.push({
      id: `${task.id}_data_collection`,
      parentTaskId: task.id,
      title: '数据收集',
      description: '收集研究所需的数据和资料',
      type: TaskType.RESEARCH,
      requiredCapabilities: ['data_collection', 'survey_design'],
      dependencies: [`${task.id}_literature`],
      estimatedDuration: 180,
      priority: 9,
      inputSchema: { literatureReview: 'string' },
      outputSchema: { rawData: 'object', dataDescription: 'string' },
      validationCriteria: ['数据质量检查', '样本量充足性'],
      metadata: { phase: 'collection' }
    });

    // 数据分析
    subTasks.push({
      id: `${task.id}_analysis`,
      parentTaskId: task.id,
      title: '数据分析',
      description: '对收集的数据进行统计分析',
      type: TaskType.ANALYSIS,
      requiredCapabilities: ['statistical_analysis', 'data_visualization'],
      dependencies: [`${task.id}_data_collection`],
      estimatedDuration: 300,
      priority: 8,
      inputSchema: { rawData: 'object' },
      outputSchema: { analysisResults: 'object', charts: 'array' },
      validationCriteria: ['统计显著性检验', '结果可重现性'],
      metadata: { phase: 'analysis' }
    });

    // 报告撰写
    subTasks.push({
      id: `${task.id}_report`,
      parentTaskId: task.id,
      title: '研究报告撰写',
      description: '撰写完整的研究报告',
      type: TaskType.DOCUMENTATION,
      requiredCapabilities: ['academic_writing', 'report_generation'],
      dependencies: [`${task.id}_analysis`],
      estimatedDuration: 240,
      priority: 7,
      inputSchema: { analysisResults: 'object', literatureReview: 'string' },
      outputSchema: { researchReport: 'string', executive_summary: 'string' },
      validationCriteria: ['学术规范检查', '逻辑结构完整性'],
      metadata: { phase: 'documentation' }
    });

    return subTasks;
  }

  /**
   * 通用任务分解策略
   */
  private async decomposeGenericTask(task: ComplexTask): Promise<SubTask[]> {
    const subTasks: SubTask[] = [];
    
    // 基于任务描述和需求进行通用分解
    const phases = this.identifyGenericPhases(task);
    
    phases.forEach((phase, index) => {
      subTasks.push({
        id: `${task.id}_phase_${index + 1}`,
        parentTaskId: task.id,
        title: phase.title,
        description: phase.description,
        type: phase.type,
        requiredCapabilities: phase.capabilities,
        dependencies: index > 0 ? [`${task.id}_phase_${index}`] : [],
        estimatedDuration: phase.estimatedDuration,
        priority: 10 - index,
        inputSchema: phase.inputSchema,
        outputSchema: phase.outputSchema,
        validationCriteria: phase.validationCriteria,
        metadata: { phase: `phase_${index + 1}` }
      });
    });

    return subTasks;
  }

  /**
   * 识别通用任务阶段
   */
  private identifyGenericPhases(task: ComplexTask): any[] {
    // 基于任务复杂度和描述识别阶段
    const phases = [];
    
    // 规划阶段
    phases.push({
      title: '任务规划',
      description: '分析任务需求，制定执行计划',
      type: TaskType.ANALYSIS,
      capabilities: ['planning', 'analysis'],
      estimatedDuration: 60,
      inputSchema: { requirements: 'array' },
      outputSchema: { plan: 'string' },
      validationCriteria: ['计划可行性检查']
    });
    
    // 执行阶段
    phases.push({
      title: '任务执行',
      description: '按照计划执行具体任务',
      type: TaskType.IMPLEMENTATION,
      capabilities: ['execution', 'problem_solving'],
      estimatedDuration: Math.max(120, task.estimatedComplexity * 30),
      inputSchema: { plan: 'string' },
      outputSchema: { result: 'object' },
      validationCriteria: ['执行质量检查']
    });
    
    // 验证阶段
    phases.push({
      title: '结果验证',
      description: '验证任务执行结果',
      type: TaskType.REVIEW,
      capabilities: ['validation', 'quality_assurance'],
      estimatedDuration: 45,
      inputSchema: { result: 'object' },
      outputSchema: { validatedResult: 'object' },
      validationCriteria: ['结果准确性验证']
    });
    
    return phases;
  }

  /**
   * 分析依赖关系
   */
  public async analyzeDependencies(subTasks: SubTask[]): Promise<DependencyGraph> {
    const nodes = subTasks;
    const edges: TaskDependency[] = [];
    
    // 构建依赖边
    subTasks.forEach(task => {
      task.dependencies.forEach(depId => {
        edges.push({
          from: depId,
          to: task.id,
          type: 'sequential',
          description: `${depId} must complete before ${task.id}`
        });
      });
    });
    
    // 计算执行顺序
    const executionOrder = this.calculateExecutionOrder(subTasks, edges);
    
    // 计算关键路径
    const criticalPath = this.calculateCriticalPath(subTasks, edges);
    
    // 计算总执行时间
    const estimatedTotalTime = this.calculateTotalTime(subTasks, executionOrder);
    
    return {
      nodes,
      edges,
      executionOrder,
      criticalPath,
      estimatedTotalTime
    };
  }

  /**
   * 计算执行顺序
   */
  private calculateExecutionOrder(subTasks: SubTask[], edges: TaskDependency[]): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const remaining = new Set(subTasks.map(t => t.id));
    
    while (remaining.size > 0) {
      const currentLevel: string[] = [];
      
      // 找到当前可以执行的任务（所有依赖都已完成）
      for (const taskId of remaining) {
        const task = subTasks.find(t => t.id === taskId)!;
        const canExecute = task.dependencies.every(depId => completed.has(depId));
        
        if (canExecute) {
          currentLevel.push(taskId);
        }
      }
      
      if (currentLevel.length === 0) {
        throw new Error('Circular dependency detected in task graph');
      }
      
      // 按优先级排序
      currentLevel.sort((a, b) => {
        const taskA = subTasks.find(t => t.id === a)!;
        const taskB = subTasks.find(t => t.id === b)!;
        return taskB.priority - taskA.priority;
      });
      
      order.push(currentLevel);
      
      // 标记为已完成
      currentLevel.forEach(taskId => {
        completed.add(taskId);
        remaining.delete(taskId);
      });
    }
    
    return order;
  }

  /**
   * 计算关键路径
   */
  private calculateCriticalPath(subTasks: SubTask[], edges: TaskDependency[]): string[] {
    // 使用拓扑排序和最长路径算法计算关键路径
    const distances = new Map<string, number>();
    const predecessors = new Map<string, string>();
    
    // 初始化距离
    subTasks.forEach(task => {
      distances.set(task.id, task.dependencies.length === 0 ? task.estimatedDuration : 0);
    });
    
    // 计算最长路径
    const sorted = this.topologicalSort(subTasks, edges);
    
    sorted.forEach(taskId => {
      const task = subTasks.find(t => t.id === taskId)!;
      const currentDistance = distances.get(taskId) || 0;
      
      // 更新后继任务的距离
      edges.filter(e => e.from === taskId).forEach(edge => {
        const successor = subTasks.find(t => t.id === edge.to)!;
        const newDistance = currentDistance + successor.estimatedDuration;
        
        if (newDistance > (distances.get(edge.to) || 0)) {
          distances.set(edge.to, newDistance);
          predecessors.set(edge.to, taskId);
        }
      });
    });
    
    // 回溯构建关键路径
    const criticalPath: string[] = [];
    let maxDistance = 0;
    let endTask = '';
    
    // 找到最长路径的终点
    distances.forEach((distance, taskId) => {
      if (distance > maxDistance) {
        maxDistance = distance;
        endTask = taskId;
      }
    });
    
    // 回溯路径
    let current = endTask;
    while (current) {
      criticalPath.unshift(current);
      current = predecessors.get(current) || '';
    }
    
    return criticalPath;
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(subTasks: SubTask[], edges: TaskDependency[]): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    
    // 初始化
    subTasks.forEach(task => {
      inDegree.set(task.id, 0);
      adjList.set(task.id, []);
    });
    
    // 构建邻接表和入度
    edges.forEach(edge => {
      adjList.get(edge.from)!.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    });
    
    // Kahn算法
    const queue: string[] = [];
    const result: string[] = [];
    
    // 找到所有入度为0的节点
    inDegree.forEach((degree, taskId) => {
      if (degree === 0) {
        queue.push(taskId);
      }
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      // 更新邻接节点的入度
      adjList.get(current)!.forEach(neighbor => {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    return result;
  }

  /**
   * 计算总执行时间
   */
  private calculateTotalTime(subTasks: SubTask[], executionOrder: string[][]): number {
    let totalTime = 0;
    
    executionOrder.forEach(level => {
      // 并行执行的任务取最长时间
      const levelTime = Math.max(...level.map(taskId => {
        const task = subTasks.find(t => t.id === taskId)!;
        return task.estimatedDuration;
      }));
      
      totalTime += levelTime;
    });
    
    return totalTime;
  }

  /**
   * 优化执行顺序
   */
  private async optimizeExecutionOrder(dependencyGraph: DependencyGraph): Promise<void> {
    // 基于资源约束和优先级优化执行顺序
    // 这里可以实现更复杂的优化算法
    
    // 简单的优化：在每个并行级别内按优先级重新排序
    dependencyGraph.executionOrder.forEach(level => {
      level.sort((a, b) => {
        const taskA = dependencyGraph.nodes.find(t => t.id === a)!;
        const taskB = dependencyGraph.nodes.find(t => t.id === b)!;
        return taskB.priority - taskA.priority;
      });
    });
  }

  /**
   * 验证分解结果
   */
  private async validateDecomposition(originalTask: ComplexTask, dependencyGraph: DependencyGraph): Promise<void> {
    const subTasks = dependencyGraph.nodes;
    
    // 验证子任务覆盖原始任务的所有需求
    const coverage = this.calculateRequirementCoverage(originalTask, subTasks);
    if (coverage < 0.8) {
      throw new Error(`Task decomposition coverage too low: ${coverage}`);
    }
    
    // 验证依赖关系的合理性
    if (this.hasCircularDependencies(dependencyGraph.edges)) {
      throw new Error('Circular dependencies detected in task decomposition');
    }
    
    // 验证时间估算的合理性
    if (dependencyGraph.estimatedTotalTime > originalTask.estimatedComplexity * 120) {
      logger.warn(`Decomposed task time (${dependencyGraph.estimatedTotalTime}min) exceeds expected complexity`);
    }
    
    logger.info(`Task decomposition validated successfully for task: ${originalTask.id}`);
  }

  /**
   * 计算需求覆盖率
   */
  private calculateRequirementCoverage(originalTask: ComplexTask, subTasks: SubTask[]): number {
    // 简化的覆盖率计算
    // 实际实现中可以使用更复杂的NLP技术
    const originalRequirements = originalTask.requirements.join(' ').toLowerCase();
    const subTaskDescriptions = subTasks.map(t => t.description).join(' ').toLowerCase();
    
    const originalWords = new Set(originalRequirements.split(/\s+/));
    const subTaskWords = new Set(subTaskDescriptions.split(/\s+/));
    
    const intersection = new Set([...originalWords].filter(word => subTaskWords.has(word)));
    
    return intersection.size / originalWords.size;
  }

  /**
   * 检查循环依赖
   */
  private hasCircularDependencies(edges: TaskDependency[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjList = new Map<string, string[]>();
    
    // 构建邻接表
    edges.forEach(edge => {
      if (!adjList.has(edge.from)) {
        adjList.set(edge.from, []);
      }
      adjList.get(edge.from)!.push(edge.to);
    });
    
    // DFS检查循环
    const dfs = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = adjList.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    // 检查所有节点
    for (const [node] of adjList) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }
    
    return false;
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(subTaskCount: number, decompositionTime: number, success: boolean): void {
    this.performanceMetrics.totalDecompositions++;
    
    if (success) {
      this.performanceMetrics.successfulDecompositions++;
      
      // 更新平均子任务数量
      const totalSubTasks = this.performanceMetrics.averageSubTaskCount * 
        (this.performanceMetrics.successfulDecompositions - 1) + subTaskCount;
      this.performanceMetrics.averageSubTaskCount = 
        totalSubTasks / this.performanceMetrics.successfulDecompositions;
      
      // 更新平均分解时间
      const totalTime = this.performanceMetrics.averageDecompositionTime * 
        (this.performanceMetrics.successfulDecompositions - 1) + decompositionTime;
      this.performanceMetrics.averageDecompositionTime = 
        totalTime / this.performanceMetrics.successfulDecompositions;
    }
  }

  /**
   * 获取性能指标
   */
  public getMetrics() {
    return {
      ...this.performanceMetrics,
      successRate: this.performanceMetrics.totalDecompositions > 0 ? 
        this.performanceMetrics.successfulDecompositions / this.performanceMetrics.totalDecompositions : 0
    };
  }

  /**
   * 获取分解历史
   */
  public getDecompositionHistory(taskId?: string): Map<string, SubTask[]> | SubTask[] | undefined {
    if (taskId) {
      return this.decompositionHistory.get(taskId);
    }
    return this.decompositionHistory;
  }

  /**
   * 清理历史记录
   */
  public clearHistory(): void {
    this.decompositionHistory.clear();
    logger.info('Task decomposition history cleared');
  }
}

export default TaskDecompositionEngine;