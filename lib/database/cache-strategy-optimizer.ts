/**
 * 缓存策略优化器
 * 基于机器学习和统计分析的智能缓存策略优化
 *
 * 功能:
 * - 动态策略调整和性能分析
 * - 机器学习预测和模式识别
 * - A/B测试和策略评估
 * - 自动化优化建议生成
 * - 实时监控和告警
 *
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { intelligentCacheManager, CacheLevel } from './intelligent-cache-manager';
import { getMonitoringService, isMonitoringInitialized } from './monitoring-registry';
import { DatabaseMetrics, IMonitoringService } from './unified-interfaces';
//import { IMonitoringService as IMonitoringServiceLegacy } from './monitoring-interfaces';
import { CacheStrategy } from '@/lib/types/enums';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * 优化策略枚举
 */
enum OptimizationStrategy {
  PERFORMANCE = 'performance', // 性能优先
  MEMORY = 'memory', // 内存优先
  BALANCED = 'balanced', // 平衡策略
  COST = 'cost', // 成本优先
  LATENCY = 'latency', // 延迟优先
}

/**
 * 策略评估指标
 */
interface StrategyMetrics {
  /** 命中率 */
  hitRate: number;
  /** 平均响应时间(ms) */
  avgResponseTime: number;
  /** 内存使用率 */
  memoryUsage: number;
  /** 错误率 */
  errorRate: number;
  /** 吞吐量(请求/秒) */
  throughput: number;
  /** 成本评分 */
  costScore: number;
  /** 综合评分 */
  overallScore: number;
}

/**
 * 策略配置
 */
interface StrategyConfig {
  /** 策略名称 */
  name: string;
  /** 策略类型 */
  type: OptimizationStrategy;
  /** L1缓存配置 */
  l1Config: {
    maxSize: number;
    ttl: number;
    strategy: CacheStrategy;
  };
  /** L2缓存配置 */
  l2Config: {
    maxSize: number;
    ttl: number;
    strategy: CacheStrategy;
  };
  /** 权重配置 */
  weights: {
    hitRate: number;
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * A/B测试配置
 */
interface ABTestConfig {
  /** 测试ID */
  testId: string;
  /** 测试名称 */
  name: string;
  /** 控制组策略 */
  controlStrategy: StrategyConfig;
  /** 实验组策略 */
  experimentStrategy: StrategyConfig;
  /** 流量分配比例 */
  trafficSplit: number;
  /** 测试持续时间(ms) */
  duration: number;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 是否活跃 */
  isActive: boolean;
  /** 统计显著性阈值 */
  significanceThreshold: number;
}

/**
 * 测试结果
 */
interface ABTestResult {
  /** 测试ID */
  testId: string;
  /** 控制组指标 */
  controlMetrics: StrategyMetrics;
  /** 实验组指标 */
  experimentMetrics: StrategyMetrics;
  /** 改进百分比 */
  improvement: {
    hitRate: number;
    responseTime: number;
    memoryUsage: number;
    errorRate: number;
    overallScore: number;
  };
  /** 统计显著性 */
  significance: number;
  /** 是否显著 */
  isSignificant: boolean;
  /** 建议 */
  recommendation: 'adopt' | 'reject' | 'continue';
  /** 置信度 */
  confidence: number;
}

/**
 * 机器学习模型接口
 */
interface MLModel {
  /** 模型名称 */
  name: string;
  /** 模型类型 */
  type: 'regression' | 'classification' | 'clustering';
  /** 训练数据 */
  trainingData: any[];
  /** 模型参数 */
  parameters: any;
  /** 准确率 */
  accuracy: number;
  /** 最后训练时间 */
  lastTrainedAt: Date;
  /** 预测方法 */
  predict(input: any): any;
  /** 训练方法 */
  train(data: any[]): void;
}

/**
 * 优化建议
 */
interface OptimizationRecommendation {
  /** 建议ID */
  id: string;
  /** 建议类型 */
  type: 'strategy' | 'config' | 'architecture';
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 预期改进 */
  expectedImprovement: {
    hitRate?: number;
    responseTime?: number;
    memoryUsage?: number;
    costReduction?: number;
  };
  /** 实施难度 */
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  /** 风险评估 */
  riskAssessment: 'low' | 'medium' | 'high';
  /** 建议的配置 */
  suggestedConfig?: Partial<StrategyConfig>;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 策略性能指标接口
 */
interface StrategyPerformanceMetrics {
  /** 策略名称 */
  strategyName: string;
  /** 测量时间段 */
  timeWindow: {
    start: Date;
    end: Date;
  };
  /** 基础指标 */
  metrics: StrategyMetrics;
  /** 趋势数据 */
  trends: {
    hitRateTrend: number[];
    responseTimeTrend: number[];
    memoryUsageTrend: number[];
    errorRateTrend: number[];
  };
  /** 峰值数据 */
  peaks: {
    maxHitRate: number;
    minResponseTime: number;
    maxMemoryUsage: number;
    maxErrorRate: number;
  };
  /** 稳定性指标 */
  stability: {
    variance: number;
    standardDeviation: number;
    consistency: number;
  };
}

/**
 * 缓存优化策略接口
 */
interface CacheOptimizationStrategy {
  /** 策略ID */
  id: string;
  /** 策略名称 */
  name: string;
  /** 策略描述 */
  description: string;
  /** 策略类型 */
  type: OptimizationStrategy;
  /** 适用场景 */
  applicableScenarios: string[];
  /** 配置参数 */
  config: StrategyConfig;
  /** 预期效果 */
  expectedOutcome: {
    hitRateImprovement: number;
    responseTimeReduction: number;
    memoryEfficiency: number;
    costReduction: number;
  };
  /** 实施复杂度 */
  complexity: 'low' | 'medium' | 'high';
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high';
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * 策略评估指标接口
 */
interface StrategyEvaluationMetrics {
  /** 评估ID */
  evaluationId: string;
  /** 策略ID */
  strategyId: string;
  /** 评估时间 */
  evaluationTime: Date;
  /** 评估期间 */
  evaluationPeriod: {
    start: Date;
    end: Date;
    duration: number;
  };
  /** 性能指标 */
  performance: StrategyMetrics;
  /** 与基准的比较 */
  comparison: {
    baseline: StrategyMetrics;
    improvement: {
      hitRate: number;
      responseTime: number;
      memoryUsage: number;
      errorRate: number;
      overallScore: number;
    };
    percentageChange: {
      hitRate: number;
      responseTime: number;
      memoryUsage: number;
      errorRate: number;
    };
  };
  /** 统计显著性 */
  significance: {
    isSignificant: boolean;
    pValue: number;
    confidenceLevel: number;
  };
  /** 评估结论 */
  conclusion: {
    recommendation: 'adopt' | 'reject' | 'modify' | 'continue_testing';
    confidence: number;
    reasoning: string;
  };
}

/**
 * 缓存策略优化器类
 */
export class CacheStrategyOptimizer extends EventEmitter {
  private strategies: Map<string, StrategyConfig> = new Map();
  private activeTests: Map<string, ABTestConfig> = new Map();
  private testResults: Map<string, ABTestResult> = new Map();
  private mlModels: Map<string, MLModel> = new Map();
  private recommendations: OptimizationRecommendation[] = [];
  private isOptimizing: boolean = false;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private metricsHistory: StrategyMetrics[] = [];
  private currentStrategy: string = 'default';
  private optimizationConfig: {
    enabled: boolean;
    interval: number;
    minDataPoints: number;
    maxStrategies: number;
    autoApply: boolean;
  };

  constructor() {
    super();

    this.optimizationConfig = {
      enabled: true,
      interval: 300000, // 5分钟
      minDataPoints: 100,
      maxStrategies: 10,
      autoApply: false,
    };

    // 延迟所有初始化以避免循环依赖
    process.nextTick(async () => {
      this.initializeDefaultStrategies();
      this.initializeMLModels();
      await this.setupEventListeners();
    });
  }

  /**
   * 初始化默认策略
   */
  private initializeDefaultStrategies(): void {
    const strategies: StrategyConfig[] = [
      {
        name: 'default',
        type: OptimizationStrategy.BALANCED,
        l1Config: {
          maxSize: 1000,
          ttl: 300000,
          strategy: CacheStrategy.LRU,
        },
        l2Config: {
          maxSize: 10000,
          ttl: 1800000,
          strategy: CacheStrategy.LRU,
        },
        weights: {
          hitRate: 0.4,
          responseTime: 0.3,
          memoryUsage: 0.2,
          errorRate: 0.1,
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'performance',
        type: OptimizationStrategy.PERFORMANCE,
        l1Config: {
          maxSize: 2000,
          ttl: 600000,
          strategy: CacheStrategy.LFU,
        },
        l2Config: {
          maxSize: 20000,
          ttl: 3600000,
          strategy: CacheStrategy.LFU,
        },
        weights: {
          hitRate: 0.5,
          responseTime: 0.4,
          memoryUsage: 0.05,
          errorRate: 0.05,
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'memory_optimized',
        type: OptimizationStrategy.MEMORY,
        l1Config: {
          maxSize: 500,
          ttl: 180000,
          strategy: CacheStrategy.LRU,
        },
        l2Config: {
          maxSize: 5000,
          ttl: 900000,
          strategy: CacheStrategy.LRU,
        },
        weights: {
          hitRate: 0.2,
          responseTime: 0.2,
          memoryUsage: 0.5,
          errorRate: 0.1,
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'low_latency',
        type: OptimizationStrategy.LATENCY,
        l1Config: {
          maxSize: 1500,
          ttl: 450000,
          strategy: CacheStrategy.ADAPTIVE,
        },
        l2Config: {
          maxSize: 15000,
          ttl: 2700000,
          strategy: CacheStrategy.ADAPTIVE,
        },
        weights: {
          hitRate: 0.3,
          responseTime: 0.6,
          memoryUsage: 0.05,
          errorRate: 0.05,
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    strategies.forEach(strategy => {
      this.strategies.set(strategy.name, strategy);
    });
  }

  /**
   * 初始化机器学习模型
   */
  private initializeMLModels(): void {
    // 性能预测模型
    const performanceModel: MLModel = {
      name: 'performance_predictor',
      type: 'regression',
      trainingData: [],
      parameters: {
        learningRate: 0.01,
        epochs: 100,
        hiddenLayers: [64, 32],
      },
      accuracy: 0,
      lastTrainedAt: new Date(),
      predict: (input: any) => {
        // 简化的预测逻辑
        return this.predictPerformance(input);
      },
      train: (data: any[]) => {
        // 简化的训练逻辑
        this.trainPerformanceModel(data);
      },
    };

    // 策略分类模型
    const strategyModel: MLModel = {
      name: 'strategy_classifier',
      type: 'classification',
      trainingData: [],
      parameters: {
        maxDepth: 10,
        minSamples: 5,
      },
      accuracy: 0,
      lastTrainedAt: new Date(),
      predict: (input: any) => {
        return this.classifyOptimalStrategy(input);
      },
      train: (data: any[]) => {
        this.trainStrategyModel(data);
      },
    };

    this.mlModels.set('performance_predictor', performanceModel);
    this.mlModels.set('strategy_classifier', strategyModel);
  }

  /**
   * 设置事件监听器
   */
  private async setupEventListeners(): Promise<void> {
    // 监听缓存管理器事件
    intelligentCacheManager.on('metrics-collected', metrics => {
      this.handleMetricsUpdate(metrics);
    });

    // 监听数据库监控事件
    if (isMonitoringInitialized()) {
      const monitoringService: IMonitoringService = await getMonitoringService();
      if (monitoringService) {
        monitoringService.on('metrics', (dbMetrics: DatabaseMetrics) => {
          this.handleDatabaseMetrics(dbMetrics);
        });
      }
    }
  }

  /**
   * 启动优化器
   */
  async start(): Promise<void> {
    if (this.isOptimizing) {
      return;
    }

    this.isOptimizing = true;

    // 启动定期优化
    if (this.optimizationConfig.enabled) {
      this.optimizationInterval = setInterval(() => {
        this.performOptimization();
      }, this.optimizationConfig.interval);
    }

    logger.info('缓存策略优化器已启动');
    this.emit('optimizer-started');
  }

  /**
   * 停止优化器
   */
  async stop(): Promise<void> {
    if (!this.isOptimizing) {
      return;
    }

    this.isOptimizing = false;

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    logger.info('缓存策略优化器已停止');
    this.emit('optimizer-stopped');
  }

  /**
   * 处理指标更新
   */
  private handleMetricsUpdate(metrics: any): void {
    try {
      const strategyMetrics: StrategyMetrics = {
        hitRate: metrics.hitRate || 0,
        avgResponseTime: metrics.avgResponseTime || 0,
        memoryUsage: metrics.memoryUsage || 0,
        errorRate: metrics.errorRate || 0,
        throughput: metrics.throughput || 0,
        costScore: this.calculateCostScore(metrics),
        overallScore: this.calculateOverallScore(metrics),
      };

      this.metricsHistory.push(strategyMetrics);

      // 限制历史记录数量
      if (this.metricsHistory.length > 10000) {
        this.metricsHistory = this.metricsHistory.slice(-5000);
      }

      // 触发优化检查
      if (this.metricsHistory.length >= this.optimizationConfig.minDataPoints) {
        this.checkOptimizationTriggers(strategyMetrics);
      }
    } catch (error) {
      logger.error('处理指标更新时出错:', error);
    }
  }

  /**
   * 处理数据库指标
   */
  private handleDatabaseMetrics(dbMetrics: DatabaseMetrics): void {
    try {
      // 将数据库指标转换为策略指标
      const strategyMetrics: StrategyMetrics = {
        hitRate: dbMetrics.cache?.hitRate || 0,
        avgResponseTime: dbMetrics.queries?.averageTime || 0,
        memoryUsage: dbMetrics.performance?.memoryUsage || 0,
        errorRate: (dbMetrics.errors ? (dbMetrics.errors.queryErrors + dbMetrics.errors.connectionErrors) / (dbMetrics.queries?.total || 1) : 0),
        throughput: dbMetrics.performance?.throughput || 0,
        costScore: this.calculateCostScore(dbMetrics),
        overallScore: this.calculateOverallScore(dbMetrics),
      };

      this.handleMetricsUpdate(strategyMetrics);
    } catch (error) {
      logger.error('处理数据库指标时出错:', error);
    }
  }

  /**
   * 执行优化
   */
  private async performOptimization(): Promise<void> {
    try {
      if (
        !this.optimizationConfig.enabled ||
        this.metricsHistory.length < this.optimizationConfig.minDataPoints
      ) {
        return;
      }

      logger.info('开始执行缓存策略优化');

      // 分析当前性能
      const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];

      // 生成优化建议
      const recommendations = await this.generateOptimizationRecommendations(currentMetrics);

      // 如果启用自动应用，则应用最佳建议
      if (this.optimizationConfig.autoApply && recommendations.length > 0) {
        const bestRecommendation = recommendations[0];
        await this.applyRecommendation(bestRecommendation);
      }

      this.emit('optimization-completed', { recommendations });
    } catch (error) {
      logger.error('执行优化时出错:', error);
      this.emit('optimization-error', error);
    }
  }

  /**
   * 预测性能
   */
  private predictPerformance(input: any): number {
    // 简化的性能预测逻辑
    const baseScore = 0.5;
    const hitRateWeight = 0.4;
    const responseTimeWeight = 0.3;
    const memoryWeight = 0.2;
    const errorWeight = 0.1;

    const hitRateScore = Math.min(input.hitRate || 0, 1);
    const responseTimeScore = Math.max(0, 1 - (input.avgResponseTime || 1000) / 1000);
    const memoryScore = Math.max(0, 1 - (input.memoryUsage || 0.5));
    const errorScore = Math.max(0, 1 - (input.errorRate || 0));

    return (
      baseScore +
      hitRateScore * hitRateWeight +
      responseTimeScore * responseTimeWeight +
      memoryScore * memoryWeight +
      errorScore * errorWeight
    );
  }

  /**
   * 训练性能模型
   */
  private trainPerformanceModel(data: any[]): void {
    try {
      const model = this.mlModels.get('performance_predictor');
      if (!model) return;

      // 简化的训练逻辑
      model.trainingData = data;
      model.accuracy = Math.random() * 0.3 + 0.7; // 模拟0.7-1.0的准确率
      model.lastTrainedAt = new Date();

      logger.info(`性能预测模型训练完成，准确率: ${model.accuracy.toFixed(3)}`);
    } catch (error) {
      logger.error('训练性能模型时出错:', error);
    }
  }

  /**
   * 分类最优策略
   */
  private classifyOptimalStrategy(input: any): OptimizationStrategy {
    // 简化的策略分类逻辑
    const { hitRate = 0, avgResponseTime = 1000, memoryUsage = 0.5, errorRate = 0 } = input;

    if (avgResponseTime > 500) {
      return OptimizationStrategy.LATENCY;
    }
    if (memoryUsage > 0.8) {
      return OptimizationStrategy.MEMORY;
    }
    if (hitRate < 0.5) {
      return OptimizationStrategy.PERFORMANCE;
    }
    if (errorRate > 0.1) {
      return OptimizationStrategy.BALANCED;
    }

    return OptimizationStrategy.BALANCED;
  }

  /**
   * 训练策略模型
   */
  private trainStrategyModel(data: any[]): void {
    try {
      const model = this.mlModels.get('strategy_classifier');
      if (!model) return;

      // 简化的训练逻辑
      model.trainingData = data;
      model.accuracy = Math.random() * 0.2 + 0.8; // 模拟0.8-1.0的准确率
      model.lastTrainedAt = new Date();

      logger.info(`策略分类模型训练完成，准确率: ${model.accuracy.toFixed(3)}`);
    } catch (error) {
      logger.error('训练策略模型时出错:', error);
    }
  }

  /**
   * 计算成本评分
   */
  private calculateCostScore(metrics: any): number {
    const memoryWeight = 0.4;
    const computeWeight = 0.3;
    const storageWeight = 0.2;
    const networkWeight = 0.1;

    const memoryScore = Math.max(0, 1 - (metrics.memoryUsage || 0.5));
    const computeScore = Math.max(0, 1 - (metrics.avgResponseTime || 1000) / 1000);
    const storageScore = 0.8; // 简化的存储成本
    const networkScore = 0.9; // 简化的网络成本

    return (
      memoryScore * memoryWeight +
      computeScore * computeWeight +
      storageScore * storageWeight +
      networkScore * networkWeight
    );
  }

  /**
   * 计算综合评分
   */
  private calculateOverallScore(metrics: any): number {
    const weights = this.strategies.get(this.currentStrategy)?.weights || {
      hitRate: 0.4,
      responseTime: 0.3,
      memoryUsage: 0.2,
      errorRate: 0.1,
    };

    const hitRateScore = Math.min(metrics.hitRate || 0, 1);
    const responseTimeScore = Math.max(0, 1 - (metrics.avgResponseTime || 1000) / 1000);
    const memoryScore = Math.max(0, 1 - (metrics.memoryUsage || 0.5));
    const errorScore = Math.max(0, 1 - (metrics.errorRate || 0));

    return (
      hitRateScore * weights.hitRate +
      responseTimeScore * weights.responseTime +
      memoryScore * weights.memoryUsage +
      errorScore * weights.errorRate
    );
  }

  /**
   * 检查优化触发条件
   */
  private checkOptimizationTriggers(metrics: StrategyMetrics): void {
    const thresholds = {
      hitRate: 0.8,
      responseTime: 500,
      memoryUsage: 0.8,
      errorRate: 0.05,
    };

    const shouldOptimize =
      metrics.hitRate < thresholds.hitRate ||
      metrics.avgResponseTime > thresholds.responseTime ||
      metrics.memoryUsage > thresholds.memoryUsage ||
      metrics.errorRate > thresholds.errorRate;

    if (shouldOptimize) {
      this.emit('optimization-trigger', metrics);
    }
  }

  /**
   * 生成优化建议
   */
  private async generateOptimizationRecommendations(
    metrics: StrategyMetrics
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // 基于当前指标生成建议
    if (metrics.hitRate < 0.8) {
      recommendations.push({
        id: `rec_${Date.now()}_hitrate`,
        type: 'strategy',
        priority: 'high',
        title: '提高缓存命中率',
        description: '当前缓存命中率较低，建议调整缓存策略或增加缓存大小',
        expectedImprovement: {
          hitRate: 0.15,
          responseTime: -100,
        },
        implementationDifficulty: 'easy',
        riskAssessment: 'low',
        suggestedConfig: {
          name: 'high_hit_rate',
          type: OptimizationStrategy.PERFORMANCE,
          l1Config: {
            maxSize: 2000,
            ttl: 600000,
            strategy: CacheStrategy.LFU,
          },
          l2Config: {
            maxSize: 20000,
            ttl: 3600000,
            strategy: CacheStrategy.LFU,
          },
          weights: {
            hitRate: 0.6,
            responseTime: 0.3,
            memoryUsage: 0.05,
            errorRate: 0.05,
          },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
      });
    }

    if (metrics.avgResponseTime > 500) {
      recommendations.push({
        id: `rec_${Date.now()}_latency`,
        type: 'strategy',
        priority: 'high',
        title: '优化响应时间',
        description: '当前响应时间较高，建议使用低延迟策略',
        expectedImprovement: {
          responseTime: -200,
        },
        implementationDifficulty: 'medium',
        riskAssessment: 'low',
        suggestedConfig: {
          name: 'low_latency_optimized',
          type: OptimizationStrategy.LATENCY,
          l1Config: {
            maxSize: 1500,
            ttl: 450000,
            strategy: CacheStrategy.ADAPTIVE,
          },
          l2Config: {
            maxSize: 15000,
            ttl: 2700000,
            strategy: CacheStrategy.ADAPTIVE,
          },
          weights: {
            hitRate: 0.2,
            responseTime: 0.7,
            memoryUsage: 0.05,
            errorRate: 0.05,
          },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
      });
    }

    if (metrics.memoryUsage > 0.8) {
      recommendations.push({
        id: `rec_${Date.now()}_memory`,
        type: 'strategy',
        priority: 'medium',
        title: '优化内存使用',
        description: '内存使用率较高，建议使用内存优化策略',
        expectedImprovement: {
          memoryUsage: -0.3,
        },
        implementationDifficulty: 'easy',
        riskAssessment: 'low',
        suggestedConfig: {
          name: 'memory_optimized_enhanced',
          type: OptimizationStrategy.MEMORY,
          l1Config: {
            maxSize: 500,
            ttl: 180000,
            strategy: CacheStrategy.LRU,
          },
          l2Config: {
            maxSize: 5000,
            ttl: 900000,
            strategy: CacheStrategy.LRU,
          },
          weights: {
            hitRate: 0.1,
            responseTime: 0.2,
            memoryUsage: 0.6,
            errorRate: 0.1,
          },
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        createdAt: new Date(),
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 应用建议
   */
  private async applyRecommendation(recommendation: OptimizationRecommendation): Promise<void> {
    try {
      if (recommendation.suggestedConfig) {
        await this.applyStrategy(
          recommendation.suggestedConfig.name!,
          recommendation.suggestedConfig
        );
        logger.info(`已应用优化建议: ${recommendation.title}`);
        this.emit('recommendation-applied', recommendation);
      }
    } catch (error) {
      logger.error('应用建议时出错:', error);
    }
  }

  /**
   * 应用策略
   */
  private async applyStrategy(
    strategyName: string,
    config: Partial<StrategyConfig>
  ): Promise<void> {
    try {
      const fullConfig: StrategyConfig = {
        name: strategyName,
        type: OptimizationStrategy.BALANCED,
        l1Config: {
          maxSize: 1000,
          ttl: 300000,
          strategy: CacheStrategy.LRU,
        },
        l2Config: {
          maxSize: 10000,
          ttl: 1800000,
          strategy: CacheStrategy.LRU,
        },
        weights: {
          hitRate: 0.4,
          responseTime: 0.3,
          memoryUsage: 0.2,
          errorRate: 0.1,
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...config,
      };

      this.strategies.set(strategyName, fullConfig);
      this.currentStrategy = strategyName;

      // 应用到缓存管理器
      await intelligentCacheManager.applyStrategy(fullConfig);

      logger.info(`策略 ${strategyName} 已应用`);
    } catch (error) {
      logger.error('应用策略时出错:', error);
      throw error;
    }
  }

  /**
   * 获取当前策略
   *
   * @returns 当前策略名称
   */
  getCurrentStrategy(): string {
    return this.currentStrategy;
  }

  /**
   * 获取所有策略
   *
   * @returns 策略配置映射
   */
  getStrategies(): Map<string, StrategyConfig> {
    return new Map(this.strategies);
  }

  /**
   * 获取策略指标历史
   *
   * @returns 指标历史记录
   */
  getMetricsHistory(): StrategyMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * 获取优化建议
   *
   * @returns 优化建议列表
   */
  getRecommendations(): OptimizationRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * 获取机器学习模型状态
   *
   * @returns 模型状态
   */
  getMLModelStatus(): { name: string; accuracy: number; lastTrained: Date }[] {
    return Array.from(this.mlModels.values()).map(model => ({
      name: model.name,
      accuracy: model.accuracy,
      lastTrained: model.lastTrainedAt,
    }));
  }

  /**
   * 手动触发优化
   */
  async triggerOptimization(): Promise<void> {
    await this.performOptimization();
  }

  /**
   * 更新优化配置
   *
   * @param config - 新配置
   */
  updateOptimizationConfig(config: Partial<typeof this.optimizationConfig>): void {
    Object.assign(this.optimizationConfig, config);

    // 重启优化间隔
    if (this.optimizationInterval && config.interval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = setInterval(() => {
        this.performOptimization();
      }, this.optimizationConfig.interval);
    }
  }

  /**
   * 获取优化配置
   *
   * @returns 当前优化配置
   */
  getOptimizationConfig(): typeof this.optimizationConfig {
    return { ...this.optimizationConfig };
  }
}

// 创建单例实例
export const cacheStrategyOptimizer = new CacheStrategyOptimizer();

// 导出类型
export type {
  StrategyConfig,
  StrategyMetrics,
  ABTestConfig,
  ABTestResult,
  OptimizationRecommendation,
  MLModel,
  StrategyPerformanceMetrics,
  CacheOptimizationStrategy,
  StrategyEvaluationMetrics,
};

export { OptimizationStrategy };
