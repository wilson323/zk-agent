/**
 * Jest配置 - 智能对话功能专用（纯JavaScript版）
 * 不依赖TypeScript，确保测试能够运行
 */

module.exports = {
  displayName: 'ZK-Agent Chat Tests (JavaScript)',
  rootDir: '../',
  
  // 测试环境
  testEnvironment: 'node',
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/chat.setup.js'],
  
  // 专门测试智能对话相关文件
  testMatch: [
    '<rootDir>/__tests__/lib/chat/**/*.test.js',
    '<rootDir>/__tests__/api/chat/**/*.test.js',
    '<rootDir>/__tests__/integration/chat/**/*.test.js'
  ],
  
  // 忽略的文件
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/mocks/',
    '<rootDir>/__tests__/fixtures/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // 覆盖率配置 - 专注智能对话
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/chat/**/*.{js,ts}',
    'app/api/ag-ui/chat/**/*.{js,ts}',
    'app/api/fastgpt/**/*.{js,ts}',
    'lib/ai/**/*.{js,ts}',
    'lib/utils/fastgpt-utils.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/__tests__/**'
  ],
  
  // 智能对话功能要求100%覆盖率
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // 覆盖率报告
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage/chat',
  
  // 测试超时
  testTimeout: 15000,
  
  // 并发控制
  maxWorkers: 1,
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: false,
  
  // 清除模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 模块文件扩展名
  moduleFileExtensions: ['js', 'json']
} 