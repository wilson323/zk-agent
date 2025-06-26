/**
 * @file jest.setup.fixed.js
 * @description Fixed Jest setup - Resolves infinite loop and security issues
 * @author Jest Fix Team
 * @lastUpdate 2024-12-19
 */

// Load test environment variables from .env.test file
require('dotenv').config({ path: '.env.test' });

// Import required modules with error handling
require('@testing-library/jest-dom');
const { validateTestEnvironment, createTestConfig, setTestEnvironment } = require('./__tests__/config/test-env-validator');

// Import Jest configuration validator
const { 
  validateJestConfig, 
  validateTestEnvironment: validateJestTestEnv,
  createSafePolyfills,
  applySafePolyfills 
} = require('./__tests__/config/jest-config-validator');

// Apply safe polyfills with enhanced error handling
const safePolyfills = createSafePolyfills();
applySafePolyfills(safePolyfills);

// Validate and setup test environment
const envValidation = validateTestEnvironment();
if (!envValidation.isValid) {
  console.error('Environment validation failed:');
  envValidation.errors.forEach(error => console.error(`  - ${error}`));
  
  // Use fallback configuration
  console.warn('Using fallback test configuration...');
  const fallbackConfig = createTestConfig();
  setTestEnvironment(fallbackConfig, false);
}

if (envValidation.warnings.length > 0) {
  console.warn('Environment validation warnings:');
  envValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

// Validate Jest configuration
validateJestConfig();
validateJestTestEnv();

// Ensure test environment
process.env.NODE_ENV = 'test';

// Fix EventEmitter memory leak warnings
require('events').EventEmitter.defaultMaxListeners = 20;

// Mock process.exit to prevent Jest from exiting
const originalExit = process.exit;
process.exit = jest.fn((code) => {
  if (process.env.NODE_ENV === 'test') {
    console.warn(`process.exit(${code}) called in test environment - mocked`);
    return;
  }
  return originalExit(code);
});

// Global Mock setup
global.fetch = jest.fn();
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Next.js Router Mock
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

// Prisma Mock
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    agentConfig: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    posterTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    errorLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    usageStats: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  })),
  Prisma: {
    TransactionIsolationLevel: {
      ReadCommitted: 'ReadCommitted',
      ReadUncommitted: 'ReadUncommitted',
      RepeatableRead: 'RepeatableRead',
      Serializable: 'Serializable',
    },
  },
}));

// File System Mock
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
}));

// Crypto Mock
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// MSW Server Setup - 移除MSW依赖，使用简化版本
// beforeAll(() => {
//   server.listen({
//     onUnhandledRequest: 'error',
//   });
// });

afterEach(() => {
  // server.resetHandlers(); // 移除MSW依赖
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

// afterAll(() => {
//   server.close();
// });

// 测试工具函数
global.testUtils = {
  // 创建Mock用户
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // 创建Mock智能体
  createMockAgent: (overrides = {}) => ({
    id: 'test-agent-id',
    name: 'Test Agent',
    description: 'Test agent description',
    systemPrompt: 'You are a test agent',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    isPublic: true,
    createdBy: 'test-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // 创建Mock聊天会话
  createMockChatSession: (overrides = {}) => ({
    id: 'test-session-id',
    title: 'Test Chat Session',
    userId: 'test-user-id',
    agentId: 'test-agent-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // 创建Mock API响应
  createMockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Map(),
  }),

  // 等待异步操作
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // 模拟网络延迟
  simulateNetworkDelay: (min = 100, max = 500) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  createMockSecurityEvent: () => ({
    id: 'test-event-123',
    type: 'login_success',
    severity: 'low',
    timestamp: new Date(),
    ip: '192.168.1.100',
    userId: 'test-user-123',
    details: {},
    riskScore: 1,
    resolved: false,
  }),
  
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};

// 性能测试工具
global.performanceUtils = {
  // 测量函数执行时间
  measureTime: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start,
    };
  },

  // 内存使用测试
  measureMemory: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};

// 错误处理增强
const originalConsoleError = console.error;
console.error = (...args) => {
  // 忽略某些预期的测试错误
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is deprecated') ||
     message.includes('Warning: componentWillReceiveProps has been renamed'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// 全局测试配置
jest.setTimeout(30000); // 30秒超时

// 移除导致死循环的模块强制加载
// 注释：原来的 global.beforeAll 中的 require 语句会导致循环引用
// 这些模块应该在需要时才加载，而不是在全局设置中强制加载

console.log('Fixed Jest setup completed - 死循环问题已解决');