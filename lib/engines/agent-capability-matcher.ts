/**
 * 智能体能力匹配系统
 * 基于多智能体研究最佳实践，实现智能体与任务的最优匹配
 * 
 * 核心功能：
 * - 智能体能力评估
 * - 任务需求分析
 * - 最优匹配算法
 * - 性能预测
 * - 负载均衡
 */

import { EventEmitter } from 'events';
import { getLogger } from '@/lib/utils/logger';
import { SubTask } from './task-decomposition-engine';

const logger = getLogger();

// ==================== 类型定义 ====================

export interface AgentCapability {
  name: string;
  category: string; // 'technical', 'analytical', 'creative', 'coordination'
  level: number; // 1-10 能力等级
  experience: number; // 经验值
  specializations: string[]; // 专业领域
  tools: string[]; // 可用工具
  languages: string[]; // 支持的编程语言或自然语言
  certifications: string[]; // 认证或资质
  metadata?: Record<string, any>;
}

export interface AgentProfile {
  id: string;
  name: string;
  type: string; // 'specialist', 'generalist', 'coordinator'
  status: 'available' | 'busy' | 'offline' | 'maintenance';
  capabilities: AgentCapability[];
  performance: AgentPerformance;
  preferences: AgentPreferences;
  constraints: AgentConstraint[];
  currentLoad: number; // 0-100 当前负载百分比
  maxConcurrentTasks: number;
  averageTaskTime: number; // 平均任务完成时间（分钟）
  reliability: number; // 0-1 可靠性评分
  metadata?: Record<string, any>;
}

export interface AgentPerformance {
  tasksCompleted: number;
  successRate: number; // 0-1
  averageQuality: number; // 0-10
  averageSpeed: number; // 任务/小时
  userSatisfaction: number; // 0-10
  collaborationScore: number; // 0-10 协作能力评分
  learningRate: number; // 0-1 学习能力
  adaptability: number; // 0-1 适应性
  recentPerformance: PerformanceMetric[]; // 最近的性能记录
}

export interface PerformanceMetric {
  timestamp: Date;
  taskId: string;
  taskType: string;
  duration: number;
  quality: number;
  success: boolean;
  feedback?: string;
}

export interface AgentPreferences {
  preferredTaskTypes: string[];
  preferredWorkingHours: TimeRange[];
  preferredTeamSize: number;
  preferredComplexity: [number, number]; // min, max
  avoidTaskTypes: string[];
  collaborationStyle: 'independent' | 'collaborative' | 'supportive';
}

export interface TimeRange {
  start: string; // HH:MM
  end: string; // HH:MM
  timezone: string;
}

export interface AgentConstraint {
  type: 'time' | 'resource' | 'skill' | 'location' | 'security';
  description: string;
  value: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskRequirement {
  requiredCapabilities: string[];
  preferredCapabilities: string[];
  minimumLevel: number;
  estimatedDuration: number;
  complexity: number;
  priority: number;
  deadline?: Date;
  teamSize?: number;
  collaborationNeeded: boolean;
  securityLevel: 'public' | 'internal' | 'confidential' | 'secret';
}

export interface MatchResult {
  agent: AgentProfile;
  task: SubTask;
  score: number; // 0-100 匹配分数
  confidence: number; // 0-1 置信度
  reasoning: MatchReasoning;
  predictedPerformance: PredictedPerformance;
  risks: Risk[];
  alternatives: AlternativeMatch[];
}

export interface MatchReasoning {
  capabilityMatch: number; // 能力匹配度
  experienceMatch: number; // 经验匹配度
  availabilityMatch: number; // 可用性匹配度
  performanceMatch: number; // 性能匹配度
  preferenceMatch: number; // 偏好匹配度
  loadBalanceScore: number; // 负载均衡分数
  collaborationFit: number; // 协作适配度
  details: string[];
}

export interface PredictedPerformance {
  estimatedDuration: number;
  estimatedQuality: number;
  successProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidenceInterval: [number, number];
}

export interface Risk {
  type: 'capability' | 'availability' | 'performance' | 'collaboration';
  description: string;
  probability: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface AlternativeMatch {
  agent: AgentProfile;
  score: number;
  reason: string;
}

export interface MatchingStrategy {
  name: string;
  description: string;
  weight: number;
  calculate: (agent: AgentProfile, task: SubTask, requirement: TaskRequirement) => number;
}

// ==================== 智能体能力匹配器 ====================

export class AgentCapabilityMatcher extends EventEmitter {
  private agents: Map<string, AgentProfile> = new Map();
  private strategies: Map<string, MatchingStrategy> = new Map();
  private matchHistory: MatchResult[] = [];
  private performanceCache: Map<string, any> = new Map();
  
  private matchingWeights = {
    capability: 0.3,
    experience: 0.2,
    availability: 0.15,
    performance: 0.15,
    preference: 0.1,
    loadBalance: 0.1
  };

  constructor() {
    super();
    this.initializeStrategies();
    logger.info('AgentCapabilityMatcher initialized');
  }

  /**
   * 初始化匹配策略
   */
  private initializeStrategies(): void {
    // 能力匹配策略
    this.registerStrategy({
      name: 'capability_match',
      description: '基于能力匹配度的评分策略',
      weight: this.matchingWeights.capability,
      calculate: this.calculateCapabilityMatch.bind(this)
    });

    // 经验匹配策略
    this.registerStrategy({
      name: 'experience_match',
      description: '基于经验匹配度的评分策略',
      weight: this.matchingWeights.experience,
      calculate: this.calculateExperienceMatch.bind(this)
    });

    // 可用性匹配策略
    this.registerStrategy({
      name: 'availability_match',
      description: '基于可用性的评分策略',
      weight: this.matchingWeights.availability,
      calculate: this.calculateAvailabilityMatch.bind(this)
    });

    // 性能匹配策略
    this.registerStrategy({
      name: 'performance_match',
      description: '基于历史性能的评分策略',
      weight: this.matchingWeights.performance,
      calculate: this.calculatePerformanceMatch.bind(this)
    });

    // 偏好匹配策略
    this.registerStrategy({
      name: 'preference_match',
      description: '基于智能体偏好的评分策略',
      weight: this.matchingWeights.preference,
      calculate: this.calculatePreferenceMatch.bind(this)
    });

    // 负载均衡策略
    this.registerStrategy({
      name: 'load_balance',
      description: '负载均衡评分策略',
      weight: this.matchingWeights.loadBalance,
      calculate: this.calculateLoadBalanceScore.bind(this)
    });
  }

  /**
   * 注册匹配策略
   */
  public registerStrategy(strategy: MatchingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    logger.info(`Registered matching strategy: ${strategy.name}`);
  }

  /**
   * 注册智能体
   */
  public registerAgent(agent: AgentProfile): void {
    this.agents.set(agent.id, agent);
    this.emit('agent_registered', { agentId: agent.id });
    logger.info(`Registered agent: ${agent.id} (${agent.name})`);
  }

  /**
   * 更新智能体状态
   */
  public updateAgentStatus(agentId: string, status: AgentProfile['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.emit('agent_status_updated', { agentId, status });
      logger.info(`Updated agent ${agentId} status to ${status}`);
    }
  }

  /**
   * 更新智能体负载
   */
  public updateAgentLoad(agentId: string, load: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.currentLoad = Math.max(0, Math.min(100, load));
      this.emit('agent_load_updated', { agentId, load });
    }
  }

  /**
   * 主要匹配方法
   */
  public async findBestMatch(
    task: SubTask, 
    requirement: TaskRequirement,
    options: {
      maxCandidates?: number;
      includeAlternatives?: boolean;
      excludeAgents?: string[];
    } = {}
  ): Promise<MatchResult | null> {
    const { maxCandidates = 5, includeAlternatives = true, excludeAgents = [] } = options;
    
    try {
      this.emit('matching_started', { taskId: task.id });
      
      // 1. 筛选可用智能体
      const availableAgents = this.filterAvailableAgents(excludeAgents);
      
      if (availableAgents.length === 0) {
        logger.warn(`No available agents for task: ${task.id}`);
        return null;
      }
      
      // 2. 计算匹配分数
      const matches = await Promise.all(
        availableAgents.map(agent => this.calculateMatch(agent, task, requirement))
      );
      
      // 3. 排序并选择最佳匹配
      matches.sort((a, b) => b.score - a.score);
      
      const bestMatch = matches[0];
      
      // 4. 添加备选方案
      if (includeAlternatives) {
        bestMatch.alternatives = matches
          .slice(1, maxCandidates)
          .map(match => ({
            agent: match.agent,
            score: match.score,
            reason: this.generateAlternativeReason(match)
          }));
      }
      
      // 5. 记录匹配历史
      this.matchHistory.push(bestMatch);
      
      this.emit('matching_completed', { 
        taskId: task.id, 
        agentId: bestMatch.agent.id,
        score: bestMatch.score
      });
      
      return bestMatch;
      
    } catch (error) {
      this.emit('matching_failed', { taskId: task.id, error });
      throw error;
    }
  }

  /**
   * 批量匹配多个任务
   */
  public async findBestMatches(
    tasks: SubTask[],
    requirements: TaskRequirement[],
    options: {
      optimizeGlobal?: boolean;
      maxIterations?: number;
    } = {}
  ): Promise<Map<string, MatchResult>> {
    const { optimizeGlobal = true, maxIterations = 100 } = options;
    const results = new Map<string, MatchResult>();
    
    if (tasks.length !== requirements.length) {
      throw new Error('Tasks and requirements arrays must have the same length');
    }
    
    if (!optimizeGlobal) {
      // 简单的逐个匹配
      for (let i = 0; i < tasks.length; i++) {
        const match = await this.findBestMatch(tasks[i], requirements[i]);
        if (match) {
          results.set(tasks[i].id, match);
          // 临时更新智能体负载
          this.updateAgentLoad(match.agent.id, match.agent.currentLoad + 20);
        }
      }
    } else {
      // 全局优化匹配
      const optimizedMatches = await this.optimizeGlobalMatching(tasks, requirements, maxIterations);
      optimizedMatches.forEach((match, taskId) => {
        results.set(taskId, match);
      });
    }
    
    return results;
  }

  /**
   * 筛选可用智能体
   */
  private filterAvailableAgents(excludeAgents: string[]): AgentProfile[] {
    return Array.from(this.agents.values()).filter(agent => {
      return agent.status === 'available' &&
             agent.currentLoad < 90 &&
             !excludeAgents.includes(agent.id);
    });
  }

  /**
   * 计算匹配结果
   */
  private async calculateMatch(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): Promise<MatchResult> {
    const reasoning: MatchReasoning = {
      capabilityMatch: 0,
      experienceMatch: 0,
      availabilityMatch: 0,
      performanceMatch: 0,
      preferenceMatch: 0,
      loadBalanceScore: 0,
      collaborationFit: 0,
      details: []
    };
    
    let totalScore = 0;
    
    // 计算各个维度的匹配分数
    for (const [name, strategy] of this.strategies) {
      const score = strategy.calculate(agent, task, requirement);
      const weightedScore = score * strategy.weight;
      totalScore += weightedScore;
      
      // 记录到reasoning中
      switch (name) {
        case 'capability_match':
          reasoning.capabilityMatch = score;
          break;
        case 'experience_match':
          reasoning.experienceMatch = score;
          break;
        case 'availability_match':
          reasoning.availabilityMatch = score;
          break;
        case 'performance_match':
          reasoning.performanceMatch = score;
          break;
        case 'preference_match':
          reasoning.preferenceMatch = score;
          break;
        case 'load_balance':
          reasoning.loadBalanceScore = score;
          break;
      }
      
      reasoning.details.push(`${name}: ${score.toFixed(2)} (weighted: ${weightedScore.toFixed(2)})`);
    }
    
    // 计算协作适配度
    reasoning.collaborationFit = this.calculateCollaborationFit(agent, task);
    
    // 预测性能
    const predictedPerformance = this.predictPerformance(agent, task, requirement);
    
    // 识别风险
    const risks = this.identifyRisks(agent, task, requirement, reasoning);
    
    // 计算置信度
    const confidence = this.calculateConfidence(agent, reasoning, risks);
    
    return {
      agent,
      task,
      score: Math.min(100, Math.max(0, totalScore)),
      confidence,
      reasoning,
      predictedPerformance,
      risks,
      alternatives: []
    };
  }

  /**
   * 能力匹配计算
   */
  private calculateCapabilityMatch(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): number {
    const agentCapabilities = new Set(agent.capabilities.map(c => c.name));
    const requiredCapabilities = new Set(requirement.requiredCapabilities);
    const preferredCapabilities = new Set(requirement.preferredCapabilities);
    
    // 必需能力匹配度
    const requiredMatches = [...requiredCapabilities].filter(cap => agentCapabilities.has(cap));
    const requiredMatchRatio = requiredMatches.length / requiredCapabilities.size;
    
    // 偏好能力匹配度
    const preferredMatches = [...preferredCapabilities].filter(cap => agentCapabilities.has(cap));
    const preferredMatchRatio = preferredCapabilities.size > 0 ? 
      preferredMatches.length / preferredCapabilities.size : 1;
    
    // 能力等级匹配
    const relevantCapabilities = agent.capabilities.filter(c => 
      requiredCapabilities.has(c.name) || preferredCapabilities.has(c.name)
    );
    
    const averageLevel = relevantCapabilities.length > 0 ?
      relevantCapabilities.reduce((sum, cap) => sum + cap.level, 0) / relevantCapabilities.length : 0;
    
    const levelMatch = Math.min(1, averageLevel / requirement.minimumLevel);
    
    // 综合评分
    return (requiredMatchRatio * 0.6 + preferredMatchRatio * 0.2 + levelMatch * 0.2) * 100;
  }

  /**
   * 经验匹配计算
   */
  private calculateExperienceMatch(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): number {
    // 相关任务类型经验
    const taskTypeExperience = agent.performance.recentPerformance
      .filter(p => p.taskType === task.type)
      .length;
    
    // 复杂度经验
    const complexityExperience = agent.performance.recentPerformance
      .filter(p => Math.abs(requirement.complexity - 5) <= 2) // 假设复杂度在1-10范围
      .length;
    
    // 总体经验
    const totalExperience = agent.performance.tasksCompleted;
    
    // 经验评分
    const taskTypeScore = Math.min(1, taskTypeExperience / 10) * 40;
    const complexityScore = Math.min(1, complexityExperience / 5) * 30;
    const totalScore = Math.min(1, totalExperience / 100) * 30;
    
    return taskTypeScore + complexityScore + totalScore;
  }

  /**
   * 可用性匹配计算
   */
  private calculateAvailabilityMatch(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): number {
    // 当前负载评分
    const loadScore = (100 - agent.currentLoad) / 100 * 50;
    
    // 并发能力评分
    const concurrencyScore = agent.maxConcurrentTasks > 1 ? 25 : 0;
    
    // 时间匹配评分（如果有截止时间）
    let timeScore = 25;
    if (requirement.deadline) {
      const now = new Date();
      const timeAvailable = requirement.deadline.getTime() - now.getTime();
      const timeNeeded = requirement.estimatedDuration * 60 * 1000; // 转换为毫秒
      
      if (timeAvailable >= timeNeeded * 2) {
        timeScore = 25;
      } else if (timeAvailable >= timeNeeded) {
        timeScore = 15;
      } else {
        timeScore = 0;
      }
    }
    
    return loadScore + concurrencyScore + timeScore;
  }

  /**
   * 性能匹配计算
   */
  private calculatePerformanceMatch(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): number {
    const performance = agent.performance;
    
    // 成功率评分
    const successScore = performance.successRate * 30;
    
    // 质量评分
    const qualityScore = (performance.averageQuality / 10) * 25;
    
    // 速度评分
    const speedScore = Math.min(1, performance.averageSpeed / 2) * 20;
    
    // 可靠性评分
    const reliabilityScore = agent.reliability * 25;
    
    return successScore + qualityScore + speedScore + reliabilityScore;
  }

  /**
   * 偏好匹配计算
   */
  private calculatePreferenceMatch(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): number {
    const preferences = agent.preferences;
    
    // 任务类型偏好
    const typePreference = preferences.preferredTaskTypes.includes(task.type) ? 40 : 0;
    
    // 复杂度偏好
    const complexityInRange = requirement.complexity >= preferences.preferredComplexity[0] &&
                             requirement.complexity <= preferences.preferredComplexity[1];
    const complexityPreference = complexityInRange ? 30 : 0;
    
    // 避免类型检查
    const avoidanceDeduction = preferences.avoidTaskTypes.includes(task.type) ? -50 : 0;
    
    // 协作偏好
    const collaborationPreference = requirement.collaborationNeeded ?
      (preferences.collaborationStyle === 'collaborative' ? 30 : 10) :
      (preferences.collaborationStyle === 'independent' ? 30 : 20);
    
    return Math.max(0, typePreference + complexityPreference + collaborationPreference + avoidanceDeduction);
  }

  /**
   * 负载均衡评分计算
   */
  private calculateLoadBalanceScore(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): number {
    // 当前负载越低，分数越高
    const loadScore = (100 - agent.currentLoad) / 100 * 60;
    
    // 考虑团队整体负载均衡
    const teamLoadBalance = this.calculateTeamLoadBalance(agent);
    
    return loadScore + teamLoadBalance;
  }

  /**
   * 计算团队负载均衡
   */
  private calculateTeamLoadBalance(agent: AgentProfile): number {
    const allAgents = Array.from(this.agents.values());
    const averageLoad = allAgents.reduce((sum, a) => sum + a.currentLoad, 0) / allAgents.length;
    
    // 如果智能体负载低于平均值，给予奖励
    if (agent.currentLoad < averageLoad) {
      return Math.min(40, (averageLoad - agent.currentLoad) / 2);
    }
    
    return 0;
  }

  /**
   * 计算协作适配度
   */
  private calculateCollaborationFit(agent: AgentProfile, task: SubTask): number {
    // 基于智能体的协作评分和任务的协作需求
    const collaborationScore = agent.performance.collaborationScore / 10;
    
    // 如果任务需要协作
    if (task.dependencies.length > 0) {
      return collaborationScore * 100;
    }
    
    // 独立任务也需要一定的协作能力（用于沟通和汇报）
    return collaborationScore * 60;
  }

  /**
   * 预测性能
   */
  private predictPerformance(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement
  ): PredictedPerformance {
    const performance = agent.performance;
    
    // 基于历史数据预测执行时间
    const baseTime = requirement.estimatedDuration;
    const speedFactor = Math.max(0.5, Math.min(2, 2 - performance.averageSpeed / 2));
    const estimatedDuration = baseTime * speedFactor;
    
    // 预测质量
    const estimatedQuality = Math.min(10, performance.averageQuality * 
      (1 + (performance.learningRate - 0.5) * 0.2));
    
    // 成功概率
    const successProbability = Math.min(0.95, performance.successRate * 
      (1 + (performance.reliability - 0.5) * 0.1));
    
    // 风险等级
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (successProbability < 0.7 || performance.averageQuality < 6) {
      riskLevel = 'high';
    } else if (successProbability < 0.85 || performance.averageQuality < 8) {
      riskLevel = 'medium';
    }
    
    // 置信区间
    const variance = 1 - performance.reliability;
    const confidenceInterval: [number, number] = [
      estimatedDuration * (1 - variance * 0.3),
      estimatedDuration * (1 + variance * 0.5)
    ];
    
    return {
      estimatedDuration,
      estimatedQuality,
      successProbability,
      riskLevel,
      confidenceInterval
    };
  }

  /**
   * 识别风险
   */
  private identifyRisks(
    agent: AgentProfile, 
    task: SubTask, 
    requirement: TaskRequirement,
    reasoning: MatchReasoning
  ): Risk[] {
    const risks: Risk[] = [];
    
    // 能力风险
    if (reasoning.capabilityMatch < 70) {
      risks.push({
        type: 'capability',
        description: '智能体能力与任务需求匹配度较低',
        probability: (70 - reasoning.capabilityMatch) / 70,
        impact: 'high',
        mitigation: '提供额外培训或分配辅助智能体'
      });
    }
    
    // 可用性风险
    if (agent.currentLoad > 70) {
      risks.push({
        type: 'availability',
        description: '智能体当前负载较高，可能影响任务执行',
        probability: agent.currentLoad / 100,
        impact: 'medium',
        mitigation: '调整任务优先级或分配给其他智能体'
      });
    }
    
    // 性能风险
    if (agent.performance.successRate < 0.8) {
      risks.push({
        type: 'performance',
        description: '智能体历史成功率较低',
        probability: 1 - agent.performance.successRate,
        impact: 'high',
        mitigation: '增加监控和中间检查点'
      });
    }
    
    // 协作风险
    if (task.dependencies.length > 0 && agent.performance.collaborationScore < 6) {
      risks.push({
        type: 'collaboration',
        description: '任务需要协作但智能体协作能力较弱',
        probability: (6 - agent.performance.collaborationScore) / 6,
        impact: 'medium',
        mitigation: '指派协作能力强的智能体作为协调者'
      });
    }
    
    return risks;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    agent: AgentProfile, 
    reasoning: MatchReasoning, 
    risks: Risk[]
  ): number {
    // 基础置信度基于匹配分数
    const baseConfidence = (reasoning.capabilityMatch + reasoning.experienceMatch + 
                           reasoning.performanceMatch) / 300;
    
    // 风险调整
    const riskPenalty = risks.reduce((penalty, risk) => {
      const riskScore = risk.probability * (risk.impact === 'critical' ? 0.4 : 
                                           risk.impact === 'high' ? 0.3 : 
                                           risk.impact === 'medium' ? 0.2 : 0.1);
      return penalty + riskScore;
    }, 0);
    
    // 可靠性调整
    const reliabilityBonus = agent.reliability * 0.2;
    
    return Math.max(0.1, Math.min(1, baseConfidence - riskPenalty + reliabilityBonus));
  }

  /**
   * 生成备选方案原因
   */
  private generateAlternativeReason(match: MatchResult): string {
    const reasoning = match.reasoning;
    
    if (reasoning.capabilityMatch > 80) {
      return '能力匹配度高，可作为主要候选';
    } else if (reasoning.availabilityMatch > 80) {
      return '可用性好，可快速响应';
    } else if (reasoning.performanceMatch > 80) {
      return '历史性能优秀，执行质量有保障';
    } else if (reasoning.loadBalanceScore > 80) {
      return '负载较低，有充足资源处理任务';
    } else {
      return '综合评分良好，可作为备选方案';
    }
  }

  /**
   * 全局优化匹配
   */
  private async optimizeGlobalMatching(
    tasks: SubTask[],
    requirements: TaskRequirement[],
    maxIterations: number
  ): Promise<Map<string, MatchResult>> {
    // 使用遗传算法或模拟退火算法进行全局优化
    // 这里实现一个简化的贪心算法
    
    const results = new Map<string, MatchResult>();
    const availableAgents = this.filterAvailableAgents([]);
    const agentLoads = new Map<string, number>();
    
    // 初始化智能体负载
    availableAgents.forEach(agent => {
      agentLoads.set(agent.id, agent.currentLoad);
    });
    
    // 按优先级排序任务
    const sortedTasks = tasks
      .map((task, index) => ({ task, requirement: requirements[index] }))
      .sort((a, b) => b.requirement.priority - a.requirement.priority);
    
    for (const { task, requirement } of sortedTasks) {
      let bestMatch: MatchResult | null = null;
      let bestScore = -1;
      
      for (const agent of availableAgents) {
        const currentLoad = agentLoads.get(agent.id) || 0;
        
        // 跳过负载过高的智能体
        if (currentLoad >= 90) continue;
        
        // 临时更新智能体负载进行计算
        const tempAgent = { ...agent, currentLoad };
        const match = await this.calculateMatch(tempAgent, task, requirement);
        
        if (match.score > bestScore) {
          bestScore = match.score;
          bestMatch = match;
        }
      }
      
      if (bestMatch) {
        results.set(task.id, bestMatch);
        
        // 更新智能体负载
        const currentLoad = agentLoads.get(bestMatch.agent.id) || 0;
        const taskLoad = Math.min(30, requirement.estimatedDuration / 10);
        agentLoads.set(bestMatch.agent.id, currentLoad + taskLoad);
      }
    }
    
    return results;
  }

  /**
   * 更新智能体性能
   */
  public updateAgentPerformance(
    agentId: string, 
    taskId: string, 
    taskType: string,
    duration: number, 
    quality: number, 
    success: boolean,
    feedback?: string
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      taskId,
      taskType,
      duration,
      quality,
      success,
      feedback
    };
    
    // 添加到性能记录
    agent.performance.recentPerformance.push(metric);
    
    // 保持最近100条记录
    if (agent.performance.recentPerformance.length > 100) {
      agent.performance.recentPerformance.shift();
    }
    
    // 更新统计数据
    agent.performance.tasksCompleted++;
    
    const recentMetrics = agent.performance.recentPerformance;
    const successfulTasks = recentMetrics.filter(m => m.success);
    
    agent.performance.successRate = successfulTasks.length / recentMetrics.length;
    agent.performance.averageQuality = recentMetrics.reduce((sum, m) => sum + m.quality, 0) / recentMetrics.length;
    agent.performance.averageSpeed = recentMetrics.length / 
      (recentMetrics.reduce((sum, m) => sum + m.duration, 0) / 60); // 任务/小时
    
    // 更新可靠性（基于最近的成功率和质量）
    agent.reliability = (agent.performance.successRate + agent.performance.averageQuality / 10) / 2;
    
    this.emit('agent_performance_updated', { agentId, metric });
    logger.info(`Updated performance for agent ${agentId}`);
  }

  /**
   * 获取匹配统计
   */
  public getMatchingStatistics() {
    const totalMatches = this.matchHistory.length;
    if (totalMatches === 0) {
      return {
        totalMatches: 0,
        averageScore: 0,
        averageConfidence: 0,
        successRate: 0,
        topPerformingAgents: []
      };
    }
    
    const averageScore = this.matchHistory.reduce((sum, match) => sum + match.score, 0) / totalMatches;
    const averageConfidence = this.matchHistory.reduce((sum, match) => sum + match.confidence, 0) / totalMatches;
    
    // 计算成功率（基于预测的成功概率）
    const successRate = this.matchHistory.reduce((sum, match) => 
      sum + match.predictedPerformance.successProbability, 0) / totalMatches;
    
    // 统计表现最好的智能体
    const agentScores = new Map<string, number[]>();
    this.matchHistory.forEach(match => {
      const agentId = match.agent.id;
      if (!agentScores.has(agentId)) {
        agentScores.set(agentId, []);
      }
      agentScores.get(agentId)!.push(match.score);
    });
    
    const topPerformingAgents = Array.from(agentScores.entries())
      .map(([agentId, scores]) => ({
        agentId,
        averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        matchCount: scores.length
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
    
    return {
      totalMatches,
      averageScore,
      averageConfidence,
      successRate,
      topPerformingAgents
    };
  }

  /**
   * 获取智能体列表
   */
  public getAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取智能体详情
   */
  public getAgent(agentId: string): AgentProfile | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 清理匹配历史
   */
  public clearMatchHistory(): void {
    this.matchHistory = [];
    this.performanceCache.clear();
    logger.info('Match history cleared');
  }
}

export default AgentCapabilityMatcher;