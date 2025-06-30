/**
 * @file test-db-connection.js
 * @description 数据库连接测试脚本
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

const { Client } = require('pg');
const { getDatabaseConfig, getDatabaseUrl } = require('../config/database.config');

/**
 * 测试数据库连接
 * @param {string} environment - 环境名称 (development, test, production)
 * @returns {Promise<boolean>} 连接是否成功
 */
async function testDatabaseConnection(environment = 'development') {
  let client;
  
  try {
    console.log(`\n🔍 测试 ${environment} 环境数据库连接...`);
    
    const config = getDatabaseConfig();
    const connectionUrl = getDatabaseUrl(environment);
    
    console.log(`📊 数据库配置:`);
    console.log(`   主机: ${config.host}`);
    console.log(`   端口: ${config.port}`);
    console.log(`   数据库: ${config.database}`);
    console.log(`   用户: ${config.username}`);
    console.log(`   连接字符串: ${connectionUrl}`);
    
    // 创建数据库连接
    client = new Client({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      connectionTimeoutMillis: 5000,
    });
    
    // 连接数据库
    await client.connect();
    console.log('✅ 数据库连接成功!');
    
    // 执行测试查询
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log(`⏰ 当前时间: ${result.rows[0].current_time}`);
    console.log(`🐘 PostgreSQL版本: ${result.rows[0].pg_version.split(',')[0]}`);
    
    // 检查是否存在测试连接函数
    try {
      const testResult = await client.query('SELECT test_connection() as message');
      console.log(`📝 ${testResult.rows[0].message}`);
    } catch (error) {
      console.log('ℹ️  测试连接函数不存在，可能需要运行数据库初始化脚本');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error(`   错误类型: ${error.code || 'UNKNOWN'}`);
    console.error(`   错误信息: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 可能的解决方案:');
      console.error('   1. 确保PostgreSQL服务正在运行');
      console.error('   2. 检查数据库服务器地址和端口');
      console.error('   3. 确认防火墙设置');
    } else if (error.code === '3D000') {
      console.error('\n💡 数据库不存在，请运行以下命令创建:');
      console.error('   psql -U postgres -h localhost -p 5432 -f scripts/init-zk-agent-db.sql');
    } else if (error.code === '28P01') {
      console.error('\n💡 认证失败，请检查用户名和密码');
    }
    
    return false;
    
  } finally {
    if (client) {
      await client.end();
    }
  }
}

/**
 * 检查数据库是否存在
 * @param {string} dbName - 数据库名称
 * @returns {Promise<boolean>} 数据库是否存在
 */
async function checkDatabaseExists(dbName = 'zk_agent') {
  let client;
  
  try {
    console.log(`\n🔍 检查数据库 '${dbName}' 是否存在...`);
    
    // 连接到postgres默认数据库
    client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '123456',
      connectionTimeoutMillis: 5000,
    });
    
    await client.connect();
    
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    const exists = result.rows.length > 0;
    console.log(`📊 数据库 '${dbName}' ${exists ? '存在' : '不存在'}`);
    
    return exists;
    
  } catch (error) {
    console.error('❌ 检查数据库存在性失败:', error.message);
    return false;
    
  } finally {
    if (client) {
      await client.end();
    }
  }
}

/**
 * 创建数据库
 * @param {string} dbName - 数据库名称
 * @returns {Promise<boolean>} 创建是否成功
 */
async function createDatabase(dbName = 'zk_agent') {
  let client;
  
  try {
    console.log(`\n🔨 创建数据库 '${dbName}'...`);
    
    // 连接到postgres默认数据库
    client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '123456',
      connectionTimeoutMillis: 5000,
    });
    
    await client.connect();
    
    // 创建数据库
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ 数据库 '${dbName}' 创建成功!`);
    
    return true;
    
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`ℹ️  数据库 '${dbName}' 已存在`);
      return true;
    } else {
      console.error('❌ 创建数据库失败:', error.message);
      return false;
    }
    
  } finally {
    if (client) {
      await client.end();
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 ZK-Agent 数据库连接测试工具\n');
  
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  const environment = args[1] || 'development';
  
  switch (command) {
    case 'test':
      await testDatabaseConnection(environment);
      break;
      
    case 'check':
      await checkDatabaseExists(args[1] || 'zk_agent');
      break;
      
    case 'create':
      const dbName = args[1] || 'zk_agent';
      const exists = await checkDatabaseExists(dbName);
      if (!exists) {
        await createDatabase(dbName);
      }
      break;
      
    case 'init':
      const initDbName = args[1] || 'zk_agent';
      console.log(`\n🔧 初始化数据库 '${initDbName}'...`);
      console.log('请手动运行以下命令:');
      console.log(`psql -U postgres -h localhost -p 5432 -f scripts/init-zk-agent-db.sql`);
      break;
      
    default:
      console.log('使用方法:');
      console.log('  node scripts/test-db-connection.js test [environment]  - 测试数据库连接');
      console.log('  node scripts/test-db-connection.js check [dbname]     - 检查数据库是否存在');
      console.log('  node scripts/test-db-connection.js create [dbname]    - 创建数据库');
      console.log('  node scripts/test-db-connection.js init [dbname]      - 显示初始化命令');
      console.log('\n环境选项: development, test, production');
      break;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testDatabaseConnection,
  checkDatabaseExists,
  createDatabase
};