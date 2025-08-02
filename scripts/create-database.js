/**
 * @file create-database.js
 * @description 创建数据库脚本
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * 创建数据库
 */
async function createDatabase() {
  const dbName = process.env.DB_NAME || 'zk-agent';
  const testDbName = process.env.DB_NAME_TEST || 'zk-agent-test';

  // 连接到默认的postgres数据库
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres', // 连接到默认数据库
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
  });

  try {
    console.log('正在连接到PostgreSQL服务器...');

    // 检查主数据库是否存在
    const checkMainDb = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

    if (checkMainDb.rows.length === 0) {
      console.log(`正在创建数据库: ${dbName}`);
      await pool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ 数据库 ${dbName} 创建成功`);
    } else {
      console.log(`✅ 数据库 ${dbName} 已存在`);
    }

    // 检查测试数据库是否存在
    const checkTestDb = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      testDbName,
    ]);

    if (checkTestDb.rows.length === 0) {
      console.log(`正在创建测试数据库: ${testDbName}`);
      await pool.query(`CREATE DATABASE "${testDbName}"`);
      console.log(`✅ 测试数据库 ${testDbName} 创建成功`);
    } else {
      console.log(`✅ 测试数据库 ${testDbName} 已存在`);
    }

    console.log('\n🎉 数据库创建完成！');
    console.log('现在可以运行以下命令继续设置：');
    console.log('  npm run db:generate  # 生成Prisma客户端');
    console.log('  npm run db:migrate   # 运行数据库迁移');
    console.log('  npm run db:seed      # 填充初始数据');
  } catch (error) {
    console.error('❌ 数据库创建失败:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 请确保PostgreSQL服务正在运行：');
      console.error('  Windows: 检查服务管理器中的PostgreSQL服务');
      console.error('  macOS: brew services start postgresql');
      console.error('  Linux: sudo systemctl start postgresql');
    } else if (error.code === '28P01') {
      console.error('\n💡 数据库认证失败，请检查用户名和密码');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 运行脚本
if (require.main === module) {
  createDatabase();
}

module.exports = { createDatabase };
