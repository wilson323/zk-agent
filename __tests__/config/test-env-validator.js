/**
 * @file test-env-validator.js
 * @description 测试环境变量验证器
 * @author Jest修复团队
 * @lastUpdate 2024-12-19
 */

const crypto = require('crypto');

/**
 * 验证环境变量配置
 * @param {Object} env - 环境变量对象
 * @returns {Object} 验证结果
 */
function validateTestEnvironment(env = process.env) {
  const errors = [];
  const warnings = [];
  const validatedConfig = {};

  // 必需的环境变量
  const requiredVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  // 检查必需变量
  requiredVars.forEach(varName => {
    if (!env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    } else {
      validatedConfig[varName] = env[varName];
    }
  });

  // 验证密钥长度
  const secretVars = [
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'TEST_ENCRYPTION_KEY',
    'TEST_CSRF_SECRET',
    'WEBHOOK_SECRET'
  ];

  secretVars.forEach(varName => {
    if (env[varName]) {
      if (env[varName].length < 32) {
        errors.push(`${varName} must be at least 32 characters long`);
      } else {
        validatedConfig[varName] = env[varName];
      }
    }
  });

  // 验证URL格式
  const urlVars = [
    { name: 'DATABASE_URL', pattern: /^postgresql:\/\// },
    { name: 'REDIS_URL', pattern: /^redis:\/\// },
    { name: 'NEXTAUTH_URL', pattern: /^https?:\/\// },
    { name: 'FASTGPT_API_URL', pattern: /^https?:\/\// },
    { name: 'QWEN_BASE_URL', pattern: /^https?:\/\// },
    { name: 'SILICONFLOW_BASE_URL', pattern: /^https?:\/\// }
  ];

  urlVars.forEach(({ name, pattern }) => {
    if (env[name] && !pattern.test(env[name])) {
      errors.push(`${name} has invalid URL format`);
    } else if (env[name]) {
      validatedConfig[name] = env[name];
    }
  });

  // 验证数值类型
  const numericVars = [
    { name: 'TEST_TIMEOUT', min: 1000, max: 300000 },
    { name: 'MEMORY_LIMIT_MB', min: 128, max: 8192 },
    { name: 'MAX_FILE_SIZE', min: 1024, max: 104857600 },
    { name: 'SMTP_PORT', min: 1, max: 65535 },
    { name: 'API_RATE_LIMIT', min: 1, max: 10000 },
    { name: 'API_RATE_WINDOW', min: 60, max: 86400 },
    { name: 'CACHE_TTL', min: 1, max: 3600 },
    { name: 'CACHE_MAX_SIZE', min: 1, max: 10000 }
  ];

  numericVars.forEach(({ name, min, max }) => {
    if (env[name]) {
      const value = parseInt(env[name], 10);
      if (isNaN(value)) {
        errors.push(`${name} must be a valid number`);
      } else if (value < min || value > max) {
        warnings.push(`${name} value ${value} is outside recommended range [${min}, ${max}]`);
      } else {
        validatedConfig[name] = value;
      }
    }
  });

  // 验证布尔值
  const booleanVars = [
    'ENABLE_MOCKS',
    'TEST_VERBOSE',
    'MOCK_EXTERNAL_APIS',
    'MOCK_DATABASE',
    'MOCK_REDIS',
    'TEST_LOG_SILENT',
    'PERF_TEST_ENABLED',
    'MONITORING_ENABLED',
    'METRICS_ENABLED',
    'FEATURE_FLAG_NEW_UI',
    'FEATURE_FLAG_ADVANCED_ANALYTICS',
    'FEATURE_FLAG_BETA_FEATURES'
  ];

  booleanVars.forEach(varName => {
    if (env[varName]) {
      const value = env[varName].toLowerCase();
      if (!['true', 'false', '1', '0'].includes(value)) {
        errors.push(`${varName} must be a boolean value (true/false)`);
      } else {
        validatedConfig[varName] = value === 'true' || value === '1';
      }
    }
  });

  // 验证邮箱格式
  const emailVars = ['SMTP_USER', 'SMTP_FROM'];
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  emailVars.forEach(varName => {
    if (env[varName] && !emailPattern.test(env[varName])) {
      errors.push(`${varName} has invalid email format`);
    } else if (env[varName]) {
      validatedConfig[varName] = env[varName];
    }
  });

  // 验证日志级别
  if (env.LOG_LEVEL) {
    const validLevels = ['error', 'warn', 'info', 'debug', 'trace'];
    if (!validLevels.includes(env.LOG_LEVEL.toLowerCase())) {
      errors.push(`LOG_LEVEL must be one of: ${validLevels.join(', ')}`);
    } else {
      validatedConfig.LOG_LEVEL = env.LOG_LEVEL.toLowerCase();
    }
  }

  // 生成动态密钥（如果需要）
  if (!env.JWT_SECRET || env.JWT_SECRET.includes('test-jwt-secret')) {
    warnings.push('Using default test JWT secret. Consider generating a unique one.');
    validatedConfig.GENERATED_JWT_SECRET = crypto.randomBytes(32).toString('hex');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config: validatedConfig,
    summary: {
      totalChecked: Object.keys(env).length,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      validatedCount: Object.keys(validatedConfig).length
    }
  };
}

/**
 * 生成安全的测试密钥
 * @param {number} length - 密钥长度
 * @returns {string} 生成的密钥
 */
function generateTestSecret(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * 创建测试环境配置
 * @param {Object} overrides - 覆盖配置
 * @returns {Object} 测试配置
 */
function createTestConfig(overrides = {}) {
  const defaultConfig = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    JWT_SECRET: generateTestSecret(32),
    NEXTAUTH_SECRET: generateTestSecret(32),
    NEXTAUTH_URL: 'http://localhost:3000',
    REDIS_URL: 'redis://localhost:6379',
    ENABLE_MOCKS: true,
    TEST_TIMEOUT: 30000,
    TEST_VERBOSE: false,
    LOG_LEVEL: 'error',
    TEST_LOG_SILENT: true
  };

  return { ...defaultConfig, ...overrides };
}

/**
 * 安全地设置环境变量
 * @param {Object} config - 配置对象
 * @param {boolean} force - 是否强制覆盖现有值
 */
function setTestEnvironment(config, force = false) {
  Object.entries(config).forEach(([key, value]) => {
    if (force || !process.env[key]) {
      process.env[key] = String(value);
    }
  });
}

/**
 * 清理测试环境变量
 * @param {Array<string>} keys - 要清理的环境变量键
 */
function cleanupTestEnvironment(keys = []) {
  const testKeys = keys.length > 0 ? keys : [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'REDIS_URL',
    'FASTGPT_API_KEY',
    'QWEN_API_KEY',
    'SILICONFLOW_API_KEY'
  ];

  testKeys.forEach(key => {
    delete process.env[key];
  });
}

module.exports = {
  validateTestEnvironment,
  generateTestSecret,
  createTestConfig,
  setTestEnvironment,
  cleanupTestEnvironment
};