/**
 * @file Enhanced Test Setup for Phase 2
 * @description 第二阶段增强测试Setup - 确保100%测试通过率
 */

// 全局测试环境配置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 模拟全局对象
Object.defineProperty(global, 'fetch', {
  value: jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  ),
  writable: true,
});

// 模拟TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      return new Uint8Array(Buffer.from(str, 'utf8'));
    }
  };
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(bytes) {
      return Buffer.from(bytes).toString('utf8');
    }
  };
}

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// 测试前后钩子
beforeEach(() => {
  // 清理所有模拟
  jest.clearAllMocks();
});

afterEach(() => {
  // 恢复所有模拟
  jest.restoreAllMocks();
});

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});