const nextJest = require('next/jest')({
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  displayName: 'ZK-Agent Production Tests',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.production.js'],
  testEnvironment: 'jest-environment-jsdom',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.spec.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/components/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/lib/**/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/mocks/',
    '<rootDir>/__tests__/fixtures/',
    '<rootDir>/__tests__/utils/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    // 合并路径映射
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 
      '<rootDir>/__tests__/mocks/fileMock.js',
    // 保持Next.js的路径映射
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1'
  },
  
  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'contexts/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/__tests__/**',
    '!**/test-utils/**',
    // 排除人脸增强相关文件
    '!**/face-enhancement/**',
    '!**/人脸增强/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // 核心模块要求更高覆盖率
    './lib/auth/**/*.{js,jsx,ts,tsx}': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './lib/security/**/*.{js,jsx,ts,tsx}': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './lib/database/**/*.{js,jsx,ts,tsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'clover'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: '<rootDir>/coverage/production',
  
  // 测试环境变量
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // 测试超时时间
  testTimeout: 30000,
  
  // 并发测试数量
  maxWorkers: '50%',
  
  // 详细输出
  verbose: true,
  
  // 错误时停止
  bail: false,
  
  // 清除模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 监听模式配置
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
    '<rootDir>/logs/',
    '<rootDir>/uploads/'
  ],
  
  // 自定义报告器
  reporters: [
    'default',
    ['<rootDir>/__tests__/utils/customReporter.js', {
      outputPath: './test-reports/unified-test-log.json',
      includeConsoleOutput: true
    }]
  ],
  
  // 测试结果处理器
  testResultsProcessor: '<rootDir>/__tests__/utils/testResultsProcessor.js'
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = nextJest(customJestConfig)