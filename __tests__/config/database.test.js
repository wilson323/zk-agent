/**
 * @file database.test.js
 * @description 数据库配置测试
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

const { getDatabaseConfig, validateDatabaseConfig } = require('../../config/database.config');

describe('数据库配置测试', () => {
  test('应该能够获取测试数据库配置', () => {
    process.env.NODE_ENV = 'test';
    const config = getDatabaseConfig();
    
    expect(config).toBeDefined();
    expect(config.database).toBe('zkagent2');
    expect(config.port).toBe(5432);
    expect(config.password).toBe('123456');
  });

  test('应该能够获取生产数据库配置', () => {
    process.env.NODE_ENV = 'production';
    const config = getDatabaseConfig();
    
    expect(config).toBeDefined();
    expect(config.database).toBe('zkagent1');
    expect(config.port).toBe(5432);
    expect(config.password).toBe('123456');
  });

  test('应该能够验证数据库配置', () => {
    expect(validateDatabaseConfig('test')).toBe(true);
    expect(validateDatabaseConfig('production')).toBe(true);
    expect(validateDatabaseConfig('invalid')).toBe(false);
  });

  test('数据库连接字符串格式正确', () => {
    process.env.NODE_ENV = 'test';
    const config = getDatabaseConfig();
    
    expect(config.connectionString).toMatch(/^postgresql:\/\/postgres:123456@localhost:5432\/zkagent2$/);
  });
}); 