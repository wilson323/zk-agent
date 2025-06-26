/**
 * @file database.config.js
 * @description 数据库配置 - 支持生产和测试环境
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

const databaseConfig = {
  // 生产数据库配置 (zkagent1)
  production: {
    host: validateEnvVar('DB_HOST', 'localhost'),
    port: parseInt(validateEnvVar('DB_PORT', '5432')),
    database: validateEnvVar('DB_NAME', 'zkagent_dev'),
    username: validateEnvVar('DB_USER', 'postgres'),
    password: validateEnvVar('DB_PASSWORD', '123456'),
    dialect: 'postgresql',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 50,
      min: parseInt(process.env.DB_POOL_MIN) || 10,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 20000,
      evict: parseInt(process.env.DB_POOL_EVICT) || 1000,
      handleDisconnects: true
    },
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY
    } : false,
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/zkagent1',
    // 连接超时和重试配置
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 20000,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT) || 15000,
    cancelTimeout: parseInt(process.env.DB_CANCEL_TIMEOUT) || 5000,
    // 健康检查配置
    healthCheck: {
      enabled: process.env.DB_HEALTH_CHECK !== 'false',
      interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL) || 30000,
      timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT) || 5000
    }
  },

  // 测试数据库配置 (zkagent2)
  test: {
    host: 'localhost',
    port: 5432,
    database: 'zkagent2',
    username: 'postgres',
    password: '123456',
    dialect: 'postgresql',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    ssl: false,
    connectionString: 'postgresql://postgres:123456@localhost:5432/zkagent2'
  },

  // 开发环境配置
  development: {
    host: 'localhost',
    port: 5432,
    database: 'zkagent_dev',
    username: 'postgres',
    password: '123456',
    dialect: 'postgresql',
    logging: console.log,
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000
    },
    ssl: false,
    connectionString: 'postgresql://postgres:123456@localhost:5432/zkagent_dev'
  }
};

/**
 * 获取当前环境的数据库配置
 * @returns {Object} 数据库配置对象
 */
function getDatabaseConfig() {
  const env = process.env.NODE_ENV || 'development';
  const config = databaseConfig[env];
  
  if (!config) {
    throw new Error(`未找到环境 ${env} 的数据库配置`);
  }
  
  return config;
}

/**
 * 获取数据库连接字符串
 * @param {string} environment - 环境名称 (production, test, development)
 * @returns {string} 数据库连接字符串
 */
function getDatabaseUrl(environment = null) {
  const env = environment || process.env.NODE_ENV || 'development';
  const config = databaseConfig[env];
  
  if (!config) {
    throw new Error(`未找到环境 ${env} 的数据库配置`);
  }
  
  return config.connectionString;
}

/**
 * 验证数据库连接配置
 * @param {string} environment - 环境名称
 * @returns {boolean} 配置是否有效
 */
function validateDatabaseConfig(environment) {
  try {
    const config = databaseConfig[environment];
    return !!(config && config.host && config.port && config.database && config.username);
  } catch (error) {
    return false;
  }
}

module.exports = {
  databaseConfig,
  getDatabaseConfig,
  getDatabaseUrl,
  validateDatabaseConfig
};