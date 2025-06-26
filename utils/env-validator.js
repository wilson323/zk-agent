/**
 * @file 环境变量验证工具
 * @description 验证和管理环境变量的工具函数
 * @author ZK-Agent Team
 * @date 2024-06-25
 */

const fs = require('fs');
const path = require('path');

/**
 * 验证并获取单个环境变量
 * @param {string} name - 变量名
 * @param {*} defaultValue - 默认值
 * @returns {*} 环境变量值
 */
/**
 * 验证并获取单个环境变量
 * @param {string} name - 变量名
 * @param {*} defaultValue - 默认值
 * @returns {*} 环境变量值
 */
function validateEnvVar(name, defaultValue = undefined) {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') {
    if (defaultValue === undefined) {
      throw new Error(`必需的环境变量 ${name} 未设置`);
    }
    return defaultValue;
  }
  return value;
}

// 生产环境专用验证规则
const PRODUCTION_RULES = {
  sslCertExpiry: (certPath) => {
    const cert = fs.readFileSync(certPath);
    return Date.now() < new Date(cert.validTo).getTime();
  },
  connectionPool: (config) => {
    return config.max <= 100 && config.min >= 5 && config.idle <= 30000;
  }
};

class EnvValidator {
  constructor() {
    this.requiredVars = new Map();
    this.optionalVars = new Map();
    this.validationRules = new Map();
  }

  /**
   * 添加必需的环境变量
   * @param {string} name - 变量名
   * @param {string} description - 变量描述
   * @param {Function} validator - 验证函数
   */
  addRequired(name, description, validator = null) {
    this.requiredVars.set(name, { description, validator });
    return this;
  }

  /**
   * 添加可选的环境变量
   * @param {string} name - 变量名
   * @param {string} description - 变量描述
   * @param {*} defaultValue - 默认值
   * @param {Function} validator - 验证函数
   */
  addOptional(name, description, defaultValue = null, validator = null) {
    this.optionalVars.set(name, { description, defaultValue, validator });
    return this;
  }

  /**
   * 添加验证规则
   * @param {string} name - 变量名
   * @param {Function} rule - 验证规则函数
   */
  addRule(name, rule) {
    if (!this.validationRules.has(name)) {
      this.validationRules.set(name, []);
    }
    this.validationRules.get(name).push(rule);
    return this;
  }

  /**
   * 验证单个环境变量
   * @param {string} name - 变量名
   * @param {*} value - 变量值
   * @param {Function} validator - 验证函数
   * @returns {Object} 验证结果
   */
  validateVariable(name, value, validator = null) {
    const result = {
      name,
      value,
      valid: true,
      errors: [],
      warnings: []
    };

    // 检查是否为空
    if (value === undefined || value === null || value === '') {
      result.valid = false;
      result.errors.push(`${name} 不能为空`);
      return result;
    }

    // 执行自定义验证器
    if (validator && typeof validator === 'function') {
      try {
        const validatorResult = validator(value);
        if (validatorResult !== true) {
          result.valid = false;
          result.errors.push(validatorResult || `${name} 验证失败`);
        }
      } catch (error) {
        result.valid = false;
        result.errors.push(`${name} 验证器执行错误: ${error.message}`);
      }
    }

    // 执行验证规则
    if (this.validationRules.has(name)) {
      const rules = this.validationRules.get(name);
      rules.forEach(rule => {
        try {
          const ruleResult = rule(value);
          if (ruleResult !== true) {
            if (ruleResult && ruleResult.type === 'warning') {
              result.warnings.push(ruleResult.message);
            } else {
              result.valid = false;
              result.errors.push(ruleResult || `${name} 规则验证失败`);
            }
          }
        } catch (error) {
          result.valid = false;
          result.errors.push(`${name} 规则执行错误: ${error.message}`);
        }
      });
    }

    return result;
  }

  /**
   * 验证所有环境变量
   * @returns {Object} 验证结果
   */
  validate() {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      missing: [],
      variables: new Map()
    };

    // 验证必需变量
    for (const [name, config] of this.requiredVars) {
      const value = process.env[name];
      
      if (value === undefined || value === null || value === '') {
        results.valid = false;
        results.missing.push(name);
        results.errors.push(`必需的环境变量 ${name} 未设置: ${config.description}`);
      } else {
        const varResult = this.validateVariable(name, value, config.validator);
        results.variables.set(name, varResult);
        
        if (!varResult.valid) {
          results.valid = false;
          results.errors.push(...varResult.errors);
        }
        
        results.warnings.push(...varResult.warnings);
      }
    }

    // 验证可选变量
    for (const [name, config] of this.optionalVars) {
      const value = process.env[name] || config.defaultValue;
      
      if (value !== null && value !== undefined && value !== '') {
        const varResult = this.validateVariable(name, value, config.validator);
        results.variables.set(name, varResult);
        
        if (!varResult.valid) {
          results.valid = false;
          results.errors.push(...varResult.errors);
        }
        
        results.warnings.push(...varResult.warnings);
      }
    }

    return results;
  }

  /**
   * 生成环境变量报告
   * @returns {Object} 报告对象
   */
  generateReport() {
    const validation = this.validate();
    
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      validation,
      summary: {
        total: this.requiredVars.size + this.optionalVars.size,
        required: this.requiredVars.size,
        optional: this.optionalVars.size,
        missing: validation.missing.length,
        errors: validation.errors.length,
        warnings: validation.warnings.length,
        valid: validation.valid
      },
      variables: {
        required: Array.from(this.requiredVars.entries()).map(([name, config]) => ({
          name,
          description: config.description,
          set: process.env[name] !== undefined,
          value: process.env[name] ? '[HIDDEN]' : undefined
        })),
        optional: Array.from(this.optionalVars.entries()).map(([name, config]) => ({
          name,
          description: config.description,
          defaultValue: config.defaultValue,
          set: process.env[name] !== undefined,
          value: process.env[name] ? '[HIDDEN]' : config.defaultValue
        }))
      }
    };
  }
}

/**
 * 常用验证器函数
 */
const validators = {
  /**
   * 验证端口号
   * @param {string} value - 端口值
   * @returns {boolean|string} 验证结果
   */
  port: (value) => {
    const port = parseInt(value, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return '端口号必须是1-65535之间的数字';
    }
    return true;
  },

  /**
   * 验证URL
   * @param {string} value - URL值
   * @returns {boolean|string} 验证结果
   */
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return '必须是有效的URL格式';
    }
  },

  /**
   * 验证邮箱
   * @param {string} value - 邮箱值
   * @returns {boolean|string} 验证结果
   */
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return '必须是有效的邮箱格式';
    }
    return true;
  },

  /**
   * 验证数字
   * @param {number} min - 最小值
   * @param {number} max - 最大值
   * @returns {Function} 验证函数
   */
  number: (min = -Infinity, max = Infinity) => {
    return (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return '必须是有效的数字';
      }
      if (num < min || num > max) {
        return `数字必须在 ${min} 到 ${max} 之间`;
      }
      return true;
    };
  },

  /**
   * 验证字符串长度
   * @param {number} min - 最小长度
   * @param {number} max - 最大长度
   * @returns {Function} 验证函数
   */
  length: (min = 0, max = Infinity) => {
    return (value) => {
      if (typeof value !== 'string') {
        return '必须是字符串';
      }
      if (value.length < min || value.length > max) {
        return `长度必须在 ${min} 到 ${max} 个字符之间`;
      }
      return true;
    };
  },

  /**
   * 验证正则表达式
   * @param {RegExp} regex - 正则表达式
   * @param {string} message - 错误消息
   * @returns {Function} 验证函数
   */
  regex: (regex, message = '格式不正确') => {
    return (value) => {
      if (!regex.test(value)) {
        return message;
      }
      return true;
    };
  },

  /**
   * 验证枚举值
   * @param {Array} allowedValues - 允许的值
   * @returns {Function} 验证函数
   */
  enum: (allowedValues) => {
    return (value) => {
      if (!allowedValues.includes(value)) {
        return `必须是以下值之一: ${allowedValues.join(', ')}`;
      }
      return true;
    };
  },

  /**
   * 验证文件路径
   * @param {boolean} mustExist - 文件是否必须存在
   * @returns {Function} 验证函数
   */
  filePath: (mustExist = false) => {
    return (value) => {
      if (!path.isAbsolute(value) && !value.startsWith('./') && !value.startsWith('../')) {
        return '必须是有效的文件路径';
      }
      
      if (mustExist && !fs.existsSync(value)) {
        return '文件路径不存在';
      }
      
      return true;
    };
  },

  /**
   * 验证密码强度
   * @param {number} minLength - 最小长度
   * @returns {Function} 验证函数
   */
  password: (minLength = 8) => {
    return (value) => {
      if (value.length < minLength) {
        return `密码长度至少需要 ${minLength} 个字符`;
      }
      
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
      
      const requirements = [];
      if (!hasUpper) requirements.push('大写字母');
      if (!hasLower) requirements.push('小写字母');
      if (!hasNumber) requirements.push('数字');
      if (!hasSpecial) requirements.push('特殊字符');
      
      if (requirements.length > 0) {
        return {
          type: 'warning',
          message: `密码建议包含: ${requirements.join(', ')}`
        };
      }
      
      return true;
    };
  },

  /**
   * 验证数据库连接URL
   * @returns {Function} 验证函数
   */
  databaseUrl: () => {
    return (value) => {
      if (!value) return true; // 可选字段
      
      try {
        const url = new URL(value);
        
        // 检查协议
        if (!['postgres:', 'postgresql:', 'mysql:', 'sqlite:'].includes(url.protocol)) {
          return '不支持的数据库协议';
        }
        
        // 检查主机和端口
        if (url.protocol !== 'sqlite:' && !url.hostname) {
          return '数据库URL缺少主机名';
        }
        
        // 检查数据库名
        if (url.protocol !== 'sqlite:' && !url.pathname.replace('/', '')) {
          return '数据库URL缺少数据库名';
        }
        
        return true;
      } catch {
        return '无效的数据库连接URL格式';
      }
    };
  },

  /**
   * 验证生产环境配置
   * @returns {Function} 验证函数
   */
  productionConfig: () => {
    return (value) => {
      if (process.env.NODE_ENV !== 'production') {
        return true;
      }
      
      const warnings = [];
      
      // 检查是否使用默认值
      if (value === 'localhost' || value === '127.0.0.1') {
        warnings.push('生产环境不应使用localhost');
      }
      
      if (value === 'postgres' || value === 'admin' || value === 'root') {
        warnings.push('生产环境不应使用默认用户名');
      }
      
      if (value === '123456' || value === 'password' || value === '') {
        warnings.push('生产环境不应使用弱密码或空密码');
      }
      
      if (warnings.length > 0) {
        return {
          type: 'warning',
          message: warnings.join('; ')
        };
      }
      
      return true;
    };
  }
};

/**
 * 创建数据库环境变量验证器
 * @returns {EnvValidator} 验证器实例
 */
function createDatabaseValidator() {
  const validator = new EnvValidator();
  
  // 数据库连接相关
  validator
    .addRequired('DB_HOST', '数据库主机地址')
    .addRequired('DB_PORT', '数据库端口', validators.port)
    .addRequired('DB_NAME', '数据库名称', validators.length(1, 64))
    .addRequired('DB_USER', '数据库用户名', validators.length(1, 64))
    .addOptional('DB_PASSWORD', '数据库密码', '', validators.password(12))
    .addOptional('DB_DIALECT', '数据库类型', 'postgres', validators.enum(['postgres', 'mysql', 'sqlite', 'mariadb']))
    .addOptional('DB_SSL', '是否启用SSL', 'false', validators.enum(['true', 'false']))
    .addOptional('DB_POOL_MAX', '连接池最大连接数', '10', validators.number(1, 100))
    .addOptional('DB_POOL_MIN', '连接池最小连接数', '2', validators.number(0, 50))
    .addOptional('DB_POOL_ACQUIRE', '获取连接超时时间(ms)', '60000', validators.number(1000, 300000))
    .addOptional('DB_POOL_IDLE', '空闲连接超时时间(ms)', '300000', validators.number(10000, 3600000))
    // 生产环境安全配置
    .addOptional('DB_CONNECT_TIMEOUT', '数据库连接超时时间(ms)', '5000', validators.number(1000, 30000))
    .addOptional('DB_REQUEST_TIMEOUT', '数据库请求超时时间(ms)', '10000', validators.number(5000, 60000))
    .addOptional('DB_STATEMENT_TIMEOUT', '数据库语句超时时间(ms)', '30000', validators.number(10000, 300000))
    .addOptional('DB_IDLE_TRANSACTION_TIMEOUT', '空闲事务超时时间(ms)', '60000', validators.number(30000, 600000))
    .addOptional('DB_HEALTH_CHECK_INTERVAL', '健康检查间隔(ms)', '30000', validators.number(10000, 300000))
    .addOptional('DB_HEALTH_CHECK_TIMEOUT', '健康检查超时(ms)', '5000', validators.number(1000, 30000))
    .addOptional('DB_HEALTH_CHECK_RETRIES', '健康检查重试次数', '3', validators.number(1, 10))
    .addOptional('DATABASE_ENCRYPTION_AT_REST', '数据库静态加密', 'false', validators.enum(['true', 'false']))
    .addOptional('DATABASE_SECURITY_DEV', '开发环境安全模式', 'false', validators.enum(['true', 'false']))
    .addOptional('DATABASE_SSL_DEV', '开发环境SSL', 'false', validators.enum(['true', 'false']))
    .addOptional('DATABASE_URL', '数据库连接URL', '', validators.url)
    .addOptional('DATABASE_URL_TEST', '测试数据库连接URL', '', validators.url);
  
  // 添加生产环境特殊验证规则
  validator.addRule('DB_PASSWORD', (value) => {
    if (process.env.NODE_ENV === 'production' && (!value || value.length < 12)) {
      return '生产环境数据库密码长度至少需要12个字符';
    }
    return true;
  });
  
  validator.addRule('DB_SSL', (value) => {
    if (process.env.NODE_ENV === 'production' && value !== 'true') {
      return {
        type: 'warning',
        message: '生产环境强烈建议启用SSL连接'
      };
    }
    return true;
  });
  
  validator.addRule('DATABASE_ENCRYPTION_AT_REST', (value) => {
    if (process.env.NODE_ENV === 'production' && value !== 'true') {
      return {
        type: 'warning',
        message: '生产环境建议启用数据库静态加密'
      };
    }
    return true;
  });
  
  return validator;
}

/**
 * 创建应用环境变量验证器
 * @returns {EnvValidator} 验证器实例
 */
function createAppValidator() {
  const validator = new EnvValidator();
  
  // 应用基础配置
  validator
    .addRequired('NODE_ENV', '运行环境', validators.enum(['development', 'test', 'production']))
    .addOptional('PORT', '应用端口', '3000', validators.port)
    .addOptional('HOST', '应用主机', '0.0.0.0')
    .addOptional('APP_NAME', '应用名称', 'ZK-Agent', validators.length(1, 100))
    .addOptional('APP_VERSION', '应用版本', '1.0.0')
    .addOptional('LOG_LEVEL', '日志级别', 'info', validators.enum(['error', 'warn', 'info', 'debug']))
    .addOptional('LOG_FILE', '日志文件路径', './logs/app.log')
    .addOptional('JWT_SECRET', 'JWT密钥', '', validators.password(32))
    .addOptional('ENCRYPTION_KEY', '加密密钥', '', validators.password(32))
    .addOptional('SESSION_SECRET', '会话密钥', '', validators.password(16));
  
  return validator;
}

/**
 * 验证环境变量
 * @param {string} type - 验证类型 ('database', 'app', 'all')
 * @returns {Object} 验证结果
 */
function validateEnv(type = 'all') {
  const results = {
    timestamp: new Date().toISOString(),
    type,
    valid: true,
    errors: [],
    warnings: [],
    reports: {}
  };
  
  try {
    if (type === 'database' || type === 'all') {
      const dbValidator = createDatabaseValidator();
      const dbReport = dbValidator.generateReport();
      results.reports.database = dbReport;
      
      if (!dbReport.validation.valid) {
        results.valid = false;
        results.errors.push(...dbReport.validation.errors);
      }
      results.warnings.push(...dbReport.validation.warnings);
    }
    
    if (type === 'app' || type === 'all') {
      const appValidator = createAppValidator();
      const appReport = appValidator.generateReport();
      results.reports.app = appReport;
      
      if (!appReport.validation.valid) {
        results.valid = false;
        results.errors.push(...appReport.validation.errors);
      }
      results.warnings.push(...appReport.validation.warnings);
    }
    
  } catch (error) {
    results.valid = false;
    results.errors.push(`环境变量验证过程中发生错误: ${error.message}`);
  }
  
  return results;
}

/**
 * 验证生产环境配置
 * @param {Object} config - 配置对象
 * @returns {Object} 验证结果
 */
function validateProductionConfig(config) {
  const errors = [];
  const warnings = [];
  let securityScore = 100;
  
  // SSL证书检查
  if (config.ssl && config.ssl.cert) {
    try {
      if (!PRODUCTION_RULES.sslCertExpiry(config.ssl.cert)) {
        errors.push('SSL证书已过期或即将过期');
        securityScore -= 20;
      }
    } catch (error) {
      warnings.push(`SSL证书检查失败: ${error.message}`);
      securityScore -= 10;
    }
  } else if (process.env.NODE_ENV === 'production') {
    warnings.push('生产环境未配置SSL证书');
    securityScore -= 15;
  }
  
  // 连接池配置检查
  if (config.pool) {
    if (!PRODUCTION_RULES.connectionPool(config.pool)) {
      errors.push('连接池配置不符合生产环境要求');
      securityScore -= 15;
    }
    
    // 检查连接池安全配置
    if (config.pool.max > 100) {
      warnings.push('连接池最大连接数过高，可能影响性能');
      securityScore -= 5;
    }
    
    if (config.pool.idle > 300000) {
      warnings.push('连接池空闲时间过长，可能造成资源浪费');
      securityScore -= 5;
    }
  }
  
  // 密码强度检查
  if (config.password) {
    if (config.password.length < 12) {
      errors.push('生产环境密码长度至少需要12个字符');
      securityScore -= 20;
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(config.password)) {
      warnings.push('密码强度不足，建议包含大小写字母、数字和特殊字符');
      securityScore -= 10;
    }
  }
  
  // 主机安全检查
  if (config.host === 'localhost' || config.host === '127.0.0.1') {
    warnings.push('生产环境不建议使用localhost');
    securityScore -= 10;
  }
  
  // 用户名安全检查
  const unsafeUsernames = ['postgres', 'admin', 'root', 'sa', 'user'];
  if (unsafeUsernames.includes(config.username)) {
    warnings.push('使用默认用户名存在安全风险');
    securityScore -= 10;
  }
  
  // 审计和监控检查
  if (!config.healthCheck || !config.healthCheck.enabled) {
    warnings.push('未启用数据库健康检查');
    securityScore -= 5;
  }
  
  if (!config.security || !config.security.auditLog) {
    warnings.push('未启用数据库审计日志');
    securityScore -= 10;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    securityScore: Math.max(0, securityScore),
    recommendations: generateProductionRecommendations(config, securityScore)
  };
}

/**
 * 生成生产环境建议
 * @param {Object} config - 配置对象
 * @param {number} securityScore - 安全分数
 * @returns {Array} 建议列表
 */
function generateProductionRecommendations(config, securityScore) {
  const recommendations = [];
  
  if (securityScore < 80) {
    recommendations.push('安全分数偏低，建议立即优化安全配置');
  }
  
  if (!config.ssl) {
    recommendations.push('启用SSL/TLS加密连接');
  }
  
  if (!config.security?.encryptionAtRest) {
    recommendations.push('启用数据库静态加密');
  }
  
  if (!config.security?.passwordRotation) {
    recommendations.push('实施定期密码轮换策略');
  }
  
  recommendations.push('定期备份数据库');
  recommendations.push('配置数据库防火墙规则');
  recommendations.push('监控数据库性能指标');
  
  return recommendations;
}

/**
 * 加载环境变量文件
 * @param {string} filePath - .env文件路径
 * @returns {boolean} 是否成功加载
 */
function loadEnvFile(filePath = '.env') {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`环境变量文件 ${filePath} 不存在`);
      return false;
    }
    
    const envContent = fs.readFileSync(filePath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach((line, index) => {
      line = line.trim();
      
      // 跳过空行和注释
      if (!line || line.startsWith('#')) {
        return;
      }
      
      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) {
        console.warn(`第 ${index + 1} 行格式错误: ${line}`);
        return;
      }
      
      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();
      
      // 移除引号
      const cleanValue = value.replace(/^["']|["']$/g, '');
      
      // 只有在环境变量未设置时才设置
      if (!process.env[key]) {
        process.env[key] = cleanValue;
      }
    });
    
    return true;
  } catch (error) {
    console.error(`加载环境变量文件失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  validateEnvVar,
  EnvValidator,
  validators,
  createDatabaseValidator,
  createAppValidator,
  validateEnv,
  loadEnvFile,
  validateProductionConfig,
  generateProductionRecommendations,
  PRODUCTION_RULES
};