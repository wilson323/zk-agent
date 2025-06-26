/**
 * 生产环境配置验证脚本
 * 验证数据库配置、环境变量等生产环境设置
 */

const fs = require('fs');
const path = require('path');

// 设置生产环境变量
process.env.NODE_ENV = 'production';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'zk_agent_prod';
process.env.DB_USER = 'zk_agent_user';
process.env.DB_PASSWORD = 'Zk@Agent2024!Prod#Db$';
process.env.DB_SSL = 'true';
process.env.DATABASE_URL = 'postgresql://zk_agent_user:Zk@Agent2024!Prod#Db$@localhost:5432/zk_agent_prod?schema=public&sslmode=require';
process.env.JWT_SECRET = 'Zk@Agent2024!JWT#Secret$Prod%Key&';
process.env.JWT_REFRESH_SECRET = 'Zk@Agent2024!Refresh#Token$Secret%Key&';
process.env.ENCRYPTION_KEY = 'Zk@Agent2024!Encrypt#Key$Prod%Data&';
process.env.DATABASE_SSL = 'true';
process.env.DATABASE_SSL_CERT = './ssl/certs/server.crt';
process.env.DATABASE_SSL_KEY = './ssl/certs/server.key';
process.env.DATABASE_SSL_CA = './ssl/certs/ca.crt';
process.env.DATABASE_ENCRYPTION_AT_REST = 'true';

try {
  const { 
    validateDatabaseConfig, 
    generateSecurityReport,
    getDatabaseSecurityConfig 
  } = require('../lib/database/database.config.js');

  console.log('=== 生产环境配置验证开始 ===\n');

  // 1. 验证数据库配置
  console.log('1. 数据库配置验证:');
  const prodValidation = validateDatabaseConfig('production');
  console.log(`   配置有效性: ${prodValidation.valid ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   安全分数: ${prodValidation.securityScore}/100`);
  console.log(`   性能分数: ${prodValidation.performanceScore}/100`);
  
  if (prodValidation.errors.length > 0) {
    console.log('   错误:');
    prodValidation.errors.forEach(error => console.log(`     - ${error}`));
  }
  
  if (prodValidation.warnings.length > 0) {
    console.log('   警告:');
    prodValidation.warnings.forEach(warning => console.log(`     - ${warning}`));
  }
  
  if (prodValidation.recommendations.length > 0) {
    console.log('   建议:');
    prodValidation.recommendations.forEach(rec => console.log(`     - ${rec}`));
  }

  console.log('\n2. 安全配置检查:');
  const securityConfig = getDatabaseSecurityConfig('production');
  console.log(`   SSL启用: ${securityConfig.ssl ? '✅ 是' : '❌ 否'}`);
  console.log(`   安全功能: ${securityConfig.security.enabled ? '✅ 启用' : '❌ 禁用'}`);
  console.log(`   审计日志: ${securityConfig.security.auditLog ? '✅ 启用' : '❌ 禁用'}`);
  console.log(`   传输加密: ${securityConfig.security.encryptionInTransit ? '✅ 启用' : '❌ 禁用'}`);
  console.log(`   静态加密: ${securityConfig.security.encryptionAtRest ? '✅ 启用' : '❌ 禁用'}`);

  console.log('\n3. 连接池配置:');
  console.log(`   最大连接数: ${securityConfig.pool.max}`);
  console.log(`   最小连接数: ${securityConfig.pool.min}`);
  console.log(`   获取超时: ${securityConfig.pool.acquire}ms`);
  console.log(`   空闲超时: ${securityConfig.pool.idle}ms`);

  console.log('\n4. 环境变量检查:');
  const requiredEnvVars = [
    'NODE_ENV', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'
  ];
  
  const missingVars = [];
  const weakVars = [];
  
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
    } else {
      // 检查敏感变量的强度
      if (varName.includes('PASSWORD') || varName.includes('SECRET') || varName.includes('KEY')) {
        if (value.length < 12) {
          weakVars.push(`${varName} (长度不足12位)`);
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          weakVars.push(`${varName} (缺少大小写字母或数字)`);
        }
      }
    }
  });
  
  if (missingVars.length === 0) {
    console.log('   必需环境变量: ✅ 全部设置');
  } else {
    console.log('   缺失环境变量:');
    missingVars.forEach(varName => console.log(`     - ${varName}`));
  }
  
  if (weakVars.length > 0) {
    console.log('   弱密码/密钥:');
    weakVars.forEach(varName => console.log(`     - ${varName}`));
  }

  console.log('\n5. SSL证书检查:');
  const sslPaths = [
    path.join(process.cwd(), 'ssl', 'certs', 'server.crt'),
    path.join(process.cwd(), 'ssl', 'certs', 'server.key'),
    path.join(process.cwd(), 'ssl', 'certs', 'ca.crt')
  ];
  
  sslPaths.forEach(certPath => {
    const exists = fs.existsSync(certPath);
    const fileName = path.basename(certPath);
    console.log(`   ${fileName}: ${exists ? '✅ 存在' : '❌ 缺失'}`);
  });

  console.log('\n6. 生产环境安全报告:');
  const securityReport = generateSecurityReport('production');
  console.log(`   安全级别: ${securityReport.securityLevel}`);
  console.log(`   安全分数: ${securityReport.securityScore}/100`);
  console.log(`   状态: ${securityReport.status}`);
  
  if (securityReport.issues.length > 0) {
    console.log('   安全问题:');
    securityReport.issues.forEach(issue => {
      const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`     ${severity} ${issue.message} (${issue.category})`);
    });
  }
  
  if (securityReport.recommendations.length > 0) {
    console.log('   安全建议:');
    securityReport.recommendations.slice(0, 5).forEach(rec => console.log(`     - ${rec}`));
  }

  console.log('\n=== 配置验证完成 ===');
  
  // 生成优化建议
  console.log('\n=== 优化建议 ===');
  const optimizations = [];
  
  if (prodValidation.securityScore < 85) {
    optimizations.push('提升数据库安全配置');
  }
  
  if (!securityConfig.ssl) {
    optimizations.push('启用SSL/TLS加密连接');
  }
  
  if (!securityConfig.security.auditLog) {
    optimizations.push('启用数据库审计日志');
  }
  
  if (weakVars.length > 0) {
    optimizations.push('加强密码和密钥强度');
  }
  
  if (missingVars.length > 0) {
    optimizations.push('补充缺失的环境变量');
  }
  
  if (optimizations.length === 0) {
    console.log('✅ 配置已优化，无需额外改进');
  } else {
    console.log('需要优化的项目:');
    optimizations.forEach((opt, index) => console.log(`${index + 1}. ${opt}`));
  }
  
} catch (error) {
  console.error('配置验证失败:', error.message);
  console.error('错误详情:', error.stack);
  process.exit(1);
}