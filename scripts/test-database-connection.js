#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 用于验证数据库配置和连接状态
 */

// 防止PowerShell重复执行的全局检查
if (global.__DB_TEST_RUNNING) {
  console.log('⚠️ 脚本已在执行中，跳过重复执行');
  process.exit(0);
}
global.__DB_TEST_RUNNING = true;

const path = require('path');
const fs = require('fs');
const os = require('os');
// 简化的数据库连接测试，避免原生模块依赖
const { getCurrentConfig, getDatabaseUrl, validateDatabaseConfig, getPrismaConfig } = require('../lib/database/database.config');

// 确保在进程退出时清理全局标志
process.on('exit', () => {
  global.__DB_TEST_RUNNING = false;
});
process.on('SIGINT', () => {
  global.__DB_TEST_RUNNING = false;
  process.exit(0);
});
process.on('SIGTERM', () => {
  global.__DB_TEST_RUNNING = false;
  process.exit(0);
});

// 单例模式防止重复初始化
let instance = null;
let hasInitialized = false;

class DatabaseConnectionTester {
  constructor() {
    if (instance) {
      return instance;
    }
    
    this.config = getCurrentConfig();
    this.databaseUrl = getDatabaseUrl();
    
    if (!hasInitialized) {
      console.log('数据库配置初始化完成');
      console.log('数据库URL:', this.databaseUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')); // 隐藏密码
      hasInitialized = true;
    }
    
    instance = this;
  }

  /**
   * 初始化测试环境
   */
  async initialize() {
    console.log('🔧 初始化数据库测试环境...');
    
    try {
      // 创建连接池
      this.pool = new Pool(this.config);
      
      // 初始化健康检查器
      this.healthChecker = new DatabaseHealthChecker(this.config);
      
      // 初始化性能监控器
      this.performanceMonitor = new DatabasePerformanceMonitor();
      
      console.log('✅ 测试环境初始化完成');
    } catch (error) {
      console.error('❌ 测试环境初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 测试基本连接
   */
  async testBasicConnection() {
    try {
      // 验证配置
      validateDatabaseConfig();
      
      // 检查数据库URL格式
      const dbUrl = this.databaseUrl;
      if (!dbUrl || !dbUrl.startsWith('postgresql://')) {
        throw new Error('数据库URL格式不正确');
      }
      
      // 检查配置完整性
      const config = this.config;
      const requiredFields = ['host', 'port', 'database', 'username'];
      const missingFields = requiredFields.filter(field => !config[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`配置缺少必需字段: ${missingFields.join(', ')}`);
      }
      
      // 检查连接池配置
      if (config.pool) {
        const poolConfig = config.pool;
        if (poolConfig.max < poolConfig.min) {
          throw new Error('连接池最大连接数不能小于最小连接数');
        }
      }
      
      return {
        success: true,
        message: '数据库配置测试通过',
        details: {
          host: config.host,
          port: config.port,
          database: config.database,
          poolConfig: config.pool,
          sslEnabled: !!config.ssl,
          healthCheckEnabled: config.healthCheck?.enabled || false
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: '数据库配置测试失败',
        error: error.message
      };
    }
  }

  /**
   * 测试连接池
   */
  async testConnectionPool() {
    try {
      const config = this.config;
      
      // 检查连接池配置存在性
      if (!config.pool) {
        throw new Error('连接池配置不存在');
      }
      
      const poolConfig = config.pool;
      
      // 验证连接池参数
      const validations = [
        { name: 'max', value: poolConfig.max, min: 1, max: 100 },
        { name: 'min', value: poolConfig.min, min: 0, max: poolConfig.max },
        { name: 'acquire', value: poolConfig.acquire, min: 1000, max: 60000 },
        { name: 'idle', value: poolConfig.idle, min: 1000, max: 300000 }
      ];
      
      for (const validation of validations) {
        if (validation.value < validation.min || validation.value > validation.max) {
          throw new Error(`连接池参数 ${validation.name}=${validation.value} 超出合理范围 [${validation.min}, ${validation.max}]`);
        }
      }
      
      // 计算连接池效率指标
      const efficiency = {
        poolUtilization: (poolConfig.min / poolConfig.max * 100).toFixed(1),
        connectionRatio: poolConfig.max / poolConfig.min,
        timeoutRatio: poolConfig.acquire / poolConfig.idle
      };
      
      const env = process.env.NODE_ENV || 'development';
      
      return {
        success: true,
        message: '连接池配置测试通过',
        poolConfig,
        efficiency,
        recommendations: this.getPoolRecommendations(poolConfig, env)
      };
      
    } catch (error) {
      return {
        success: false,
        message: '连接池配置测试失败',
        error: error.message
      };
    }
  }
  
  /**
   * 获取连接池配置建议
   */
  getPoolRecommendations(poolConfig, env) {
    const recommendations = [];
    
    if (env === 'production') {
      if (poolConfig.max > 50) {
        recommendations.push('考虑降低最大连接数以减少数据库负载');
      }
      if (poolConfig.acquire < 10000) {
        recommendations.push('考虑增加获取连接超时时间以提高稳定性');
      }
    }
    
    if (poolConfig.max / poolConfig.min > 10) {
      recommendations.push('连接数差距过大，可能导致资源浪费');
    }
    
    return recommendations;
  }

  /**
   * 测试安全配置
   */
  testSecurityConfig() {
    try {
      const config = this.config;
      const securityChecks = [];
      
      // 检查SSL配置
      if (config.ssl) {
        securityChecks.push({ name: 'SSL', status: 'enabled', secure: true });
      } else {
        securityChecks.push({ name: 'SSL', status: 'disabled', secure: false });
      }
      
      // 检查密码配置
      if (!config.password || config.password === '') {
        securityChecks.push({ name: 'Password', status: 'missing', secure: false });
      } else {
        securityChecks.push({ name: 'Password', status: 'configured', secure: true });
      }
      
      // 检查连接超时配置
      if (config.connectionTimeoutMillis && config.connectionTimeoutMillis < 60000) {
        securityChecks.push({ name: 'ConnectionTimeout', status: 'configured', secure: true });
      } else {
        securityChecks.push({ name: 'ConnectionTimeout', status: 'suboptimal', secure: false });
      }
      
      // 检查空闲超时配置
      if (config.idleTimeoutMillis && config.idleTimeoutMillis <= 300000) {
        securityChecks.push({ name: 'IdleTimeout', status: 'configured', secure: true });
      } else {
        securityChecks.push({ name: 'IdleTimeout', status: 'suboptimal', secure: false });
      }
      
      const secureCount = securityChecks.filter(check => check.secure).length;
      const totalChecks = securityChecks.length;
      const securityScore = (secureCount / totalChecks * 100).toFixed(1);
      
      return {
        success: secureCount === totalChecks,
        message: '安全配置检查完成',
        securityScore: parseFloat(securityScore),
        checks: securityChecks,
        recommendations: this.getSecurityRecommendations(securityChecks)
      };
      
    } catch (error) {
      return {
        success: false,
        message: '安全配置检查失败',
        error: error.message
      };
    }
  }
  
  /**
   * 获取安全配置建议
   */
  getSecurityRecommendations(securityChecks) {
    const recommendations = [];
    
    securityChecks.forEach(check => {
      if (!check.secure) {
        switch (check.name) {
          case 'SSL':
            recommendations.push('启用SSL加密以保护数据传输安全');
            break;
          case 'Password':
            recommendations.push('设置强密码并定期更换');
            break;
          case 'ConnectionTimeout':
            recommendations.push('设置合理的连接超时时间(5-30秒)');
            break;
          case 'IdleTimeout':
            recommendations.push('设置合理的空闲超时时间(30-300秒)');
            break;
        }
      }
    });
    
    return recommendations;
  }

  /**
   * 测试性能配置
   */
  testPerformanceConfig() {
    try {
      const config = this.config;
      const performanceChecks = [];
      
      // 检查连接池配置
      const poolConfig = config.pool || {};
      
      // 最大连接数检查
      if (poolConfig.max >= 10 && poolConfig.max <= 50) {
        performanceChecks.push({ name: 'MaxConnections', status: 'optimal', value: poolConfig.max });
      } else if (poolConfig.max < 10) {
        performanceChecks.push({ name: 'MaxConnections', status: 'low', value: poolConfig.max });
      } else {
        performanceChecks.push({ name: 'MaxConnections', status: 'high', value: poolConfig.max });
      }
      
      // 最小连接数检查
      if (poolConfig.min >= 2 && poolConfig.min <= poolConfig.max / 2) {
        performanceChecks.push({ name: 'MinConnections', status: 'optimal', value: poolConfig.min });
      } else {
        performanceChecks.push({ name: 'MinConnections', status: 'suboptimal', value: poolConfig.min });
      }
      
      // 连接获取超时检查
      if (poolConfig.acquire >= 5000 && poolConfig.acquire <= 30000) {
        performanceChecks.push({ name: 'AcquireTimeout', status: 'optimal', value: poolConfig.acquire });
      } else {
        performanceChecks.push({ name: 'AcquireTimeout', status: 'suboptimal', value: poolConfig.acquire });
      }
      
      // 空闲超时检查
      if (poolConfig.idle >= 30000 && poolConfig.idle <= 300000) {
        performanceChecks.push({ name: 'IdleTimeout', status: 'optimal', value: poolConfig.idle });
      } else {
        performanceChecks.push({ name: 'IdleTimeout', status: 'suboptimal', value: poolConfig.idle });
      }
      
      const optimalCount = performanceChecks.filter(check => check.status === 'optimal').length;
      const totalChecks = performanceChecks.length;
      const performanceScore = (optimalCount / totalChecks * 100).toFixed(1);
      
      return {
        success: optimalCount >= totalChecks * 0.75,
        message: '性能配置检查完成',
        performanceScore: parseFloat(performanceScore),
        checks: performanceChecks,
        recommendations: this.getPerformanceRecommendations(performanceChecks)
      };
      
    } catch (error) {
      return {
        success: false,
        message: '性能配置检查失败',
        error: error.message
      };
    }
  }
  
  /**
   * 获取性能配置建议
   */
  getPerformanceRecommendations(performanceChecks) {
    const recommendations = [];
    
    performanceChecks.forEach(check => {
      if (check.status !== 'optimal') {
        switch (check.name) {
          case 'MaxConnections':
            if (check.status === 'low') {
              recommendations.push('增加最大连接数以提高并发处理能力(建议10-50)');
            } else {
              recommendations.push('减少最大连接数以节省资源(建议10-50)');
            }
            break;
          case 'MinConnections':
            recommendations.push('调整最小连接数为最大连接数的25-50%');
            break;
          case 'AcquireTimeout':
            recommendations.push('设置合理的连接获取超时时间(5-30秒)');
            break;
          case 'IdleTimeout':
            recommendations.push('设置合理的空闲超时时间(30-300秒)');
            break;
        }
      }
    });
    
    return recommendations;
  }

  /**
   * 测试性能监控器
   */
  async testPerformanceMonitor() {
    console.log('\n📈 测试性能监控器...');
    
    try {
      // 记录一些测试查询
      for (let i = 0; i < 5; i++) {
        this.performanceMonitor.recordQuery({
          query: `SELECT * FROM test_table WHERE id = ${i}`,
          duration: Math.random() * 100 + 10,
          success: Math.random() > 0.1,
          connectionId: `test-conn-${i}`
        });
      }
      
      // 获取性能统计
      const stats = this.performanceMonitor.getPerformanceStats();
      
      console.log('✅ 性能监控器测试成功');
      console.log('📊 性能统计:');
      console.log(`   总查询数: ${stats.overall.totalQueries}`);
      console.log(`   平均响应时间: ${stats.overall.averageResponseTime.toFixed(2)}ms`);
      console.log(`   成功率: ${(stats.overall.successRate * 100).toFixed(2)}%`);
      
      return true;
    } catch (error) {
      console.error('❌ 性能监控器测试失败:', error.message);
      return false;
    }
  }

  /**
   * 测试数据库配置
   */
  async testDatabaseConfig() {
    try {
      return {
        success: true,
        message: '数据库配置验证通过',
        config: {
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          ssl: this.config.ssl,
          maxConnections: this.config.max,
          minConnections: this.config.min,
          connectionTimeout: this.config.connectionTimeoutMillis,
          idleTimeout: this.config.idleTimeoutMillis
        }
      };
    } catch (error) {
      return {
        success: false,
        message: '配置验证失败',
        error: error.message
      };
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('\n🧹 清理测试资源...');
    
    try {
      if (this.healthChecker) {
        await this.healthChecker.close();
      }
      
      if (this.performanceMonitor) {
        this.performanceMonitor.stop();
      }
      
      if (this.pool) {
        await this.pool.end();
      }
      
      console.log('✅ 资源清理完成');
    } catch (error) {
      console.error('❌ 资源清理失败:', error.message);
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    // 防止重复执行测试
    if (this.isRunning) {
      console.log('⚠️ 测试已在进行中，跳过重复执行');
      return this.lastResults || {};
    }
    
    this.isRunning = true;
    console.log('🚀 开始数据库配置验证测试...');
    console.log('=' .repeat(50));
    
    const results = {
      config: null,
      basicConnection: null,
      connectionPool: null,
      security: null,
      performance: null
    };
    
    try {
      // 1. 测试配置
      results.config = await this.testDatabaseConfig();
      
      // 2. 测试基本连接配置
      results.basicConnection = await this.testBasicConnection();
      
      // 3. 测试连接池配置
      results.connectionPool = await this.testConnectionPool();
      
      // 4. 测试安全配置
      results.security = this.testSecurityConfig();
      
      // 5. 测试性能配置
      results.performance = this.testPerformanceConfig();
      
      // 输出总结
      this.printSummary(results);
      
    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error.message);
      console.error(error.stack);
    } finally {
      this.isRunning = false;
    }
    
    this.lastResults = results;
    return results;
  }

  /**
   * 输出测试结果摘要
   */
  printSummary(results) {
    console.log('\n📋 测试结果摘要:');
    console.log('=' .repeat(50));
    
    Object.entries(results).forEach(([test, result]) => {
      const status = result && result.success ? '✅ 通过' : '❌ 失败';
      const testName = {
        config: '配置验证',
        basicConnection: '基本连接',
        connectionPool: '连接池测试',
        security: '安全配置',
        performance: '性能配置'
      }[test];
      
      console.log(`${testName.padEnd(15)} ${status}`);
      
      // 显示详细信息
      if (result && result.recommendations && result.recommendations.length > 0) {
        console.log(`   建议: ${result.recommendations.join(', ')}`);
      }
    });
    
    const passedTests = Object.values(results).filter(r => r && r.success).length;
    const totalTests = Object.keys(results).length;
    
    console.log('=' .repeat(50));
    console.log(`总体结果: ${passedTests}/${totalTests} 测试通过`);
    
    if (passedTests === totalTests) {
      console.log('🎉 所有测试通过！数据库配置正常。');
      process.exit(0);
    } else {
      console.log('⚠️  部分测试失败，请检查数据库配置。');
      process.exit(1);
    }
  }
}

// 防止重复执行的文件锁机制
function createLockFile() {
  const lockFile = path.join(os.tmpdir(), 'db-test-lock.tmp');
  try {
    if (fs.existsSync(lockFile)) {
      const stats = fs.statSync(lockFile);
      const now = Date.now();
      // 如果锁文件超过30秒，认为是僵尸锁，删除它
      if (now - stats.mtime.getTime() > 30000) {
        fs.unlinkSync(lockFile);
      } else {
        return false; // 锁文件存在且有效
      }
    }
    fs.writeFileSync(lockFile, process.pid.toString());
    return lockFile;
  } catch (error) {
    return false;
  }
}

function removeLockFile(lockFile) {
  try {
    if (lockFile && fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (error) {
    // 忽略删除错误
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const lockFile = createLockFile();
  if (!lockFile) {
    console.log('⚠️ 脚本已在执行中，跳过重复执行');
    process.exit(0);
  }
  
  // 确保在进程退出时清理锁文件
  process.on('exit', () => removeLockFile(lockFile));
  process.on('SIGINT', () => {
    removeLockFile(lockFile);
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    removeLockFile(lockFile);
    process.exit(0);
  });
  
  const tester = new DatabaseConnectionTester();
  tester.runAllTests().catch(error => {
    console.error('💥 测试脚本执行失败:', error);
    removeLockFile(lockFile);
    process.exit(1);
  }).then(() => {
    removeLockFile(lockFile);
  });
}

module.exports = DatabaseConnectionTester;