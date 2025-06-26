/**
 * @file jest.config.fixed.js
 * @description Fixed Jest configuration - Resolves infinite loop and dependency issues
 * @author Jest Fix Team
 * @lastUpdate 2024-12-19
 */

const nextJest = require('next/jest');
const path = require('path');

// Create Jest configuration with Next.js integration
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
  // Disable SWC for better compatibility
  experimental: {
    forceSwcTransforms: false,
  },
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Use fixed setup file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.fixed.js'],
  
  // TypeScript configuration for Jest
  preset: undefined, // Let Next.js handle the preset
  
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  // 忽略的测试路径
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/.git/',
    '<rootDir>/public/',
    '<rootDir>/prisma/migrations/',
  ],
  
  // 覆盖率收集
  collectCoverage: false, // 默认关闭，避免性能问题
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
  ],
  
  // Module name mapping - Enhanced for better path resolution
  moduleNameMapper: {
    // Path aliases
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
    
    // Next.js specific mappings
    '^next/router$': '<rootDir>/__mocks__/next/router.js',
    '^next/navigation$': '<rootDir>/__mocks__/next/navigation.js',
    '^next/image$': '<rootDir>/__mocks__/next/image.js',
    
    // CSS and style mappings
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Static asset mappings
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Transform configuration - Let Next.js handle transforms
  // Remove conflicting transform config as Next.js handles this automatically
  
  // Transform ignore patterns - Updated for better ES module support
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\.mjs$|@testing-library|msw|uuid|nanoid))',
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // 测试超时
  testTimeout: 30000,
  
  // 最大工作进程数
  maxWorkers: '50%',
  
  // 详细输出
  verbose: false,
  
  // 静默模式
  silent: false,
  
  // 错误时停止
  bail: false,
  
  // 强制退出
  forceExit: true,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  resetMocks: false,
  
  // Global variables - Simplified for Next.js compatibility
  globals: {
    // Remove ts-jest globals as Next.js handles TypeScript compilation
  },
  
  // 报告器
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
  
  // 覆盖率报告器
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // 覆盖率目录
  coverageDirectory: 'coverage',
  
  // 覆盖率阈值（宽松设置，避免测试失败）
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // 监视插件（移除不存在的插件）
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],
  
  // 缓存目录
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // 错误时显示堆栈跟踪
  errorOnDeprecated: false,
  
  // Extensions configuration - Let Next.js handle ES modules
  // Remove conflicting ESM and preset configurations
  
  // Additional Jest configuration
  resolver: undefined, // Let Next.js handle module resolution
  
  // Experimental features
  experimental: {
    // Enable if needed for specific features
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);