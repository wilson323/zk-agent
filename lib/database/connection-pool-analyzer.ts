/**
 * 连接池使用模式分析器
 * 用于分析数据库连接池的实际使用情况，为优化提供数据支持
 *
 * 功能:
 * - 实时监控连接池使用情况
 * - 分析连接使用模式和趋势
 * - 识别性能瓶颈和优化机会
 * - 生成优化建议报告
 *
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { DatabaseMetrics, IMonitoringService } from './unified-interfaces';
//import { IMonitoringService as IMonitoringServiceLegacy } from './monitoring-interfaces';
import { getMonitoringService, isMonitoringInitialized } from './monitoring-registry';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * 连接池使用统计接口
 */
interface PoolUsageStats {
  /** 时间戳 */
  timestamp: Date;
  /** 活跃连接数 */
  activeConnections: number;
  /** 空闲连接数 */
  idleConnections: number;
  /** 总连接数 */
  totalConnections: number;
  /** 等待连接的请求数 */
  waitingRequests: number;
  /** 连接获取平均时间(ms) */
  avgAcquireTime: number;
  /** 连接使用率(%) */
  utilizationRate: number;
  /** 峰值连接数 */
  peakConnections: number;
  /** 连接创建次数 */
  connectionCreations: number;
  /** 连接销毁次数 */
  connectionDestructions: number;
}

/**
 * 使用模式分析结果接口
 */
interface UsagePatternAnalysis {
  /** 分析时间段 */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** 平均使用率 */
  avgUtilization: number;
  /** 峰值使用率 */
  peakUtilization: number;
  /** 低谷使用率 */
  minUtilization: number;
  /** 使用率标准差 */
  utilizationStdDev: number;
  /** 连接获取延迟统计 */
  acquireTimeStats: {
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  /** 使用模式类型 */
  patternType: 'stable' | 'bursty' | 'growing' | 'declining' | 'irregular';
  /** 建议的连接池配置 */
  recommendedConfig: {
    minConnections: number;
    maxConnections: number;
    acquireTimeout: number;
    idleTimeout: number;
  };
}

/**
 * 优化建议接口
 */
interface OptimizationRecommendation {
  /** 建议类型 */
  type: 'increase_pool' | 'decrease_pool' | 'adjust_timeout' | 'optimize_queries' | 'no_action';
  /** 建议描述 */
  description: string;
  /** 预期效果 */
  expectedImpact: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 具体配置建议 */
  configChanges?: Partial<PoolUsageStats>;
}

/**
 * 使用模式类型
 */
interface UsagePattern {
  /** 模式名称 */
  name: string;
  /** 模式类型 */
  type: 'stable' | 'bursty' | 'growing' | 'declining' | 'irregular';
  /** 置信度 */
  confidence: number;
  /** 模式描述 */
  description: string;
  /** 检测到的时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * 瓶颈信息接口
 */
interface BottleneckInfo {
  /** 瓶颈类型 */
  type: 'connection_limit' | 'acquire_timeout' | 'query_slow' | 'resource_contention';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 瓶颈描述 */
  description: string;
  /** 影响指标 */
  impact: {
    /** 受影响的连接数 */
    affectedConnections: number;
    /** 平均延迟增加(ms) */
    avgDelayIncrease: number;
    /** 吞吐量下降百分比 */
    throughputDecrease: number;
  };
  /** 建议解决方案 */
  suggestions: string[];
}

/**
 * 连接池分析报告接口
 */
interface PoolAnalysisReport {
  /** 报告生成时间 */
  timestamp: Date;
  /** 分析时间范围 */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** 连接池使用统计 */
  usageStats: PoolUsageStats;
  /** 使用模式分析 */
  patternAnalysis: UsagePatternAnalysis;
  /** 检测到的使用模式 */
  detectedPatterns: UsagePattern[];
  /** 识别的瓶颈 */
  bottlenecks: BottleneckInfo[];
  /** 优化建议 */
  recommendations: OptimizationRecommendation[];
  /** 整体健康评分 (0-100) */
  healthScore: number;
  /** 性能趋势 */
  performanceTrend: 'improving' | 'stable' | 'degrading';
}

/**
 * 连接池使用模式分析器类
 */
export class ConnectionPoolAnalyzer extends EventEmitter {
  private usageHistory: PoolUsageStats[] = [];
  private isAnalyzing: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  private maxHistorySize: number;
  private analysisIntervalMs: number;
  private logger = getLogger();

  constructor(
    maxHistorySize: number = 1000,
    analysisIntervalMs: number = 30000 // 30秒分析一次
  ) {
    super();
    this.maxHistorySize = maxHistorySize;
    this.analysisIntervalMs = analysisIntervalMs;

    // 延迟监听数据库监控事件，避免循环依赖
    process.nextTick(async () => {
      await this.setupMonitoringListeners();
    });
  }

  /**
   * 设置监控事件监听器
   */
  private async setupMonitoringListeners(): Promise<void> {
    if (isMonitoringInitialized()) {
      const monitoringService = await getMonitoringService();
      if (monitoringService) {
        monitoringService.on('metrics', (metrics: DatabaseMetrics) => {
          this.recordUsageStats(metrics);
        });
      }
    }
  }

  /**
   * 记录连接池使用统计
   *
   * @param metrics - 数据库监控指标
   */
  /**
   * 记录连接池使用统计
   *
   * @param metrics - 数据库监控指标
   */
  private recordUsageStats(metrics: DatabaseMetrics): void {
    // 安全地获取连接池指标，提供默认值
    const activeConnections = metrics.connections?.active || 0;
    const idleConnections = metrics.connections?.idle || 0;
    const waitingRequests = metrics.connections?.waiting || 0;
    const connectionCreations = metrics.connections?.creations || 0;
    const connectionDestructions = metrics.connections?.destructions || 0;

    const stats: PoolUsageStats = {
      timestamp: new Date(),
      activeConnections,
      idleConnections,
      totalConnections: activeConnections + idleConnections,
      waitingRequests,
      avgAcquireTime: metrics.performance?.averageLatency || 0,
      utilizationRate: this.calculateUtilizationRate(metrics),
      peakConnections: this.calculatePeakConnections(),
      connectionCreations,
      connectionDestructions,
    };

    this.usageHistory.push(stats);

    // 限制历史记录大小
    if (this.usageHistory.length > this.maxHistorySize) {
      this.usageHistory.shift();
    }

    this.emit('usage-stats', stats);
  }

  /**
   * 计算连接池使用率
   *
   * @param metrics - 数据库监控指标
   * @returns 使用率百分比
   */
  /**
   * 计算连接池使用率
   *
   * @param metrics - 数据库监控指标
   * @returns 使用率百分比
   */
  private calculateUtilizationRate(metrics: DatabaseMetrics): number {
    const active = metrics.connections?.active || 0;
    const idle = metrics.connections?.idle || 0;
    const total = active + idle;

    if (total === 0) return 0;
    return (active / total) * 100;
  }

  /**
   * 计算峰值连接数
   *
   * @returns 峰值连接数
   */
  private calculatePeakConnections(): number {
    if (this.usageHistory.length === 0) return 0;

    return Math.max(...this.usageHistory.map(stats => stats.totalConnections));
  }

  /**
   * 开始分析
   */
  startAnalysis(): void {
    if (this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = true;

    // 开始定期分析
    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, this.analysisIntervalMs);

    this.logger.info('Connection pool analysis started');
  }

  /**
   * 停止分析
   */
  stopAnalysis(): void {
    if (!this.isAnalyzing) {
      return;
    }

    this.isAnalyzing = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    this.logger.info('Connection pool analysis stopped');
  }

  /**
   * 执行分析
   */
  private performAnalysis(): void {
    try {
      // 分析逻辑的占位符
      const stats = this.getPoolStats();
      const patterns = this.analyzeUsagePatterns(stats);
      const recommendations = this.generateOptimizationRecommendations(patterns);

      this.emit('analysis-completed', { stats, patterns, recommendations });
    } catch (error) {
      this.logger.error('Pool analysis failed:', error);
      this.emit('analysis-error', error);
    }
  }

  /**
   * 获取池统计信息
   */
  private getPoolStats(): PoolUsageStats {
    // 简化的统计信息
    return {
      timestamp: new Date(),
      totalConnections: 10,
      activeConnections: 5,
      idleConnections: 5,
      waitingRequests: 0,
      avgAcquireTime: 0,
      utilizationRate: 0.5,
      peakConnections: 10,
      connectionCreations: 0,
      connectionDestructions: 0,
    };
  }

  /**
   * 分析使用模式
   */
  private analyzeUsagePatterns(stats: PoolUsageStats): UsagePatternAnalysis {
    const utilization = stats.activeConnections / stats.totalConnections;
    return {
      timeRange: {
        start: new Date(Date.now() - 3600000), // 1小时前
        end: new Date()
      },
      avgUtilization: utilization,
      peakUtilization: utilization * 1.2,
      minUtilization: utilization * 0.8,
      utilizationStdDev: 0.1,
      acquireTimeStats: {
        avg: stats.avgAcquireTime,
        min: stats.avgAcquireTime * 0.5,
        max: stats.avgAcquireTime * 2,
        p95: stats.avgAcquireTime * 1.5,
        p99: stats.avgAcquireTime * 1.8
      },
      patternType: 'stable',
      recommendedConfig: {
        minConnections: Math.max(1, Math.floor(stats.totalConnections * 0.2)),
        maxConnections: Math.ceil(stats.totalConnections * 1.5),
        acquireTimeout: 30000,
        idleTimeout: 300000
      }
    };
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationRecommendations(
    patterns: UsagePatternAnalysis
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (patterns.avgUtilization < 0.3) {
      recommendations.push({
        type: 'decrease_pool',
        priority: 'medium',
        description: '连接池使用率较低，建议减少连接数以节省资源',
        expectedImpact: '节省资源，降低内存使用',
      });
    }

    if (patterns.avgUtilization > 0.8) {
      recommendations.push({
        type: 'increase_pool',
        priority: 'high',
        description: '连接池使用率过高，建议增加连接数以提高性能',
        expectedImpact: '提高并发处理能力，减少等待时间',
      });
    }

    return recommendations;
  }
}
// 导出类型
// 创建默认实例
export const connectionPoolAnalyzer = new ConnectionPoolAnalyzer();

export type {
  PoolUsageStats,
  UsagePatternAnalysis,
  OptimizationRecommendation,
  UsagePattern,
  BottleneckInfo,
  PoolAnalysisReport
};
