/**
 * @file database-init.js
 * @description 数据库初始化和迁移脚本
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const { getCurrentConfig, validateDatabaseConfig } = require('../lib/database/database.config');
const { healthChecker } = require('../lib/database/connection-health');

/**
 * 数据库初始化器
 */
class DatabaseInitializer {
  constructor() {
    this.pool = null;
    this.migrationPath = path.join(__dirname, '../migrations');
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    try {
      console.log('正在初始化数据库连接...');
      
      // 验证配置
      const env = process.env.NODE_ENV || 'development';
      if (!validateDatabaseConfig(env)) {
        throw new Error(`环境 ${env} 的数据库配置无效`);
      }

      // 初始化健康检查器
      this.pool = await healthChecker.initialize();
      console.log('数据库连接初始化成功');
      
      return true;
    } catch (error) {
      console.error('数据库连接初始化失败:', error);
      throw error;
    }
  }

  /**
   * 创建数据库表结构
   */
  async createTables() {
    try {
      console.log('正在创建数据库表结构...');
      
      // 创建迁移记录表
      await this.createMigrationTable();
      
      // 执行迁移文件
      await this.runMigrations();
      
      console.log('数据库表结构创建完成');
      return true;
    } catch (error) {
      console.error('创建数据库表结构失败:', error);
      throw error;
    }
  }

  /**
   * 创建迁移记录表
   */
  async createMigrationTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64),
        execution_time INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_filename ON migrations(filename);
      CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON migrations(executed_at);
    `;
    
    await healthChecker.query(createTableSQL);
    console.log('迁移记录表创建成功');
  }

  /**
   * 运行数据库迁移
   */
  async runMigrations() {
    try {
      // 检查迁移目录是否存在
      try {
        await fs.access(this.migrationPath);
      } catch (error) {
        console.log('迁移目录不存在，跳过迁移');
        return;
      }

      // 读取迁移文件
      const files = await fs.readdir(this.migrationPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        console.log('没有找到迁移文件');
        return;
      }

      // 获取已执行的迁移
      const executedMigrations = await this.getExecutedMigrations();
      
      // 执行未执行的迁移
      for (const file of migrationFiles) {
        if (!executedMigrations.includes(file)) {
          await this.executeMigration(file);
        } else {
          console.log(`迁移 ${file} 已执行，跳过`);
        }
      }
      
      console.log('所有迁移执行完成');
    } catch (error) {
      console.error('运行迁移失败:', error);
      throw error;
    }
  }

  /**
   * 获取已执行的迁移
   */
  async getExecutedMigrations() {
    try {
      const result = await healthChecker.query(
        'SELECT filename FROM migrations ORDER BY executed_at'
      );
      return result.rows.map(row => row.filename);
    } catch (error) {
      console.error('获取已执行迁移失败:', error);
      return [];
    }
  }

  /**
   * 执行单个迁移
   */
  async executeMigration(filename) {
    const startTime = Date.now();
    
    try {
      console.log(`正在执行迁移: ${filename}`);
      
      // 读取迁移文件
      const filePath = path.join(this.migrationPath, filename);
      const sql = await fs.readFile(filePath, 'utf8');
      
      // 计算校验和
      const crypto = require('crypto');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      
      // 开始事务
      const client = await healthChecker.getConnection();
      
      try {
        await client.query('BEGIN');
        
        // 执行迁移SQL
        await client.query(sql);
        
        // 记录迁移
        const executionTime = Date.now() - startTime;
        await client.query(
          'INSERT INTO migrations (filename, checksum, execution_time) VALUES ($1, $2, $3)',
          [filename, checksum, executionTime]
        );
        
        await client.query('COMMIT');
        console.log(`迁移 ${filename} 执行成功 (${executionTime}ms)`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(`迁移 ${filename} 执行失败:`, error);
      throw error;
    }
  }

  /**
   * 验证数据库连接
   */
  async validateConnection() {
    try {
      console.log('正在验证数据库连接...');
      
      const result = await healthChecker.query(
        'SELECT version() as version, current_database() as database, current_user as user'
      );
      
      const info = result.rows[0];
      console.log('数据库连接验证成功:');
      console.log(`- 数据库版本: ${info.version}`);
      console.log(`- 当前数据库: ${info.database}`);
      console.log(`- 当前用户: ${info.user}`);
      
      // 检查连接池状态
      const poolStatus = healthChecker.getPoolStatus();
      console.log('连接池状态:', poolStatus);
      
      return true;
    } catch (error) {
      console.error('数据库连接验证失败:', error);
      throw error;
    }
  }

  /**
   * 性能测试
   */
  async performanceTest() {
    try {
      console.log('正在进行数据库性能测试...');
      
      const testQueries = [
        'SELECT 1',
        'SELECT NOW()',
        'SELECT COUNT(*) FROM information_schema.tables',
        'SELECT pg_database_size(current_database()) as size'
      ];
      
      const results = [];
      
      for (const query of testQueries) {
        const startTime = Date.now();
        await healthChecker.query(query);
        const endTime = Date.now();
        
        results.push({
          query,
          duration: endTime - startTime
        });
      }
      
      console.log('性能测试结果:');
      results.forEach(result => {
        console.log(`- ${result.query}: ${result.duration}ms`);
      });
      
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      console.log(`平均响应时间: ${avgDuration.toFixed(2)}ms`);
      
      return results;
    } catch (error) {
      console.error('性能测试失败:', error);
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close() {
    if (healthChecker) {
      await healthChecker.close();
    }
    console.log('数据库连接已关闭');
  }
}

/**
 * 主函数
 */
async function main() {
  const initializer = new DatabaseInitializer();
  
  try {
    // 初始化连接
    await initializer.initialize();
    
    // 验证连接
    await initializer.validateConnection();
    
    // 创建表结构
    await initializer.createTables();
    
    // 性能测试
    await initializer.performanceTest();
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await initializer.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  DatabaseInitializer
};