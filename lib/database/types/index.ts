/**
 * @file Database Types
 * @description 数据库类型定义 - 为统一数据库架构提供完整的类型支持
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

// ============= 基础类型 =============

/**
 * 数据库类型
 */
export type DatabaseType = 'mysql' | 'postgresql' | 'sqlite' | 'mssql' | 'oracle';

/**
 * 连接状态
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * 查询类型
 */
export type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'raw';

/**
 * 事务隔离级别
 */
export type IsolationLevel = 
  | 'READ_UNCOMMITTED'
  | 'READ_COMMITTED'
  | 'REPEATABLE_READ'
  | 'SERIALIZABLE';

/**
 * 排序方向
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * JOIN 类型
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

/**
 * 聚合函数类型
 */
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

// ============= 连接相关类型 =============

/**
 * 数据库连接配置
 */
export interface DatabaseConnectionConfig {
  id: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  charset?: string;
  timezone?: string;
  ssl?: boolean | {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
  pool?: {
    min?: number;
    max?: number;
    acquireTimeoutMillis?: number;
    createTimeoutMillis?: number;
    destroyTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    reapIntervalMillis?: number;
    createRetryIntervalMillis?: number;
  };
  options?: Record<string, any>;
}

/**
 * 连接统计信息
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  pendingConnections: number;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageQueryTime: number;
  lastQueryTime: Date | null;
  uptime: number;
}

/**
 * 数据库连接接口
 */
export interface DatabaseConnection {
  id: string;
  type: DatabaseType;
  config: DatabaseConnectionConfig;
  status: ConnectionStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getStats(): ConnectionStats;
  ping(): Promise<boolean>;
}

// ============= 查询相关类型 =============

/**
 * WHERE 条件操作符
 */
export type WhereOperator = 
  | '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=' 
  | 'LIKE' | 'NOT LIKE' | 'ILIKE' | 'NOT ILIKE'
  | 'IN' | 'NOT IN' | 'BETWEEN' | 'NOT BETWEEN'
  | 'IS NULL' | 'IS NOT NULL'
  | 'EXISTS' | 'NOT EXISTS'
  | 'REGEXP' | 'NOT REGEXP';

/**
 * WHERE 条件
 */
export interface WhereCondition {
  column: string;
  operator: WhereOperator;
  value?: any;
  logic?: 'AND' | 'OR';
}

/**
 * JOIN 条件
 */
export interface JoinCondition {
  type: JoinType;
  table: string;
  on: string;
  alias?: string;
}

/**
 * 排序条件
 */
export interface OrderByCondition {
  column: string;
  direction: SortDirection;
}

/**
 * 分组条件
 */
export interface GroupByCondition {
  columns: string[];
  having?: WhereCondition[];
}

/**
 * 查询选项
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  distinct?: boolean;
  forUpdate?: boolean;
  timeout?: number;
}

/**
 * 查询结果
 */
export interface QueryResult<T = any> {
  data: T[];
  total?: number;
  affectedRows?: number;
  insertId?: number;
  executionTime: number;
  sql: string;
  params?: any[];
}

/**
 * 分页结果
 */
export interface PaginatedResult<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ============= 模型相关类型 =============

/**
 * 模型配置
 */
export interface ModelConfig {
  table: string;
  primaryKey?: string | string[];
  timestamps?: boolean;
  softDeletes?: boolean;
  connection?: string;
  fillable?: string[];
  guarded?: string[];
  hidden?: string[];
  casts?: Record<string, string>;
  dates?: string[];
}

/**
 * 关系类型
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/**
 * 关系配置
 */
export interface RelationConfig {
  type: RelationType;
  model: string;
  foreignKey?: string;
  localKey?: string;
  pivotTable?: string;
  pivotForeignKey?: string;
  pivotRelatedKey?: string;
  timestamps?: boolean;
}

/**
 * 模型事件类型
 */
export type ModelEventType = 
  | 'creating' | 'created'
  | 'updating' | 'updated'
  | 'deleting' | 'deleted'
  | 'saving' | 'saved'
  | 'restoring' | 'restored';

/**
 * 模型事件处理器
 */
export type ModelEventHandler<T = any> = (model: T) => Promise<void> | void;

/**
 * 模型验证规则
 */
export interface ValidationRule {
  field: string;
  rules: string[];
  message?: string;
}

/**
 * 模型验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

// ============= 迁移相关类型 =============

/**
 * 迁移状态
 */
export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';

/**
 * 迁移记录
 */
export interface MigrationRecord {
  id: string;
  name: string;
  batch: number;
  status: MigrationStatus;
  executedAt: Date;
  rollbackAt?: Date;
  executionTime: number;
  error?: string;
}

/**
 * 迁移接口
 */
export interface Migration {
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

/**
 * 迁移配置
 */
export interface MigrationConfig {
  directory: string;
  tableName: string;
  connection?: string;
  lockTimeout?: number;
  batchSize?: number;
}

// ============= 种子相关类型 =============

/**
 * 种子状态
 */
export type SeedStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 种子记录
 */
export interface SeedRecord {
  id: string;
  name: string;
  status: SeedStatus;
  executedAt: Date;
  executionTime: number;
  error?: string;
}

/**
 * 种子接口
 */
export interface Seed {
  name: string;
  run(): Promise<void>;
}

/**
 * 种子配置
 */
export interface SeedConfig {
  directory: string;
  tableName: string;
  connection?: string;
  batchSize?: number;
}

// ============= 模式相关类型 =============

/**
 * 列类型
 */
export type ColumnType = 
  | 'bigint' | 'int' | 'smallint' | 'tinyint'
  | 'decimal' | 'float' | 'double'
  | 'varchar' | 'char' | 'text' | 'longtext'
  | 'date' | 'datetime' | 'timestamp' | 'time'
  | 'boolean' | 'json' | 'blob' | 'binary'
  | 'enum' | 'set';

/**
 * 列定义
 */
export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  default?: any;
  autoIncrement?: boolean;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
  comment?: string;
  enumValues?: string[];
  after?: string;
  first?: boolean;
}

/**
 * 索引类型
 */
export type IndexType = 'index' | 'unique' | 'fulltext' | 'spatial';

/**
 * 索引定义
 */
export interface IndexDefinition {
  name: string;
  columns: string[];
  type: IndexType;
  method?: 'btree' | 'hash';
  comment?: string;
}

/**
 * 外键动作
 */
export type ForeignKeyAction = 'cascade' | 'set null' | 'restrict' | 'no action';

/**
 * 外键定义
 */
export interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onUpdate?: ForeignKeyAction;
  onDelete?: ForeignKeyAction;
}

/**
 * 表定义
 */
export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
  engine?: string;
  charset?: string;
  collation?: string;
  comment?: string;
  temporary?: boolean;
}

// ============= 性能相关类型 =============

/**
 * 查询性能统计
 */
export interface QueryPerformanceStats {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  fastestQuery: {
    sql: string;
    time: number;
  };
  slowestQuery: {
    sql: string;
    time: number;
  };
  queryTypeStats: Record<QueryType, {
    count: number;
    averageTime: number;
  }>;
}

/**
 * 缓存统计
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  evictions: number;
}

/**
 * 数据库性能指标
 */
export interface DatabasePerformanceMetrics {
  connections: ConnectionStats;
  queries: QueryPerformanceStats;
  cache?: CacheStats;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  timestamp: Date;
}

// ============= 事务相关类型 =============

/**
 * 事务状态
 */
export type TransactionStatus = 'active' | 'committed' | 'rolled_back' | 'failed';

/**
 * 事务配置
 */
export interface TransactionConfig {
  isolationLevel?: IsolationLevel;
  timeout?: number;
  readOnly?: boolean;
}

/**
 * 事务接口
 */
export interface Transaction {
  id: string;
  status: TransactionStatus;
  startTime: Date;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }>;
}

// ============= 错误相关类型 =============

/**
 * 数据库错误类型
 */
export type DatabaseErrorType = 
  | 'CONNECTION_ERROR'
  | 'QUERY_ERROR'
  | 'TRANSACTION_ERROR'
  | 'VALIDATION_ERROR'
  | 'CONSTRAINT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * 数据库错误
 */
export interface DatabaseError extends Error {
  type: DatabaseErrorType;
  code?: string | number;
  sql?: string;
  params?: any[];
  originalError?: Error;
}

// ============= 配置相关类型 =============

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  default: string;
  connections: Record<string, DatabaseConnectionConfig>;
  migrations?: MigrationConfig;
  seeds?: SeedConfig;
  cache?: {
    enabled: boolean;
    driver: 'memory' | 'redis';
    ttl: number;
    prefix: string;
  };
  logging?: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    slowQueryThreshold: number;
  };
  performance?: {
    monitoring: boolean;
    metricsInterval: number;
    slowQueryThreshold: number;
  };
}

// ============= 工具类型 =============

/**
 * 深度部分类型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 可选字段类型
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必需字段类型
 */
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * 数据库记录类型
 */
export type DatabaseRecord = Record<string, any>;

/**
 * 查询构建器回调
 */
export type QueryBuilderCallback = (builder: any) => void;

/**
 * 模型构造函数类型
 */
export type ModelConstructor<T = any> = new (...args: any[]) => T;

/**
 * 关系加载器
 */
export type RelationLoader<T = any> = (models: T[]) => Promise<void>;

// ============= 导出所有类型 =============

export * from './connection-types';
export * from './query-types';
export * from './model-types';
export * from './migration-types';
export * from './schema-types';
export * from './performance-types';