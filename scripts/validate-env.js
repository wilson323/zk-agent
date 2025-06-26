#!/usr/bin/env node

/**
 * ZK-Agent 环境变量验证脚本
 * 确保生产环境配置的完整性和安全性
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 必需的环境变量配置
const requiredEnvVars = {
  // 基础配置
  NODE_ENV: {
    required: true,
    type: 'string',
    allowedValues: ['development', 'production', 'test'],
    description: '应用运行环境'
  },
  
  // 数据库配置
  DATABASE_URL: {
    required: true,
    type: 'string',
    pattern: /^postgresql:\/\/.+/,
    description: 'PostgreSQL 数据库连接字符串'
  },
  DB_PASSWORD: {
    required: true,
    type: 'string',
    minLength: 12,
    security: true,
    description: '数据库密码'
  },
  
  // Redis配置
  REDIS_URL: {
    required: true,
    type: 'string',
    pattern: /^redis:\/\/.+/,
    description: 'Redis 连接字符串'
  },
  REDIS_PASSWORD: {
    required: true,
    type: 'string',
    minLength: 8,
    security: true,
    description: 'Redis 密码'
  },
  
  // JWT配置
  JWT_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    security: true,
    description: 'JWT 签名密钥'
  },
  JWT_REFRESH_SECRET: {
    required: true,
    type: 'string',
    minLength: 32,
    security: true,
    description: 'JWT 刷新令牌密钥'
  },
  
  // 加密配置
  ENCRYPTION_KEY: {
    required: true,
    type: 'string',
    exactLength: 32,
    security: true,
    description: '数据加密密钥（32字节）'
  },
  CSRF_SECRET: {
    required: true,
    type: 'string',
    minLength: 16,
    security: true,
    description: 'CSRF 保护密钥'
  },
  SESSION_SECRET: {
    required: true,
    type: 'string',
    minLength: 16,
    security: true,
    description: '会话密钥'
  },
  
  // API配置
  API_BASE_URL: {
    required: true,
    type: 'string',
    pattern: /^https?:\/\/.+/,
    description: 'API 基础URL'
  },
  
  // 外部服务
  OPENAI_API_KEY: {
    required: false,
    type: 'string',
    pattern: /^sk-.+/,
    security: true,
    description: 'OpenAI API 密钥'
  },
  
  // 邮件服务
  SMTP_PASSWORD: {
    required: false,
    type: 'string',
    minLength: 8,
    security: true,
    description: 'SMTP 邮件服务密码'
  },
  
  // 监控配置
  SENTRY_DSN: {
    required: false,
    type: 'string',
    pattern: /^https:\/\/.+/,
    description: 'Sentry 错误追踪DSN'
  },
  
  // Grafana配置
  GRAFANA_PASSWORD: {
    required: false,
    type: 'string',
    minLength: 8,
    security: true,
    description: 'Grafana 管理员密码'
  },
  GRAFANA_SECRET_KEY: {
    required: false,
    type: 'string',
    minLength: 16,
    security: true,
    description: 'Grafana 密钥'
  }
};

// 默认值不应在生产环境使用
const dangerousDefaults = [
  'CHANGE_ME_IN_PRODUCTION',
  'CHANGE_ME_TO_RANDOM_256_BIT_SECRET',
  'CHANGE_ME_TO_ANOTHER_RANDOM_256_BIT_SECRET',
  'CHANGE_ME_TO_32_BYTE_ENCRYPTION_KEY',
  'CHANGE_ME_TO_RANDOM_SECRET',
  'CHANGE_ME_TO_RANDOM_SESSION_SECRET',
  'CHANGE_ME_TO_YOUR_OPENAI_KEY',
  'CHANGE_ME_TO_EMAIL_PASSWORD',
  'CHANGE_ME_TO_YOUR_SENTRY_DSN',
  'password',
  'admin',
  'secret',
  '123456'
];

/**
 * 加载环境变量
 */
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=');
          // 移除引号
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[key] = value;
        }
      }
    });
    
    return env;
  } catch (error) {
    throw new Error(`无法读取环境文件 ${filePath}: ${error.message}`);
  }
}

/**
 * 验证单个环境变量
 */
function validateEnvVar(key, value, config) {
  const errors = [];
  const warnings = [];
  
  // 检查是否为必需
  if (config.required && (!value || value.trim() === '')) {
    errors.push(`${key} 是必需的但未设置`);
    return { errors, warnings };
  }
  
  // 如果不是必需且未设置，跳过其他检查
  if (!value || value.trim() === '') {
    return { errors, warnings };
  }
  
  // 检查类型
  if (config.type === 'string' && typeof value !== 'string') {
    errors.push(`${key} 应该是字符串类型`);
  }
  
  // 检查长度
  if (config.minLength && value.length < config.minLength) {
    errors.push(`${key} 长度至少应为 ${config.minLength} 个字符`);
  }
  
  if (config.maxLength && value.length > config.maxLength) {
    errors.push(`${key} 长度不应超过 ${config.maxLength} 个字符`);
  }
  
  if (config.exactLength && value.length !== config.exactLength) {
    errors.push(`${key} 长度应该正好是 ${config.exactLength} 个字符`);
  }
  
  // 检查模式
  if (config.pattern && !config.pattern.test(value)) {
    errors.push(`${key} 格式不正确`);
  }
  
  // 检查允许的值
  if (config.allowedValues && !config.allowedValues.includes(value)) {
    errors.push(`${key} 值应该是: ${config.allowedValues.join(', ')}`);
  }
  
  // 检查危险的默认值
  if (dangerousDefaults.includes(value)) {
    errors.push(`${key} 使用了不安全的默认值，必须更改`);
  }
  
  // 安全性检查
  if (config.security) {
    // 检查是否包含常见的弱密码模式
    const weakPatterns = [
      /^(password|admin|secret|test)\d*$/i,
      /^\d+$/,
      /^[a-z]+$/,
      /^[A-Z]+$/,
      /^(.)\1{7,}$/ // 重复字符
    ];
    
    if (weakPatterns.some(pattern => pattern.test(value))) {
      warnings.push(`${key} 可能使用了弱密码模式`);
    }
    
    // 检查熵值
    const entropy = calculateEntropy(value);
    if (entropy < 3.0) {
      warnings.push(`${key} 熵值较低 (${entropy.toFixed(2)})，建议使用更复杂的值`);
    }
  }
  
  return { errors, warnings };
}

/**
 * 计算字符串熵值
 */
function calculateEntropy(str) {
  const freq = {};
  for (let char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (let char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

/**
 * 生成安全的随机字符串
 */
function generateSecureString(length = 32) {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

/**
 * 主验证函数
 */
function validateEnvironment(envFilePath) {
  colorLog('blue', `\n🔍 验证环境配置: ${envFilePath}`);
  colorLog('blue', '='.repeat(50));
  
  let env;
  try {
    env = loadEnvFile(envFilePath);
  } catch (error) {
    colorLog('red', `❌ ${error.message}`);
    return false;
  }
  
  let hasErrors = false;
  let hasWarnings = false;
  const suggestions = [];
  
  // 验证每个环境变量
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = env[key];
    const { errors, warnings } = validateEnvVar(key, value, config);
    
    if (errors.length > 0) {
      hasErrors = true;
      colorLog('red', `❌ ${key}:`);
      errors.forEach(error => colorLog('red', `   ${error}`));
      
      // 提供修复建议
      if (config.security && (!value || dangerousDefaults.includes(value))) {
        const suggestion = generateSecureString(config.minLength || config.exactLength || 32);
        suggestions.push(`${key}=${suggestion}`);
        colorLog('cyan', `   💡 建议值: ${suggestion}`);
      }
    } else if (warnings.length > 0) {
      hasWarnings = true;
      colorLog('yellow', `⚠️  ${key}:`);
      warnings.forEach(warning => colorLog('yellow', `   ${warning}`));
    } else if (value) {
      colorLog('green', `✅ ${key}: 配置正确`);
    }
  }
  
  // 检查未知的环境变量
  const unknownVars = Object.keys(env).filter(key => !requiredEnvVars[key]);
  if (unknownVars.length > 0) {
    colorLog('yellow', `\n⚠️  发现未知的环境变量:`);
    unknownVars.forEach(key => {
      colorLog('yellow', `   ${key}`);
    });
  }
  
  // 输出总结
  colorLog('blue', '\n📊 验证总结:');
  colorLog('blue', '='.repeat(30));
  
  if (hasErrors) {
    colorLog('red', '❌ 验证失败 - 发现错误需要修复');
    
    if (suggestions.length > 0) {
      colorLog('cyan', '\n💡 建议的安全配置:');
      suggestions.forEach(suggestion => {
        colorLog('cyan', `   ${suggestion}`);
      });
    }
    
    return false;
  } else if (hasWarnings) {
    colorLog('yellow', '⚠️  验证通过但有警告');
    return true;
  } else {
    colorLog('green', '✅ 验证完全通过');
    return true;
  }
}

/**
 * 生成示例环境文件
 */
function generateExampleEnv() {
  colorLog('blue', '\n🔧 生成安全的环境配置示例...');
  
  const exampleEnv = [];
  exampleEnv.push('# ZK-Agent 生产环境配置');
  exampleEnv.push('# 自动生成的安全配置示例');
  exampleEnv.push(`# 生成时间: ${new Date().toISOString()}`);
  exampleEnv.push('');
  
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    if (config.description) {
      exampleEnv.push(`# ${config.description}`);
    }
    
    let value;
    if (config.security) {
      value = generateSecureString(config.minLength || config.exactLength || 32);
    } else if (config.allowedValues) {
      value = config.allowedValues[0];
    } else {
      value = `CHANGE_ME_${key}`;
    }
    
    exampleEnv.push(`${key}=${value}`);
    exampleEnv.push('');
  }
  
  const outputPath = path.join(process.cwd(), '.env.generated');
  fs.writeFileSync(outputPath, exampleEnv.join('\n'));
  
  colorLog('green', `✅ 示例配置已生成: ${outputPath}`);
  colorLog('yellow', '⚠️  请根据实际情况修改配置值');
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'validate':
      const envFile = args[1] || '.env.production';
      const isValid = validateEnvironment(envFile);
      process.exit(isValid ? 0 : 1);
      break;
      
    case 'generate':
      generateExampleEnv();
      break;
      
    default:
      colorLog('blue', '\n🔧 ZK-Agent 环境变量验证工具');
      colorLog('blue', '='.repeat(40));
      colorLog('white', '\n用法:');
      colorLog('white', '  node validate-env.js validate [env-file]  # 验证环境配置');
      colorLog('white', '  node validate-env.js generate            # 生成示例配置');
      colorLog('white', '\n示例:');
      colorLog('white', '  node validate-env.js validate .env.production');
      colorLog('white', '  node validate-env.js generate');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateEnvironment,
  generateExampleEnv,
  loadEnvFile,
  validateEnvVar
};