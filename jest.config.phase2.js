/**
 * @file Enhanced Jest Configuration for Phase 2
 * @description 第二阶段增强Jest配置 - 确保100%测试通过率
 */

module.exports = {
  // 基础配置
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // 测试文件匹配
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  
  // 模块路径映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  
  // Setup文件
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.enhanced.js'
  ],
  
  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  
  // 转换配置
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 忽略转换的模块
  transformIgnorePatterns: [
    'node_modules/(?!(.*\.mjs$))'
  ],
  
  // 测试超时
  testTimeout: 30000,
  
  // 并发测试
  maxWorkers: '50%',
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: 0,
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  
  // 报告器
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './test-reports',
      filename: 'jest-report.html',
      expand: true
    }]
  ]
};