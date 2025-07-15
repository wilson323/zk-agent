/**
 * @file Database Utilities
 * @description 数据库工具类 - 提供数据库操作的便利方法和实用工具
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { DatabaseConnectionManager } from '../core/connection-manager';
import { QueryBuilder } from '../core/query-builder';
import { schemaBuilder } from '../schema/schema-builder';
import { MigrationManager } from '../migrations/migration-manager';
import { SeedManager } from '../seeds/seed-manager';

/**
 * 数据库备份配置
 */
export interface BackupConfig {
  path: string;
  compression?: boolean;
  includeData?: boolean;
  includeSchema?: boolean;
  tables?: string[];
  excludeTables?: string[];
}

/**
 * 数据库统计信息
 */
export interface DatabaseStats {
  totalTables: number;
  totalRows: number;
  totalSize: string;
  largestTable: {
    name: string;
    rows: number;
    size: string;
  };
  tableStats: Array<{
    name: string;
    rows: number;
    size: string;
    engine: string;
  }>;
}

/**
 * 表分析结果
 */
export interface TableAnalysis {
  tableName: string;
  rowCount: number;
  avgRowLength: number;
  dataLength: number;
  indexLength: number;
  autoIncrement: number | null;
  engine: string;
  collation: string;
  createTime: Date | null;
  updateTime: Date | null;
  checkTime: Date | null;
  comment: string;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
    type: string;
  }>;
  foreignKeys: Array<{
    name: string;
    columns: string[];
    referencedTable: string;
    referencedColumns: string[];
  }>;
}

/**
 * 数据库工具类
 */
export class DatabaseUtils {
  private connectionManager: DatabaseConnectionManager;
  private queryBuilder: QueryBuilder | null = null;

  constructor() {
    this.connectionManager = DatabaseConnectionManager.getInstance();
  }

  /**
   * 获取查询构建器
   */
  private async getQueryBuilder(): Promise<QueryBuilder> {
    if (!this.queryBuilder) {
      const connection = await this.connectionManager.getConnection('default');
      this.queryBuilder = new QueryBuilder(connection);
    }
    return this.queryBuilder;
  }

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    const queryBuilder = await this.getQueryBuilder();
    
    // 获取表统计信息
    const tableStatsQuery = `
      SELECT 
        table_name as name,
        table_rows as rows,
        ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb,
        engine
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY (data_length + index_length) DESC
    `;
    
    const tableStats = await queryBuilder.raw(tableStatsQuery);
    
    // 计算总计
    const totalTables = tableStats.length;
    const totalRows = tableStats.reduce((sum, table) => sum + (table.rows || 0), 0);
    const totalSizeMB = tableStats.reduce((sum, table) => sum + (table.size_mb || 0), 0);
    
    // 找出最大的表
    const largestTable = tableStats[0] || { name: '', rows: 0, size_mb: 0 };
    
    return {
      totalTables,
      totalRows,
      totalSize: `${totalSizeMB.toFixed(2)} MB`,
      largestTable: {
        name: largestTable.name,
        rows: largestTable.rows || 0,
        size: `${(largestTable.size_mb || 0).toFixed(2)} MB`
      },
      tableStats: tableStats.map(table => ({
        name: table.name,
        rows: table.rows || 0,
        size: `${(table.size_mb || 0).toFixed(2)} MB`,
        engine: table.engine || 'Unknown'
      }))
    };
  }

  /**
   * 分析表结构
   */
  async analyzeTable(tableName: string): Promise<TableAnalysis> {
    const queryBuilder = await this.getQueryBuilder();
    
    // 获取表基本信息
    const tableInfoQuery = `
      SELECT 
        table_rows as row_count,
        avg_row_length,
        data_length,
        index_length,
        auto_increment,
        engine,
        table_collation as collation,
        create_time,
        update_time,
        check_time,
        table_comment as comment
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = ?
    `;
    
    const tableInfo = await queryBuilder.raw(tableInfoQuery, [tableName]);
    const info = tableInfo[0];
    
    // 获取索引信息
    const indexQuery = `
      SELECT 
        index_name as name,
        column_name,
        non_unique,
        index_type as type
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() AND table_name = ?
      ORDER BY index_name, seq_in_index
    `;
    
    const indexData = await queryBuilder.raw(indexQuery, [tableName]);
    
    // 组织索引信息
    const indexMap = new Map<string, any>();
    indexData.forEach(row => {
      if (!indexMap.has(row.name)) {
        indexMap.set(row.name, {
          name: row.name,
          columns: [],
          unique: row.non_unique === 0,
          type: row.type
        });
      }
      indexMap.get(row.name).columns.push(row.column_name);
    });
    
    // 获取外键信息
    const foreignKeyQuery = `
      SELECT 
        constraint_name as name,
        column_name,
        referenced_table_name as referenced_table,
        referenced_column_name as referenced_column
      FROM information_schema.key_column_usage 
      WHERE table_schema = DATABASE() 
        AND table_name = ? 
        AND referenced_table_name IS NOT NULL
      ORDER BY constraint_name, ordinal_position
    `;
    
    const foreignKeyData = await queryBuilder.raw(foreignKeyQuery, [tableName]);
    
    // 组织外键信息
    const foreignKeyMap = new Map<string, any>();
    foreignKeyData.forEach(row => {
      if (!foreignKeyMap.has(row.name)) {
        foreignKeyMap.set(row.name, {
          name: row.name,
          columns: [],
          referencedTable: row.referenced_table,
          referencedColumns: []
        });
      }
      foreignKeyMap.get(row.name).columns.push(row.column_name);
      foreignKeyMap.get(row.name).referencedColumns.push(row.referenced_column);
    });
    
    return {
      tableName,
      rowCount: info?.row_count || 0,
      avgRowLength: info?.avg_row_length || 0,
      dataLength: info?.data_length || 0,
      indexLength: info?.index_length || 0,
      autoIncrement: info?.auto_increment || null,
      engine: info?.engine || 'Unknown',
      collation: info?.collation || 'Unknown',
      createTime: info?.create_time || null,
      updateTime: info?.update_time || null,
      checkTime: info?.check_time || null,
      comment: info?.comment || '',
      indexes: Array.from(indexMap.values()),
      foreignKeys: Array.from(foreignKeyMap.values())
    };
  }

  /**
   * 获取所有表名
   */
  async getAllTables(): Promise<string[]> {
    const queryBuilder = await this.getQueryBuilder();
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `;
    
    const result = await queryBuilder.raw(query);
    return result.map(row => row.table_name);
  }

  /**
   * 获取表的列信息
   */
  async getTableColumns(tableName: string): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    const query = `
      SELECT 
        column_name as name,
        data_type as type,
        is_nullable as nullable,
        column_default as default_value,
        character_maximum_length as max_length,
        numeric_precision,
        numeric_scale,
        column_comment as comment,
        extra
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() AND table_name = ?
      ORDER BY ordinal_position
    `;
    
    return await queryBuilder.raw(query, [tableName]);
  }

  /**
   * 检查表是否存在
   */
  async tableExists(tableName: string): Promise<boolean> {
    return await schemaBuilder.hasTable(tableName);
  }

  /**
   * 检查列是否存在
   */
  async columnExists(tableName: string, columnName: string): Promise<boolean> {
    return await schemaBuilder.hasColumn(tableName, columnName);
  }

  /**
   * 清空表数据
   */
  async truncateTable(tableName: string): Promise<void> {
    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(`TRUNCATE TABLE \`${tableName}\``);
  }

  /**
   * 复制表结构
   */
  async copyTableStructure(sourceTable: string, targetTable: string, includeData = false): Promise<void> {
    const queryBuilder = await this.getQueryBuilder();
    
    if (includeData) {
      await queryBuilder.raw(`CREATE TABLE \`${targetTable}\` AS SELECT * FROM \`${sourceTable}\``);
    } else {
      await queryBuilder.raw(`CREATE TABLE \`${targetTable}\` LIKE \`${sourceTable}\``);
    }
  }

  /**
   * 优化表
   */
  async optimizeTable(tableName: string): Promise<void> {
    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(`OPTIMIZE TABLE \`${tableName}\``);
  }

  /**
   * 分析表
   */
  async analyzeTablePerformance(tableName: string): Promise<void> {
    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(`ANALYZE TABLE \`${tableName}\``);
  }

  /**
   * 检查表
   */
  async checkTable(tableName: string): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    return await queryBuilder.raw(`CHECK TABLE \`${tableName}\``);
  }

  /**
   * 修复表
   */
  async repairTable(tableName: string): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    return await queryBuilder.raw(`REPAIR TABLE \`${tableName}\``);
  }

  /**
   * 获取数据库大小
   */
  async getDatabaseSize(): Promise<{ size: number; sizeFormatted: string }> {
    const queryBuilder = await this.getQueryBuilder();
    const query = `
      SELECT 
        SUM(data_length + index_length) as size_bytes
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `;
    
    const result = await queryBuilder.raw(query);
    const sizeBytes = result[0]?.size_bytes || 0;
    const sizeMB = sizeBytes / (1024 * 1024);
    
    return {
      size: sizeBytes,
      sizeFormatted: sizeMB > 1024 
        ? `${(sizeMB / 1024).toFixed(2)} GB`
        : `${sizeMB.toFixed(2)} MB`
    };
  }

  /**
   * 执行数据库备份
   */
  async backup(config: BackupConfig): Promise<string> {
    // 这里可以实现数据库备份逻辑
    // 由于涉及到文件系统操作，这里只是一个示例框架
    throw new Error('Backup functionality not implemented yet');
  }

  /**
   * 从备份恢复数据库
   */
  async restore(backupPath: string): Promise<void> {
    // 这里可以实现数据库恢复逻辑
    throw new Error('Restore functionality not implemented yet');
  }

  /**
   * 获取慢查询日志
   */
  async getSlowQueries(limit = 100): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    
    // 检查慢查询日志是否启用
    const logStatus = await queryBuilder.raw("SHOW VARIABLES LIKE 'slow_query_log'");
    if (logStatus[0]?.Value !== 'ON') {
      throw new Error('Slow query log is not enabled');
    }
    
    // 这里需要根据实际的慢查询日志表结构来查询
    // 通常需要解析慢查询日志文件或使用性能模式表
    const query = `
      SELECT 
        sql_text,
        exec_count,
        total_latency,
        mean_latency,
        max_latency
      FROM performance_schema.events_statements_summary_by_digest 
      ORDER BY total_latency DESC 
      LIMIT ?
    `;
    
    return await queryBuilder.raw(query, [limit]);
  }

  /**
   * 获取表锁信息
   */
  async getTableLocks(): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    const query = `
      SELECT 
        object_schema as database_name,
        object_name as table_name,
        lock_type,
        lock_duration,
        lock_status
      FROM performance_schema.metadata_locks 
      WHERE object_type = 'TABLE'
    `;
    
    return await queryBuilder.raw(query);
  }

  /**
   * 获取连接信息
   */
  async getConnections(): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    const query = `
      SELECT 
        id,
        user,
        host,
        db,
        command,
        time,
        state,
        info
      FROM information_schema.processlist 
      ORDER BY time DESC
    `;
    
    return await queryBuilder.raw(query);
  }

  /**
   * 杀死连接
   */
  async killConnection(connectionId: number): Promise<void> {
    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(`KILL ${connectionId}`);
  }

  /**
   * 获取数据库变量
   */
  async getVariables(pattern?: string): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    const query = pattern 
      ? `SHOW VARIABLES LIKE '${pattern}'`
      : 'SHOW VARIABLES';
    
    return await queryBuilder.raw(query);
  }

  /**
   * 获取数据库状态
   */
  async getStatus(pattern?: string): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    const query = pattern 
      ? `SHOW STATUS LIKE '${pattern}'`
      : 'SHOW STATUS';
    
    return await queryBuilder.raw(query);
  }

  /**
   * 执行EXPLAIN查询
   */
  async explainQuery(sql: string, params?: any[]): Promise<any[]> {
    const queryBuilder = await this.getQueryBuilder();
    const explainSQL = `EXPLAIN ${sql}`;
    return await queryBuilder.raw(explainSQL, params);
  }

  /**
   * 获取表的存储引擎
   */
  async getTableEngine(tableName: string): Promise<string> {
    const queryBuilder = await this.getQueryBuilder();
    const query = `
      SELECT engine 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = ?
    `;
    
    const result = await queryBuilder.raw(query, [tableName]);
    return result[0]?.engine || 'Unknown';
  }

  /**
   * 更改表的存储引擎
   */
  async changeTableEngine(tableName: string, engine: string): Promise<void> {
    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(`ALTER TABLE \`${tableName}\` ENGINE = ${engine}`);
  }

  /**
   * 获取数据库健康检查报告
   */
  async getHealthReport(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warning' | 'fail';
      message: string;
      value?: any;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    try {
      // 检查连接
      const connections = await this.getConnections();
      checks.push({
        name: 'Database Connection',
        status: 'pass',
        message: `${connections.length} active connections`
      });
      
      // 检查数据库大小
      const dbSize = await this.getDatabaseSize();
      const sizeGB = dbSize.size / (1024 * 1024 * 1024);
      checks.push({
        name: 'Database Size',
        status: sizeGB > 10 ? 'warning' : 'pass',
        message: `Database size: ${dbSize.sizeFormatted}`,
        value: dbSize.size
      });
      
      if (sizeGB > 10) overallStatus = 'warning';
      
      // 检查表数量
      const tables = await this.getAllTables();
      checks.push({
        name: 'Table Count',
        status: tables.length > 100 ? 'warning' : 'pass',
        message: `${tables.length} tables in database`
      });
      
      if (tables.length > 100 && overallStatus === 'healthy') {
        overallStatus = 'warning';
      }
      
    } catch (error) {
      checks.push({
        name: 'Database Health Check',
        status: 'fail',
        message: `Health check failed: ${error.message}`
      });
      overallStatus = 'critical';
    }
    
    return {
      status: overallStatus,
      checks
    };
  }
}

// 导出单例实例
export const databaseUtils = new DatabaseUtils();

/**
 * 数据库工具函数
 */
export const DatabaseUtilityFunctions = {
  /**
   * 格式化字节大小
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * 生成随机表名
   */
  generateRandomTableName(prefix = 'temp'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  },
  
  /**
   * 验证表名
   */
  validateTableName(tableName: string): boolean {
    // 表名只能包含字母、数字和下划线，且不能以数字开头
    const regex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return regex.test(tableName) && tableName.length <= 64;
  },
  
  /**
   * 验证列名
   */
  validateColumnName(columnName: string): boolean {
    // 列名规则与表名相同
    return this.validateTableName(columnName);
  },
  
  /**
   * 转义SQL标识符
   */
  escapeIdentifier(identifier: string): string {
    return `\`${identifier.replace(/`/g, '``')}\``;
  },
  
  /**
   * 转义SQL字符串值
   */
  escapeString(value: string): string {
    return value.replace(/'/g, "''");
  },
  
  /**
   * 生成UUID
   */
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};