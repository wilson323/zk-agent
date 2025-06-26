/**
 * Jest配置 - 智能对话功能专用
 * 确保智能对话功能百分之百通过测试
 */

module.exports = {
  displayName: 'ZK-Agent Chat Tests',
  rootDir: '../',
  
  // 测试环境
  testEnvironment: 'node',
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/chat.setup.js'],
  
  // 专门测试智能对话相关文件
  testMatch: [
    '<rootDir>/__tests__/lib/chat/**/*.test.{js,ts}',
    '<rootDir>/__tests__/components/chat/**/*.test.{js,ts}',
    '<rootDir>/__tests__/api/chat/**/*.test.{js,ts}',
    '<rootDir>/__tests__/integration/chat/**/*.test.{js,ts}'
  ],
  
  // 忽略的文件
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/mocks/',
    '<rootDir>/__tests__/fixtures/',
    // 排除非智能对话功能
    '<rootDir>/__tests__/**/face-enhancement/**',
    '<rootDir>/__tests__/**/poster/**',
    '<rootDir>/__tests__/**/cad/**'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1'
  },
  
  // 覆盖率配置 - 专注智能对话
  collectCoverage: true,
  collectCoverageFrom: [
    'app/api/ag-ui/chat/**/*.{js,ts}',
    'app/api/fastgpt/**/*.{js,ts}',
    'components/chat/**/*.{js,ts,tsx}',
    'lib/chat/**/*.{js,ts}',
    'lib/ai/**/*.{js,ts}',
    'lib/utils/fastgpt-utils.ts',
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
    },
    // 核心智能对话模块
    './lib/chat/**/*.{js,ts}': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './app/api/ag-ui/chat/**/*.{js,ts}': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    './components/chat/**/*.{js,ts,tsx}': {
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
    'lcov',
    'json'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage/chat',
  
  // 测试超时
  testTimeout: 15000,
  
  // 并发控制
  maxWorkers: 2,
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: true,
  
  // 清除模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }]
  },
  
  // 全局变量
  globals: {
    'ts-jest': {
      useESM: false
    }
  }
} 