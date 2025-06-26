/**
 * @file jest.simple.config.js
 * @description 简化的Jest配置 - 无外部依赖
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

module.exports = {
  displayName: 'ZK-Agent Simple Tests',
  testEnvironment: 'node',
  rootDir: '../',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx}',
    '<rootDir>/__tests__/**/*.spec.{js,jsx}',
    '<rootDir>/tests/**/*.test.{js,jsx}',
    '<rootDir>/tests/**/*.spec.{js,jsx}'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/__tests__/mocks/',
    '/__tests__/fixtures/',
    // 暂时忽略人脸增强相关测试
    '/face-enhancement/',
    '/人脸增强/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1'
  },
  
  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*.{js,jsx}',
    'config/**/*.{js,jsx}',
    'scripts/**/*.{js,jsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    // 排除人脸增强相关文件
    '!**/face-enhancement/**',
    '!**/人脸增强/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'json'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage/simple',
  
  // 测试超时时间
  testTimeout: 10000,
  
  // 并发测试数量
  maxWorkers: 1,
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: false,
  
  // 清除模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 自定义报告器
  reporters: [
    'default'
  ],
  
  // 测试结果处理器 - 暂时禁用
  // testResultsProcessor: '<rootDir>/__tests__/utils/testResultsProcessor.js',
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup/simple.setup.js']
}; 