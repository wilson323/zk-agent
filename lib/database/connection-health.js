/**
 * @file connection-health.js
 * @description 数据库连接健康检查和重连机制
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

const { getCurrentConfig } = require('./database.config');
const { Pool } = require('pg');
const EventEmitter = require('events');

/**
 * 数据库连接健康检查器
 */
class DatabaseHealthChecker extends EventEmitter {
  constructor() {
    super();
    this.pool = null;
    this.isHealthy = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5秒
    this.healthCheckInterval = 30000; // 30秒
    this.healthCheckTimer = null;
  }

  /**
   * 初始化数据库连接池
   */
  async initialize() {
    try {
      const config = getCurrentConfig();
      
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        max: config.pool.max,
        min: config.pool.min,
        idleTimeoutMillis: config.pool.idle,
        connectionTimeoutMillis: config.pool.acquire,
        ssl: config.ssl,
        // 连接重试配置
        retryDelayMs: 1000,
        maxRetries: 3
      });

      // 监听连接池事件
      this.pool.on('connect', (client) => {
        console.log('数据库连接已建立');
        this.isHealthy = true;
        this.reconnectAttempts = 0;
        this.emit('connected', client);
      });

      this.pool.on('error', (err) => {
        console.error('数据库连接池错误:', err);
        this.isHealthy = false;
        this.emit('error', err);
        this.handleConnectionError(err);
      });

      this.pool.on('remove', (client) => {
        console.log('数据库连接已移除');
        this.emit('disconnected', client);
      });

      // 启动健康检查
      this.startHealthCheck();
      
      // 初始连接测试
      await this.testConnection();
      
      console.log('数据库连接池初始化成功');
      return this.pool;
    } catch (error) {
      console.error('数据库连接池初始化失败:', error);
      throw error;
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      this.isHealthy = true;
      console.log('数据库连接测试成功:', result.rows[0].current_time);
      return true;
    } catch (error) {
      this.isHealthy = false;
      console.error('数据库连接测试失败:', error);
      throw error;
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.testConnection();
        if (!this.isHealthy) {
          console.log('数据库连接已恢复');
          this.isHealthy = true;
          this.emit('recovered');
        }
      } catch (error) {
        if (this.isHealthy) {
          console.error('数据库健康检查失败:', error);
          this.isHealthy = false;
          this.emit('unhealthy', error);
        }
      }
    }, this.healthCheckInterval);
  }

  /**
   * 处理连接错误
   */
  async handleConnectionError(error) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      this.emit('maxReconnectAttemptsReached', error);
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试重连数据库 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.testConnection();
        console.log('数据库重连成功');
        this.emit('reconnected');
      } catch (reconnectError) {
        console.error('数据库重连失败:', reconnectError);
        this.handleConnectionError(reconnectError);
      }
    }, this.reconnectDelay * this.reconnectAttempts); // 指数退避
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus() {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }

    return {
      status: this.isHealthy ? 'healthy' : 'unhealthy',
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  /**
   * 获取连接
   */
  async getConnection() {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    if (!this.isHealthy) {
      throw new Error('数据库连接不健康');
    }

    return await this.pool.connect();
  }

  /**
   * 执行查询
   */
  async query(text, params) {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化');
    }

    if (!this.isHealthy) {
      throw new Error('数据库连接不健康');
    }

    return await this.pool.query(text, params);
  }

  /**
   * 关闭连接池
   */
  async close() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    this.isHealthy = false;
    console.log('数据库连接池已关闭');
  }
}

// 单例实例
const healthChecker = new DatabaseHealthChecker();

// 便捷函数
const testConnection = async () => {
  if (!healthChecker.pool) {
    await healthChecker.initialize();
  }
  return await healthChecker.testConnection();
};

module.exports = {
  DatabaseHealthChecker,
  healthChecker,
  testConnection
};