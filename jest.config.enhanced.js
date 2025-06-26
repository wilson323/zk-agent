/**
 * @file jest.config.enhanced.js
 * @description 增强Jest配置 - 100%测试覆盖率目标
 * @author B团队测试架构师
 * @lastUpdate 2024-12-19
 * @goals 测试通过率100%，覆盖率99%+
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  // 基础配置
  setupFilesAfterEnv: ['<rootDir>/jest.setup.enhanced.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // 测试文件匹配模式 - 扩展覆盖范围
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/__tests__/integration/**/*.(test|spec).(ts|tsx)',
    '**/__tests__/e2e/**/*.(test|spec).(ts|tsx)',
    '**/__tests__/security/**/*.(test|spec).(ts|tsx)',
    '**/__tests__/performance/**/*.(test|spec).(ts|tsx)',
  ],
  
  // 覆盖率配置 - 目标80%+ (核查报告要求)
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'types/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js',
    '!**/migrations/**',
    '!**/seeds/**',
  ],
  
  // 覆盖率阈值 - 严格要求（核查报告要求80%）
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // 核心模块要求更高
    'lib/database/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'lib/ai/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'app/api/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'lib/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'lib/cache/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'lib/storage/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  
  // 覆盖率报告
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover',
    'cobertura',
  ],
  
  // 模块映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/utils/(.*)$': '<rootDir>/lib/utils/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
  },
  
  // 测试环境变量
  setupFiles: ['<rootDir>/jest.env.js'],
  
  // 性能优化
  maxWorkers: '75%', // 增加并行度
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // 测试超时
  testTimeout: 30000,
  
  // 忽略模式
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
  ],
  
  // 转换配置 - 修复配置冲突
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
    '^.+\.(js|jsx)$': ['babel-jest', {
      presets: ['next/babel'],
    }],
  },
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 全局变量
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
    },
  },
  
  // 测试结果处理器
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'test-report.html',
      expand: true,
      openReport: false,
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
    ['jest-sonar', {
      outputDirectory: './coverage',
      outputName: 'sonar-report.xml',
    }],
  ],
  
  // 快照序列化器
  snapshotSerializers: ['enzyme-to-json/serializer'],
  
  // 监视模式配置
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // 错误处理
  errorOnDeprecated: true,
  verbose: true,
  
  // 测试结果缓存
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // 新增：测试覆盖率强制
  forceCoverageMatch: [
    '**/lib/**/*.ts',
    '**/app/api/**/*.ts',
    '**/components/**/*.tsx',
  ],
  
  // 新增：测试并发配置
  maxConcurrency: 10,
};

module.exports = createJestConfig(customJestConfig);