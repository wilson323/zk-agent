/**
 * @file jest.config.simple.js
 * @description 简化的Jest配置 - 用于基础测试，避免复杂依赖
 * @author 修复团队
 * @lastUpdate 2024-12-19
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  // 使用修复后的setup文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.fixed.js'],
  
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 只测试基础文件，避免复杂的测试
  testMatch: [
    '**/__tests__/basic/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/__tests__/unit/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/__tests__/components/**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  // 忽略复杂的测试路径
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/.git/',
    '<rootDir>/public/',
    '<rootDir>/prisma/migrations/',
    '<rootDir>/__tests__/performance/',
    '<rootDir>/__tests__/integration/',
    '<rootDir>/__tests__/e2e/',
    '<rootDir>/__tests__/database/',
    '<rootDir>/__tests__/security/',
    '<rootDir>/tests/',
  ],
  
  // 关闭覆盖率收集
  collectCoverage: false,
  
  // 模块名映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    // CSS和静态资源映射
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // 转换配置
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // 转换忽略模式
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\\.mjs$|@testing-library))',
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 测试超时
  testTimeout: 10000,
  
  // 最大工作进程数
  maxWorkers: 1, // 单进程，避免并发问题
  
  // 详细输出
  verbose: true,
  
  // 静默模式
  silent: false,
  
  // 错误时停止
  bail: true, // 遇到错误立即停止
  
  // 强制退出
  forceExit: true,
  
  // 检测打开的句柄
  detectOpenHandles: false, // 关闭，避免复杂检测
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // 报告器
  reporters: ['default'],
  
  // 缓存目录
  cacheDirectory: '<rootDir>/.jest-cache-simple',
  
  // 错误时显示堆栈跟踪
  errorOnDeprecated: false,
};

module.exports = createJestConfig(customJestConfig);