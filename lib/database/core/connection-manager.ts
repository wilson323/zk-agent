/**
 * @file Database Connection Manager
 * @description 统一数据库连接管理器
 */

import { EventEmitter } from 'events';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();
import { configManager } from '../../config';

/**
 * 数据库连接配置
 */
export interface DatabaseConnectionConfig {
  type: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb' | 'redis';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionPool?: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
  };
  options?: Record<string, any>;
}

/**
 * 连接状态
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * 连接统计信息
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  lastError?: Error;
}

/**
 * 数据库连接接口
 */
export interface DatabaseConnection {
  id: string;
  config: DatabaseConnectionConfig;
  status: ConnectionStatus;
  createdAt: Date;
  lastUsedAt: Date;
  queryCount: number;
  errorCount: number;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<T>;
  transaction<T>(callback: (trx: any) => Promise<T>): Promise<T>;
  ping(): Promise<boolean>;
  getStats(): ConnectionStats;
}

/**
 * 抽象数据库连接基类
 */
export abstract class BaseConnection extends EventEmitter implements DatabaseConnection {
  public readonly id: string;
  public readonly config: DatabaseConnectionConfig;
  public status: ConnectionStatus = 'disconnected';
  public readonly createdAt: Date = new Date();
  public lastUsedAt: Date = new Date();
  public queryCount: number = 0;
  public errorCount: number = 0;

  protected logger: Logger;
  protected client: any;

  constructor(id: string, config: DatabaseConnectionConfig) {
    super();
    this.id = id;
    this.config = config;
    this.logger = new Logger(`DB:${config.type}:${id}`);
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract query<T = any>(sql: string, params?: any[]): Promise<T>;
  abstract transaction<T>(callback: (trx: any) => Promise<T>): Promise<T>;
  abstract ping(): Promise<boolean>;

  /**
   * 获取连接统计信息
   */
  getStats(): ConnectionStats {
    return {
      totalConnections: 1,
      activeConnections: this.status === 'connected' ? 1 : 0,
      idleConnections: 0,
      waitingConnections: 0,
      totalQueries: this.queryCount,
      successfulQueries: this.queryCount - this.errorCount,
      failedQueries: this.errorCount,
      averageQueryTime: 0, // 需要子类实现
      lastError: undefined,
    };
  }

  /**
   * 更新最后使用时间
   */
  protected updateLastUsed(): void {
    this.lastUsedAt = new Date();
  }

  /**
   * 记录查询
   */
  protected recordQuery(success: boolean = true): void {
    this.queryCount++;
    if (!success) {
      this.errorCount++;
    }
    this.updateLastUsed();
  }
}

/**
 * MySQL连接实现
 */
export class MySQLConnection extends BaseConnection {
  private mysql: any;
  private pool: any;

  async connect(): Promise<void> {
    try {
      this.status = 'connecting';

      // 动态导入mysql2
      this.mysql = await import('mysql2/promise');

      // 创建连接池
      this.pool = this.mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        ...this.config.connectionPool,
        ...this.config.options,
      });

      // 测试连接
      await this.ping();

      this.status = 'connected';
      this.emit('connected');
      this.logger.info('MySQL connection established');
    } catch (error) {
      this.status = 'error';
      this.emit('error', error);
      this.logger.error('Failed to connect to MySQL', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.status = 'disconnected';
      this.emit('disconnected');
      this.logger.info('MySQL connection closed');
    } catch (error) {
      this.logger.error('Error closing MySQL connection', { error });
      throw error;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    try {
      const startTime = Date.now();
      const [rows] = await this.pool.execute(sql, params);
      const duration = Date.now() - startTime;

      this.recordQuery(true);
      this.logger.debug('Query executed', { sql, params, duration });

      return rows as T;
    } catch (error) {
      this.recordQuery(false);
      this.logger.error('Query failed', { sql, params, error });
      throw error;
    }
  }

  async transaction<T>(callback: (trx: any) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.execute('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * PostgreSQL连接实现
 */
export class PostgreSQLConnection extends BaseConnection {
  private pg: any;
  private pool: any;

  async connect(): Promise<void> {
    try {
      this.status = 'connecting';

      // 动态导入pg
      this.pg = await import('pg');

      // 创建连接池
      this.pool = new this.pg.Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        ...this.config.connectionPool,
        ...this.config.options,
      });

      // 测试连接
      await this.ping();

      this.status = 'connected';
      this.emit('connected');
      this.logger.info('PostgreSQL connection established');
    } catch (error) {
      this.status = 'error';
      this.emit('error', error);
      this.logger.error('Failed to connect to PostgreSQL', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      this.status = 'disconnected';
      this.emit('disconnected');
      this.logger.info('PostgreSQL connection closed');
    } catch (error) {
      this.logger.error('Error closing PostgreSQL connection', { error });
      throw error;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await this.pool.query(sql, params);
      const duration = Date.now() - startTime;

      this.recordQuery(true);
      this.logger.debug('Query executed', { sql, params, duration });

      return result.rows as T;
    } catch (error) {
      this.recordQuery(false);
      this.logger.error('Query failed', { sql, params, error });
      throw error;
    }
  }

  async transaction<T>(callback: (trx: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * 连接工厂
 */
export class ConnectionFactory {
  private static connectionTypes = new Map<
    string,
    new (id: string, config: DatabaseConnectionConfig) => DatabaseConnection
  >();

  static {
    // 注册内置连接类型
    ConnectionFactory.register('mysql', MySQLConnection);
    ConnectionFactory.register('postgresql', PostgreSQLConnection);
  }

  /**
   * 注册连接类型
   */
  static register(
    type: string,
    connectionClass: new (id: string, config: DatabaseConnectionConfig) => DatabaseConnection
  ): void {
    ConnectionFactory.connectionTypes.set(type, connectionClass);
  }

  /**
   * 创建连接
   */
  static create(id: string, config: DatabaseConnectionConfig): DatabaseConnection {
    const ConnectionClass = ConnectionFactory.connectionTypes.get(config.type);

    if (!ConnectionClass) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    return new ConnectionClass(id, config);
  }

  /**
   * 获取支持的数据库类型
   */
  static getSupportedTypes(): string[] {
    return Array.from(ConnectionFactory.connectionTypes.keys());
  }
}

/**
 * 数据库连接管理器
 */
export class DatabaseConnectionManager extends EventEmitter {
  private connections = new Map<string, DatabaseConnection>();
  private logger = new Logger('DatabaseConnectionManager');
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startHealthCheck();
  }

  /**
   * 添加连接
   */
  async addConnection(id: string, config: DatabaseConnectionConfig): Promise<void> {
    if (this.connections.has(id)) {
      throw new Error(`Connection with id '${id}' already exists`);
    }

    const connection = ConnectionFactory.create(id, config);

    // 监听连接事件
    connection.on('connected', () => {
      this.emit('connectionConnected', { id, connection });
    });

    connection.on('disconnected', () => {
      this.emit('connectionDisconnected', { id, connection });
    });

    connection.on('error', error => {
      this.emit('connectionError', { id, connection, error });
    });

    this.connections.set(id, connection);
    await connection.connect();

    this.logger.info(`Connection '${id}' added and connected`);
  }

  /**
   * 移除连接
   */
  async removeConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);

    if (!connection) {
      throw new Error(`Connection with id '${id}' not found`);
    }

    await connection.disconnect();
    this.connections.delete(id);

    this.logger.info(`Connection '${id}' removed`);
  }

  /**
   * 获取连接
   */
  getConnection(id: string): DatabaseConnection {
    const connection = this.connections.get(id);

    if (!connection) {
      throw new Error(`Connection with id '${id}' not found`);
    }

    return connection;
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): Map<string, DatabaseConnection> {
    return new Map(this.connections);
  }

  /**
   * 检查连接是否存在
   */
  hasConnection(id: string): boolean {
    return this.connections.has(id);
  }

  /**
   * 获取连接统计信息
   */
  getStats(): Record<string, ConnectionStats> {
    const stats: Record<string, ConnectionStats> = {};

    for (const [id, connection] of this.connections) {
      stats[id] = connection.getStats();
    }

    return stats;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [id, connection] of this.connections) {
      try {
        results[id] = await connection.ping();
      } catch (error) {
        results[id] = false;
        this.logger.warn(`Health check failed for connection '${id}'`, { error });
      }
    }

    return results;
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    const interval = configManager.get('database.healthCheck.interval', 30000);

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (error) {
        this.logger.error('Health check error', { error });
      }
    }, interval);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * 关闭所有连接
   */
  async close(): Promise<void> {
    this.stopHealthCheck();

    const promises = Array.from(this.connections.keys()).map(id => this.removeConnection(id));

    await Promise.all(promises);
    this.logger.info('All connections closed');
  }
}

// 导出单例实例
export const connectionManager = new DatabaseConnectionManager();

/**
 * 初始化数据库连接
 */
export async function initializeDatabaseConnections(): Promise<void> {
  const dbConfigs = configManager.get('database.connections', {});

  for (const [id, config] of Object.entries(dbConfigs)) {
    try {
      await connectionManager.addConnection(id, config as DatabaseConnectionConfig);
    } catch (error) {
      const logger = new Logger('DatabaseInit');
      logger.error(`Failed to initialize connection '${id}'`, { error });
      throw error;
    }
  }
}
