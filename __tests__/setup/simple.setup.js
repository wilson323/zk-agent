/**
 * @file simple.setup.js
 * @description 简化的Jest设置 - 基础测试环境
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

// 环境变量设置
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:123456@localhost:5432/zkagent2';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only-32-chars-minimum';

// 全局Mock设置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// 基础全局变量
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// 启用Mock数据
process.env.ENABLE_MOCKS = 'true'; 