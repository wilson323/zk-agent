/**
 * @file 数据库安全配置验证脚本
 * @description 验证数据库安全配置是否符合生产环境标准
 * @author ZK-Agent Team
 * @date 2024-06-25
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { 
  validateSecurityConfig,
  generateSecurityReport,
  validatePassword,
  calculateSecurityScore
} = require('../lib/database/security-config');
const { 
  validateDatabaseConfig,
  getDatabaseSecurityConfig
} = require('../lib/database/database.config');

/**
 * 数据库安全验证器类
 */
class DatabaseSecurityValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        securityScore: 0
      }
    };
  }

  /**
   * 添加测试结果
   * @param {string} testName - 测试名称
   * @param {boolean} passed - 是否通过
   * @param {string} message - 测试消息
   * @param {string} severity - 严重程度
   */
  addTestResult(testName, passed, message, severity = 'info') {
    const result = {
      name: testName,
      passed,
      message,
      severity,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(result);
    this.results.summary.total++;
    
    if (passed) {
      this.results.summary.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.results.summary.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
    
    if (severity === 'warning') {
      this.results.summary.warnings++;
      console.log(`⚠️  ${testName}: ${message}`);
    }
  }

  /**
   * 验证SSL配置
   * @param {string} env - 环境名称
   */
  validateSSLConfiguration(env) {
    console.log(`\n🔒 验证 ${env} 环境SSL配置...`);
    
    try {
      const securityConfig = getDatabaseSecurityConfig(env);
      const sslConfig = securityConfig.ssl;
      
      // 检查SSL是否启用
      if (env === 'production') {
        if (sslConfig === false) {
          this.addTestResult(
            'SSL启用检查',
            false,
            '生产环境必须启用SSL加密',
            'error'
          );
        } else {
          this.addTestResult(
            'SSL启用检查',
            true,
            '生产环境已启用SSL加密'
          );
          
          // 检查证书验证
          if (sslConfig.rejectUnauthorized === false) {
            this.addTestResult(
              'SSL证书验证',
              false,
              '生产环境应启用证书验证',
              'warning'
            );
          } else {
            this.addTestResult(
              'SSL证书验证',
              true,
              'SSL证书验证已启用'
            );
          }
        }
      } else {
        // 开发和测试环境
        if (sslConfig !== false) {
          this.addTestResult(
            'SSL配置检查',
            true,
            `${env}环境已配置SSL（可选）`
          );
        } else {
          this.addTestResult(
            'SSL配置检查',
            true,
            `${env}环境未启用SSL（正常）`,
            'info'
          );
        }
      }
      
      // 检查SSL证书文件
      if (sslConfig && sslConfig !== false) {
        const certPath = path.join(process.cwd(), 'ssl', 'certs', 'server.crt');
        const keyPath = path.join(process.cwd(), 'ssl', 'certs', 'server.key');
        
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
          this.addTestResult(
            'SSL证书文件检查',
            true,
            'SSL证书文件存在'
          );
        } else {
          this.addTestResult(
            'SSL证书文件检查',
            false,
            'SSL证书文件不存在',
            'warning'
          );
        }
      }
      
    } catch (error) {
      this.addTestResult(
        'SSL配置验证',
        false,
        `SSL配置验证失败: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * 验证密码安全性
   */
  validatePasswordSecurity() {
    console.log('\n🔐 验证密码安全性...');
    
    const password = process.env.DB_PASSWORD;
    
    if (!password) {
      this.addTestResult(
        '密码存在检查',
        false,
        '数据库密码未设置',
        'error'
      );
      return;
    }
    
    try {
      const validation = validatePassword(password);
      
      if (validation.valid) {
        this.addTestResult(
          '密码强度验证',
          true,
          `密码强度: ${validation.strength}/100`
        );
      } else {
        this.addTestResult(
          '密码强度验证',
          false,
          `密码不符合安全要求: ${validation.errors.join(', ')}`,
          'error'
        );
      }
      
      // 检查密码强度等级
      if (validation.strength >= 80) {
        this.addTestResult(
          '密码强度等级',
          true,
          '密码强度优秀'
        );
      } else if (validation.strength >= 60) {
        this.addTestResult(
          '密码强度等级',
          true,
          '密码强度良好',
          'warning'
        );
      } else {
        this.addTestResult(
          '密码强度等级',
          false,
          '密码强度不足，建议使用更强的密码',
          'error'
        );
      }
      
    } catch (error) {
      this.addTestResult(
        '密码验证',
        false,
        `密码验证失败: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * 验证连接池安全配置
   * @param {string} env - 环境名称
   */
  validatePoolSecurity(env) {
    console.log(`\n🏊 验证 ${env} 环境连接池安全配置...`);
    
    try {
      const securityConfig = getDatabaseSecurityConfig(env);
      const poolConfig = securityConfig.pool;
      
      // 检查连接池大小
      if (poolConfig.max > 50) {
        this.addTestResult(
          '连接池最大连接数',
          false,
          `最大连接数过大 (${poolConfig.max})，可能存在安全风险`,
          'warning'
        );
      } else {
        this.addTestResult(
          '连接池最大连接数',
          true,
          `最大连接数合理 (${poolConfig.max})`
        );
      }
      
      // 检查空闲超时
      if (poolConfig.idle > 600000) { // 10分钟
        this.addTestResult(
          '空闲连接超时',
          false,
          `空闲超时时间过长 (${poolConfig.idle}ms)，建议缩短`,
          'warning'
        );
      } else {
        this.addTestResult(
          '空闲连接超时',
          true,
          `空闲超时时间合理 (${poolConfig.idle}ms)`
        );
      }
      
      // 检查获取连接超时
      if (poolConfig.acquire > 120000) { // 2分钟
        this.addTestResult(
          '获取连接超时',
          false,
          `获取连接超时时间过长 (${poolConfig.acquire}ms)`,
          'warning'
        );
      } else {
        this.addTestResult(
          '获取连接超时',
          true,
          `获取连接超时时间合理 (${poolConfig.acquire}ms)`
        );
      }
      
    } catch (error) {
      this.addTestResult(
        '连接池配置验证',
        false,
        `连接池配置验证失败: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * 验证数据库配置完整性
   * @param {string} env - 环境名称
   */
  validateDatabaseConfiguration(env) {
    console.log(`\n🗄️  验证 ${env} 环境数据库配置...`);
    
    try {
      const validation = validateDatabaseConfig(env);
      
      if (validation.valid) {
        this.addTestResult(
          '数据库配置验证',
          true,
          '数据库配置完整且有效'
        );
      } else {
        this.addTestResult(
          '数据库配置验证',
          false,
          `配置错误: ${validation.errors.join(', ')}`,
          'error'
        );
      }
      
      // 处理警告
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          this.addTestResult(
            '配置警告',
            true,
            warning,
            'warning'
          );
        });
      }
      
      // 记录安全分数
      this.results.summary.securityScore = validation.securityScore || 0;
      
    } catch (error) {
      this.addTestResult(
        '数据库配置验证',
        false,
        `配置验证失败: ${error.message}`,
        'error'
      );
    }
  }

  /**
   * 验证环境变量安全性
   */
  validateEnvironmentVariables() {
    console.log('\n🌍 验证环境变量安全性...');
    
    const requiredVars = {
      'DB_HOST': '数据库主机地址',
      'DB_PORT': '数据库端口',
      'DB_NAME': '数据库名称',
      'DB_USER': '数据库用户名',
      'DB_PASSWORD': '数据库密码'
    };
    
    const sensitiveVars = ['DB_PASSWORD', 'JWT_SECRET', 'ENCRYPTION_KEY'];
    
    // 检查必需的环境变量
    Object.entries(requiredVars).forEach(([varName, description]) => {
      if (process.env[varName]) {
        this.addTestResult(
          `环境变量检查: ${varName}`,
          true,
          `${description}已设置`
        );
      } else {
        this.addTestResult(
          `环境变量检查: ${varName}`,
          false,
          `${description}未设置`,
          'error'
        );
      }
    });
    
    // 检查敏感变量的安全性
    sensitiveVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        if (value.length < 8) {
          this.addTestResult(
            `敏感变量安全性: ${varName}`,
            false,
            `${varName}长度过短，存在安全风险`,
            'warning'
          );
        } else {
          this.addTestResult(
            `敏感变量安全性: ${varName}`,
            true,
            `${varName}长度符合安全要求`
          );
        }
      }
    });
  }

  /**
   * 生成安全报告
   * @param {string} env - 环境名称
   */
  generateReport(env) {
    console.log('\n📊 生成安全报告...');
    
    try {
      const securityReport = generateSecurityReport(env);
      
      // 保存详细报告
      const reportPath = path.join(process.cwd(), 'reports', `database-security-${env}-${Date.now()}.json`);
      
      // 确保报告目录存在
      const reportsDir = path.dirname(reportPath);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const fullReport = {
        ...this.results,
        securityReport,
        recommendations: securityReport.recommendations
      };
      
      fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
      
      this.addTestResult(
        '安全报告生成',
        true,
        `报告已保存到: ${reportPath}`
      );
      
      return fullReport;
      
    } catch (error) {
      this.addTestResult(
        '安全报告生成',
        false,
        `报告生成失败: ${error.message}`,
        'error'
      );
      return null;
    }
  }

  /**
   * 运行所有安全验证测试
   * @param {string} env - 环境名称
   */
  async runAllTests(env = process.env.NODE_ENV || 'development') {
    console.log(`\n🚀 开始数据库安全配置验证 (${env} 环境)`);
    console.log('=' .repeat(60));
    
    try {
      // 验证SSL配置
      this.validateSSLConfiguration(env);
      
      // 验证密码安全性
      this.validatePasswordSecurity();
      
      // 验证连接池安全配置
      this.validatePoolSecurity(env);
      
      // 验证数据库配置完整性
      this.validateDatabaseConfiguration(env);
      
      // 验证环境变量安全性
      this.validateEnvironmentVariables();
      
      // 生成安全报告
      const report = this.generateReport(env);
      
      // 输出总结
      this.printSummary();
      
      return {
        success: this.results.summary.failed === 0,
        results: this.results,
        report
      };
      
    } catch (error) {
      console.error('❌ 安全验证过程中发生错误:', error.message);
      return {
        success: false,
        error: error.message,
        results: this.results
      };
    }
  }

  /**
   * 打印验证总结
   */
  printSummary() {
    console.log('\n' + '=' .repeat(60));
    console.log('📋 数据库安全验证总结');
    console.log('=' .repeat(60));
    
    const { summary } = this.results;
    
    console.log(`总测试数: ${summary.total}`);
    console.log(`✅ 通过: ${summary.passed}`);
    console.log(`❌ 失败: ${summary.failed}`);
    console.log(`⚠️  警告: ${summary.warnings}`);
    console.log(`🔒 安全分数: ${summary.securityScore}/100`);
    
    // 安全等级评估
    let securityLevel = '未知';
    let levelColor = '';
    
    if (summary.securityScore >= 90) {
      securityLevel = '优秀';
      levelColor = '🟢';
    } else if (summary.securityScore >= 80) {
      securityLevel = '良好';
      levelColor = '🟡';
    } else if (summary.securityScore >= 60) {
      securityLevel = '一般';
      levelColor = '🟠';
    } else {
      securityLevel = '需要改进';
      levelColor = '🔴';
    }
    
    console.log(`${levelColor} 安全等级: ${securityLevel}`);
    
    // 显示失败的测试
    if (summary.failed > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`);
        });
    }
    
    // 显示警告
    if (summary.warnings > 0) {
      console.log('\n⚠️  警告信息:');
      this.results.tests
        .filter(test => test.severity === 'warning')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.message}`);
        });
    }
    
    console.log('\n' + '=' .repeat(60));
    
    // 退出码
    if (summary.failed > 0) {
      console.log('❌ 验证失败，存在安全问题需要修复');
      process.exit(1);
    } else {
      console.log('✅ 数据库安全配置验证通过');
      process.exit(0);
    }
  }
}

// 主执行逻辑
if (require.main === module) {
  const env = process.argv[2] || process.env.NODE_ENV || 'development';
  const validator = new DatabaseSecurityValidator();
  
  validator.runAllTests(env).catch(error => {
    console.error('❌ 验证过程中发生未处理的错误:', error);
    process.exit(1);
  });
}

module.exports = DatabaseSecurityValidator;