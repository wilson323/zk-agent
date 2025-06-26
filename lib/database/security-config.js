/**
 * @file 数据库安全配置
 * @description 生产级数据库安全配置和策略
 * @author ZK-Agent Team
 * @date 2024-06-25
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// SSL证书路径
const SSL_CERT_PATH = path.join(process.cwd(), 'ssl', 'certs', 'server.crt');
const SSL_KEY_PATH = path.join(process.cwd(), 'ssl', 'certs', 'server.key');
const SSL_CA_PATH = path.join(process.cwd(), 'ssl', 'certs', 'ca.crt');

/**
 * 生产级数据库安全配置
 */
const securityConfig = {
  // SSL/TLS配置
  ssl: {
    // 开发环境配置
    development: {
      enabled: process.env.DATABASE_SSL_DEV === 'true',
      rejectUnauthorized: false, // 开发环境允许自签名证书
      cert: fs.existsSync(SSL_CERT_PATH) ? fs.readFileSync(SSL_CERT_PATH) : null,
      key: fs.existsSync(SSL_KEY_PATH) ? fs.readFileSync(SSL_KEY_PATH) : null,
      ca: fs.existsSync(SSL_CA_PATH) ? fs.readFileSync(SSL_CA_PATH) : null,
      checkServerIdentity: () => undefined // 开发环境跳过服务器身份验证
    },
    
    // 测试环境配置
    test: {
      enabled: false, // 测试环境通常不需要SSL
      rejectUnauthorized: false
    },
    
    // 生产环境配置
    production: {
      enabled: process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production',
      rejectUnauthorized: true, // 生产环境必须验证证书
      cert: process.env.DATABASE_SSL_CERT ? fs.readFileSync(process.env.DATABASE_SSL_CERT) : null,
      key: process.env.DATABASE_SSL_KEY ? fs.readFileSync(process.env.DATABASE_SSL_KEY) : null,
      ca: process.env.DATABASE_SSL_CA ? fs.readFileSync(process.env.DATABASE_SSL_CA) : null,
      servername: process.env.DATABASE_SSL_SERVERNAME || process.env.DB_HOST || 'localhost'
    }
  },
  
  // 密码安全策略
  password: {
    // 最小密码强度要求
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    
    // 禁用的弱密码
    blacklist: [
      'password', '123456', 'admin', 'root', 'postgres',
      'password123', 'admin123', 'qwerty', '12345678'
    ],
    
    // 密码轮换策略
    rotation: {
      enabled: process.env.NODE_ENV === 'production',
      intervalDays: 90, // 90天轮换一次
      historyCount: 5   // 记住最近5个密码
    }
  },
  
  // 连接安全配置
  connection: {
    // 连接超时配置
    timeouts: {
      connection: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT) || 5000,
      idle: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
      query: parseInt(process.env.DATABASE_QUERY_TIMEOUT) || 10000
    },
    
    // 连接池安全配置
    pool: {
      // 最大连接数限制
      max: {
        development: 10,
        test: 5,
        production: parseInt(process.env.DATABASE_POOL_MAX) || 20
      },
      
      // 最小连接数
      min: {
        development: 2,
        test: 1,
        production: parseInt(process.env.DATABASE_POOL_MIN) || 5
      },
      
      // 连接获取超时
      acquire: {
        development: 30000,
        test: 30000,
        production: parseInt(process.env.DATABASE_POOL_ACQUIRE) || 60000
      },
      
      // 空闲连接超时
      idle: {
        development: 10000,
        test: 10000,
        production: parseInt(process.env.DATABASE_POOL_IDLE) || 300000 // 5分钟
      },
      
      // 连接驱逐间隔
      evict: {
        development: 1000,
        test: 1000,
        production: parseInt(process.env.DATABASE_POOL_EVICT) || 5000
      }
    },
    
    // IP白名单（生产环境）
    allowedIPs: process.env.DATABASE_ALLOWED_IPS ? 
      process.env.DATABASE_ALLOWED_IPS.split(',').map(ip => ip.trim()) : 
      ['127.0.0.1', '::1', 'localhost'],
    
    // 连接重试配置
    retry: {
      max: 3,
      delay: 1000,
      backoff: 'exponential'
    }
  },
  
  // 审计和监控配置
  audit: {
    enabled: process.env.DATABASE_AUDIT === 'true' || process.env.NODE_ENV === 'production',
    
    // 记录的事件类型
    events: {
      connections: true,
      queries: process.env.DATABASE_AUDIT_QUERIES === 'true',
      errors: true,
      slowQueries: true,
      failedLogins: true
    },
    
    // 慢查询阈值（毫秒）
    slowQueryThreshold: parseInt(process.env.DATABASE_SLOW_QUERY_THRESHOLD) || 1000,
    
    // 审计日志保留期（天）
    retentionDays: parseInt(process.env.DATABASE_AUDIT_RETENTION) || 90
  },
  
  // 数据加密配置
  encryption: {
    // 静态数据加密
    atRest: {
      enabled: process.env.DATABASE_ENCRYPTION_AT_REST === 'true',
      algorithm: 'aes-256-gcm',
      keyRotationDays: 365
    },
    
    // 传输中数据加密
    inTransit: {
      enabled: process.env.DATABASE_ENCRYPTION_IN_TRANSIT === 'true' || process.env.NODE_ENV === 'production',
      minTlsVersion: '1.2',
      cipherSuites: [
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256'
      ]
    }
  },
  
  // 备份安全配置
  backup: {
    encryption: {
      enabled: true,
      algorithm: 'aes-256-cbc',
      keyDerivation: 'pbkdf2'
    },
    
    // 备份访问控制
    access: {
      requireMFA: process.env.NODE_ENV === 'production',
      allowedUsers: process.env.DATABASE_BACKUP_USERS ? 
        process.env.DATABASE_BACKUP_USERS.split(',').map(user => user.trim()) : 
        ['admin']
    }
  }
};

/**
 * 获取当前环境的SSL配置
 * @param {string} env - 环境名称
 * @returns {object} SSL配置
 */
function getSSLConfig(env = process.env.NODE_ENV || 'development') {
  const config = securityConfig.ssl[env] || securityConfig.ssl.development;
  
  if (!config.enabled) {
    return false;
  }
  
  // 构建SSL配置对象
  const sslConfig = {
    require: true,
    rejectUnauthorized: config.rejectUnauthorized
  };
  
  // 添加证书文件（如果存在）
  if (config.cert) {sslConfig.cert = config.cert;}
  if (config.key) {sslConfig.key = config.key;}
  if (config.ca) {sslConfig.ca = config.ca;}
  if (config.servername) {sslConfig.servername = config.servername;}
  if (config.checkServerIdentity) {sslConfig.checkServerIdentity = config.checkServerIdentity;}
  
  return sslConfig;
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {object} 验证结果
 */
function validatePassword(password) {
  const config = securityConfig.password;
  const errors = [];
  
  // 检查长度
  if (password.length < config.minLength) {
    errors.push(`密码长度至少需要${config.minLength}个字符`);
  }
  
  // 检查大写字母
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  
  // 检查小写字母
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  
  // 检查数字
  if (config.requireNumbers && !/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  
  // 检查特殊字符
  if (config.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }
  
  // 检查黑名单
  if (config.blacklist.includes(password.toLowerCase())) {
    errors.push('密码过于简单，请选择更强的密码');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
}

/**
 * 计算密码强度
 * @param {string} password - 密码
 * @returns {number} 强度分数 (0-100)
 */
function calculatePasswordStrength(password) {
  let score = 0;
  
  // 长度分数
  score += Math.min(password.length * 4, 25);
  
  // 字符类型分数
  if (/[a-z]/.test(password)) {score += 5;}
  if (/[A-Z]/.test(password)) {score += 5;}
  if (/\d/.test(password)) {score += 5;}
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {score += 10;}
  
  // 复杂度分数
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 20);
  
  // 模式检查（减分）
  if (/123|abc|qwe/i.test(password)) {score -= 10;}
  if (/(..).*\1/.test(password)) {score -= 10;} // 重复模式
  
  return Math.max(0, Math.min(100, score));
}

/**
 * 生成强密码
 * @param {number} length - 密码长度
 * @returns {string} 生成的密码
 */
function generateStrongPassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // 确保至少包含每种类型的字符
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // 打乱字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 获取当前环境的连接池配置
 * @param {string} env - 环境名称
 * @returns {object} 连接池配置
 */
function getPoolConfig(env = process.env.NODE_ENV || 'development') {
  const poolConfig = securityConfig.connection.pool;
  
  return {
    max: poolConfig.max[env] || poolConfig.max.development,
    min: poolConfig.min[env] || poolConfig.min.development,
    acquire: poolConfig.acquire[env] || poolConfig.acquire.development,
    idle: poolConfig.idle[env] || poolConfig.idle.development,
    evict: poolConfig.evict[env] || poolConfig.evict.development
  };
}

/**
 * 验证数据库安全配置
 * @param {string} env - 环境名称
 * @returns {object} 验证结果
 */
function validateSecurityConfig(env = process.env.NODE_ENV || 'development') {
  const issues = [];
  const warnings = [];
  
  // 检查SSL配置
  if (env === 'production' && !securityConfig.ssl.production.enabled) {
    issues.push('生产环境必须启用SSL加密');
  }
  
  // 检查密码配置
  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.length < securityConfig.password.minLength) {
    issues.push(`数据库密码长度至少需要${securityConfig.password.minLength}个字符`);
  }
  
  // 检查审计配置
  if (env === 'production' && !securityConfig.audit.enabled) {
    warnings.push('建议在生产环境启用数据库审计');
  }
  
  // 检查连接超时配置
  const timeouts = securityConfig.connection.timeouts;
  if (timeouts.connection > 10000) {
    warnings.push('连接超时时间过长，可能影响安全性');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    warnings,
    score: calculateSecurityScore(env)
  };
}

/**
 * 计算安全配置分数
 * @param {string} env - 环境名称
 * @returns {number} 安全分数 (0-100)
 */
function calculateSecurityScore(env = process.env.NODE_ENV || 'development') {
  let score = 0;
  
  // SSL配置 (30分)
  if (securityConfig.ssl[env]?.enabled) {
    score += 30;
    if (securityConfig.ssl[env]?.rejectUnauthorized) {score += 10;}
  }
  
  // 密码强度 (25分)
  if (process.env.DB_PASSWORD) {
    const passwordValidation = validatePassword(process.env.DB_PASSWORD);
    score += Math.floor(passwordValidation.strength * 0.25);
  }
  
  // 审计配置 (20分)
  if (securityConfig.audit.enabled) {
    score += 20;
  }
  
  // 连接安全 (15分)
  const timeouts = securityConfig.connection.timeouts;
  if (timeouts.connection <= 5000) {score += 5;}
  if (timeouts.idle <= 30000) {score += 5;}
  if (timeouts.query <= 10000) {score += 5;}
  
  // 加密配置 (10分)
  if (securityConfig.encryption.inTransit.enabled) {score += 5;}
  if (securityConfig.encryption.atRest.enabled) {score += 5;}
  
  return Math.min(100, score);
}

module.exports = {
  securityConfig,
  getSSLConfig,
  validatePassword,
  calculatePasswordStrength,
  generateStrongPassword,
  getPoolConfig,
  validateSecurityConfig,
  calculateSecurityScore
};