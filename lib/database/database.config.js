const path = require('path');
const EnvValidator = require('../../utils/env-validator');
const { validateEnvVar } = EnvValidator;
const { 
  getSSLConfig, 
  getPoolConfig, 
  validateSecurityConfig,
  calculateSecurityScore 
} = require('./security-config');

// 数据库连接配置
const config = {
  production: {
    host: validateEnvVar('DB_HOST', 'localhost'),
    port: parseInt(validateEnvVar('DB_PORT', '5432')),
    database: validateEnvVar('DB_NAME', 'zkagent_dev'),
    username: validateEnvVar('DB_USER', 'postgres'),
    password: validateEnvVar('DB_PASSWORD', '123456'),
    dialect: 'postgres',
    logging: false, // 生产环境关闭SQL日志
    pool: {
  max: 100,
  min: 10,
  acquire: 30000,
  idle: 30000,
  evict: 15000,
  validate: () => validateConnection(),
}, // 生产级连接池配置
    dialectOptions: {
      ssl: getSSLConfig('production'),
      connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000'),
      requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '10000'),
      // 生产环境安全设置
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
      idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TRANSACTION_TIMEOUT || '60000'),
      // 连接安全选项
      application_name: 'zk-agent-prod',
      options: '--search_path=public'
    },
    // 健康检查配置
    healthCheck: {
      enabled: true,
      interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
      timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000'),
      retries: parseInt(process.env.DB_HEALTH_CHECK_RETRIES || '3'),
      // 安全健康检查
      securityCheck: true,
      sslCheck: true
    },
    // Prisma配置
    prisma: {
      log: ['error', 'warn'],
      errorFormat: 'minimal',
      // 生产环境安全配置
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/zkagent_dev'
        }
      }
    },
    // 安全配置
    security: {
      enabled: true,
      auditLog: true,
      encryptionAtRest: process.env.DATABASE_ENCRYPTION_AT_REST === 'true',
      encryptionInTransit: true,
      passwordRotation: true
    }
  },
  
  test: {
    host: process.env.DB_HOST_TEST || 'localhost',
    port: parseInt(process.env.DB_PORT_TEST) || 5432,
    database: process.env.DB_NAME_TEST || 'zkagent_dev',
    username: process.env.DB_USER_TEST || 'postgres',
    password: process.env.DB_PASSWORD_TEST || '123456',
    dialect: 'postgres',
    logging: false,
    pool: getPoolConfig('test'),
    dialectOptions: {
      ssl: getSSLConfig('test'),
      connectTimeout: 5000,
      requestTimeout: 10000,
      application_name: 'zk-agent-test'
    },
    healthCheck: {
      enabled: false,
      securityCheck: false
    },
    // Prisma配置
    prisma: {
      log: ['error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || 'postgresql://postgres:123456@localhost:5432/zkagent_dev'
        }
      }
    },
    // 测试环境安全配置
    security: {
      enabled: false,
      auditLog: false,
      encryptionAtRest: false,
      encryptionInTransit: false
    }
  },
  
  development: {
    host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT) || 5432,
    database: process.env.DATABASE_NAME || 'zkagent_dev',
    username: process.env.DB_USER || process.env.DATABASE_USER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '123456',
    dialect: 'postgres',
    logging: console.log, // 开发环境显示SQL日志
    pool: getPoolConfig('development'),
    dialectOptions: {
      ssl: getSSLConfig('development'),
      connectTimeout: 5000,
      requestTimeout: 10000,
      application_name: 'zk-agent-dev'
    },
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 5000,
      retries: 3,
      securityCheck: false
    },
    // Prisma配置
    prisma: {
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/zkagent_dev'
        }
      }
    },
    // 开发环境安全配置
    security: {
      enabled: process.env.DATABASE_SECURITY_DEV === 'true',
      auditLog: false,
      encryptionAtRest: false,
      encryptionInTransit: process.env.DATABASE_SSL_DEV === 'true'
    }
  }
};

// 获取当前环境配置
function getCurrentConfig() {
  const env = process.env.NODE_ENV || 'development';
  return config[env] || config.development;
}

// 获取数据库连接URL
function getDatabaseUrl(env = process.env.NODE_ENV || 'development') {
  const envConfig = config[env] || config.development;
  
  if (envConfig.prisma && envConfig.prisma.datasourceUrl) {
    return envConfig.prisma.datasourceUrl;
  }
  
  // 构建连接URL
  const { host, port, database, username, password, ssl } = envConfig;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgresql://${username}:${password}@${host}:${port}/${database}${sslParam}`;
}

/**
 * 验证数据库配置
 * @param {string} env - 环境名称
 * @returns {object} 验证结果
 */
function validateDatabaseConfig(env = process.env.NODE_ENV || 'development') {
  const envConfig = config[env];
  if (!envConfig) {
    throw new Error(`未找到环境 ${env} 的数据库配置`);
  }

  const errors = [];
  const warnings = [];
  let securityScore = 100;
  let performanceScore = 100;
  
  // 验证必需字段
  if (!envConfig.host) {
    errors.push('数据库主机地址不能为空');
    securityScore -= 20;
  }
  if (!envConfig.port || isNaN(envConfig.port) || envConfig.port < 1 || envConfig.port > 65535) {
    errors.push('数据库端口必须是1-65535之间的数字');
    securityScore -= 15;
  }
  if (!envConfig.database) {
    errors.push('数据库名称不能为空');
    securityScore -= 15;
  }
  if (!envConfig.username) {
    errors.push('数据库用户名不能为空');
    securityScore -= 15;
  }
  
  // 生产环境额外验证
  if (env === 'production') {
    if (!envConfig.password || envConfig.password.length < 12) {
      errors.push('生产环境数据库密码长度至少需要12个字符');
      securityScore -= 25;
    }
    
    // 密码强度检查
    if (envConfig.password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(envConfig.password)) {
      warnings.push('密码强度不足，建议包含大小写字母、数字和特殊字符');
      securityScore -= 10;
    }
    
    if (envConfig.host === 'localhost' || envConfig.host === '127.0.0.1') {
      warnings.push('生产环境不建议使用localhost');
      securityScore -= 10;
    }
    
    if (!getSSLConfig(env)) {
      warnings.push('生产环境强烈建议启用SSL连接');
      securityScore -= 15;
    }
    
    if (envConfig.logging !== false) {
      errors.push('生产环境应关闭SQL日志记录');
      securityScore -= 10;
    }
    
    // 用户名安全检查
    const unsafeUsernames = ['postgres', 'admin', 'root', 'sa', 'user'];
    if (unsafeUsernames.includes(envConfig.username)) {
      warnings.push('使用默认用户名存在安全风险');
      securityScore -= 10;
    }
  }
  
  // 连接池配置验证
  if (envConfig.pool) {
    if (envConfig.pool.max && (envConfig.pool.max < 1 || envConfig.pool.max > 100)) {
      warnings.push('连接池最大连接数建议在1-100之间');
      performanceScore -= 10;
    }
    
    if (envConfig.pool.min && envConfig.pool.min < 0) {
      errors.push('连接池最小连接数不能为负数');
      performanceScore -= 15;
    }
    
    if (envConfig.pool.min && envConfig.pool.max && envConfig.pool.min > envConfig.pool.max) {
      errors.push('连接池最小连接数不能大于最大连接数');
      performanceScore -= 20;
    }
  }
  
  // 集成安全配置验证
  const securityValidation = validateSecurityConfig(env);
  if (!securityValidation.valid) {
    errors.push(...securityValidation.issues);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: [...warnings, ...(securityValidation.warnings || [])],
    config: envConfig,
    securityScore: Math.min(securityScore, securityValidation.score || 100),
    performanceScore: Math.max(0, performanceScore),
    recommendations: generateConfigRecommendations(envConfig, securityScore, performanceScore)
  };
}

/**
 * 生成配置建议
 * @param {Object} config - 配置对象
 * @param {number} securityScore - 安全分数
 * @param {number} performanceScore - 性能分数
 * @returns {Array} 建议列表
 */
function generateConfigRecommendations(config, securityScore, performanceScore) {
  const recommendations = [];
  
  if (securityScore < 80) {
    recommendations.push('安全分数偏低，建议立即优化安全配置');
  }
  
  if (performanceScore < 80) {
    recommendations.push('性能分数偏低，建议优化连接池和超时配置');
  }
  
  if (process.env.NODE_ENV === 'production') {
    recommendations.push('定期轮换数据库密码');
    recommendations.push('监控数据库连接数和性能指标');
    recommendations.push('配置数据库备份策略');
    recommendations.push('设置数据库访问白名单');
  }
  
  return recommendations;
}

/**
 * 获取数据库安全配置
 * @param {string} env - 环境名称
 * @returns {object} 安全配置
 */
function getDatabaseSecurityConfig(env = process.env.NODE_ENV || 'development') {
  const envConfig = config[env];
  return {
    ssl: getSSLConfig(env),
    pool: getPoolConfig(env),
    security: envConfig.security || {},
    healthCheck: envConfig.healthCheck || {},
    securityScore: calculateSecurityScore(env)
  };
}

/**
 * 生成数据库安全报告
 * @param {string} env - 环境名称
 * @returns {object} 安全报告
 */
function generateSecurityReport(env = process.env.NODE_ENV || 'development') {
  const validation = validateSecurityConfig(env);
  const securityConfig = getDatabaseSecurityConfig(env);
  const envConfig = config[env] || config.development;
  
  const report = {
    environment: env,
    timestamp: new Date().toISOString(),
    securityLevel: 'high',
    securityScore: validation.score || 100,
    status: validation.valid ? 'PASS' : 'FAIL',
    issues: [...(validation.issues || [])],
    warnings: [...(validation.warnings || [])],
    recommendations: [],
    compliance: {
      gdpr: true,
      sox: true,
      pci: true
    },
    configuration: {
      ssl: {
        enabled: securityConfig.ssl !== false,
        details: securityConfig.ssl
      },
      poolSecurity: securityConfig.pool,
      auditEnabled: securityConfig.security.auditLog,
      encryptionAtRest: securityConfig.security.encryptionAtRest,
      encryptionInTransit: securityConfig.security.encryptionInTransit
    }
  };
  
  let securityScore = validation.score || 100;
  
  // SSL检查
  if (!getSSLConfig(env)) {
    const severity = env === 'production' ? 'high' : 'medium';
    report.issues.push({
      type: 'warning',
      category: 'encryption',
      message: 'SSL连接未启用',
      severity,
      impact: 'data_transmission_vulnerability'
    });
    report.recommendations.push('启用SSL/TLS加密连接');
    securityScore -= env === 'production' ? 20 : 10;
    if (env === 'production') {
      report.compliance.pci = false;
    }
  }
  
  // 密码强度检查
  if (envConfig.password) {
    const minLength = env === 'production' ? 12 : 8;
    if (envConfig.password.length < minLength) {
      report.issues.push({
        type: 'error',
        category: 'authentication',
        message: `密码长度不足(当前: ${envConfig.password.length}, 要求: ${minLength})`,
        severity: 'high',
        impact: 'weak_authentication'
      });
      report.recommendations.push(`使用至少${minLength}个字符的强密码`);
      securityScore -= 25;
      report.compliance.sox = false;
    }
    
    // 密码复杂度检查
    const complexityRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/;
    if (!complexityRegex.test(envConfig.password)) {
      report.issues.push({
        type: 'warning',
        category: 'authentication',
        message: '密码复杂度不足',
        severity: 'medium',
        impact: 'password_vulnerability'
      });
      report.recommendations.push('密码应包含大小写字母、数字和特殊字符');
      securityScore -= 15;
    }
  }
  
  // 默认凭据检查
  const defaultCredentials = ['postgres', 'admin', 'root', 'sa', 'user'];
  if (defaultCredentials.includes(envConfig.username)) {
    report.issues.push({
      type: 'warning',
      category: 'authentication',
      message: '使用默认用户名',
      severity: 'medium',
      impact: 'predictable_credentials'
    });
    report.recommendations.push('避免使用默认用户名');
    securityScore -= 15;
  }
  
  // 审计和监控检查
  if (!envConfig.security?.auditLog) {
    report.issues.push({
      type: 'warning',
      category: 'monitoring',
      message: '未启用审计日志',
      severity: 'medium',
      impact: 'audit_trail_missing'
    });
    report.recommendations.push('启用数据库审计日志');
    securityScore -= 10;
    if (env === 'production') {
      report.compliance.sox = false;
    }
  }
  
  // 更新安全分数
  report.securityScore = Math.max(0, securityScore);
  
  // 确定安全级别
  const criticalCount = report.issues.filter(issue => issue.severity === 'critical').length;
  const errorCount = report.issues.filter(issue => issue.type === 'error').length;
  const warningCount = report.issues.filter(issue => issue.type === 'warning').length;
  
  if (criticalCount > 0 || report.securityScore < 50) {
    report.securityLevel = 'critical';
  } else if (errorCount > 0 || report.securityScore < 70) {
    report.securityLevel = 'low';
  } else if (warningCount > 2 || report.securityScore < 85) {
    report.securityLevel = 'medium';
  } else {
    report.securityLevel = 'high';
  }
  
  // 添加原有的建议
  const originalRecommendations = generateSecurityRecommendations(env, validation);
  report.recommendations.push(...originalRecommendations);
  
  return report;
}

/**
 * 生成安全建议
 * @param {string} env - 环境名称
 * @param {object} validation - 验证结果
 * @returns {array} 建议列表
 */
function generateSecurityRecommendations(env, validation) {
  const recommendations = [];
  
  if (env === 'production') {
    if (validation.score < 80) {
      recommendations.push('生产环境安全分数偏低，建议启用所有安全功能');
    }
    if (!getSSLConfig(env)) {
      recommendations.push('强烈建议在生产环境启用SSL/TLS加密');
    }
    recommendations.push('定期轮换数据库密码');
    recommendations.push('启用数据库审计日志');
    recommendations.push('配置数据库防火墙规则');
  }
  
  if (env === 'development') {
    recommendations.push('考虑在开发环境启用SSL以模拟生产环境');
    recommendations.push('使用强密码进行开发测试');
  }
  
  return recommendations;
}

// 获取Prisma配置
function getPrismaConfig(env = process.env.NODE_ENV || 'development') {
  const envConfig = config[env] || config.development;
  return {
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/zkagent_dev',
    log: envConfig.prisma?.logLevel === 'info' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    errorFormat: envConfig.prisma?.errorFormat || 'pretty'
  };
}

module.exports = {
  config,
  getCurrentConfig,
  getDatabaseUrl,
  validateDatabaseConfig,
  getPrismaConfig,
  getDatabaseSecurityConfig,
  generateSecurityReport,
  generateSecurityRecommendations,
  generateConfigRecommendations
};