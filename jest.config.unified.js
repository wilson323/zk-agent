/**
 * @file Jest Unified Test Configuration
 * @description Consolidated and comprehensive Jest configuration for ZK-Agent.
 *              Supports various test suites (unit, integration, security, performance, e2e, chat)
 *              and dynamic configuration based on environment variables and suite selection.
 * @author ZK-Agent Team
 * @date 2025-06-29
 */

const nextJest = require('next/jest');
const path = require('path');

const createJestConfig = nextJest({
  dir: './',
});

// Common module name mappings
const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/$1',
  '^@/components/(.*)$': '<rootDir>/components/$1',
  '^@/lib/(.*)$': '<rootDir>/lib/$1',
  '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
  '^@/app/(.*)$': '<rootDir>/app/$1',
  '^@/types/(.*)$': '<rootDir>/types/$1',
  '^@/utils/(.*)$': '<rootDir>/lib/utils/$1',
  '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
  '^@/config/(.*)$': '<rootDir>/config/$1',
  '^@/prisma/(.*)$': '<rootDir>/prisma/$1',
  '\.(css|less|scss|sass)$': 'identity-obj-proxy',
  '\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  '^next/router$': '<rootDir>/__mocks__/next/router.js',
  '^next/navigation$': '<rootDir>/__mocks__/next/navigation.js',
  '^next/image$': '<rootDir>/__mocks__/next/image.js',
};

// Common test path ignore patterns
const testPathIgnorePatterns = [
  '<rootDir>/.next/',
  '<rootDir>/node_modules/',
  '<rootDir>/coverage/',
  '<rootDir>/dist/',
  '<rootDir>/build/',
  '<rootDir>/.git/',
  '<rootDir>/public/',
  '<rootDir>/prisma/migrations/',
  '<rootDir>/__tests__/mocks/',
  '<rootDir>/__tests__/fixtures/',
  '<rootDir>/__tests__/utils/',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!**/.next/**',
  '!**/coverage/**',
  '!**/*.config.{js,ts}',
  '!**/jest.setup.js',
  '!**/migrations/**',
  '!**/seeds/**',
  // Exclude specific features if not part of the current test suite
  // These will be dynamically added/removed based on the suite
  '/face-enhancement/',
  '/人脸增强/',
  '/poster/',
  '/cad/',
];

// Common collect coverage from patterns
const collectCoverageFrom = [
  'app/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'contexts/**/*.{js,jsx,ts,tsx}',
  'types/**/*.{js,jsx,ts,tsx}',
];

// Base Jest configuration
const baseConfig = {
  testEnvironment: 'node', // Default, can be overridden by suite
  setupFilesAfterEnv: ['<rootDir>/jest.setup.unified.js'], // Unified setup file
  moduleNameMapper: moduleNameMapper,
  testPathIgnorePatterns: testPathIgnorePatterns,
  collectCoverageFrom: collectCoverageFrom,
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'cobertura',
    'clover',
  ],
  coverageDirectory: '<rootDir>/coverage', // Default, can be overridden by suite
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results/',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
    // Add custom reporter if needed, ensure it exists
    // ['<rootDir>/__tests__/utils/customReporter.js', {
    //   outputFile: './test-results/custom-report.json',
    // }],
  ],
  maxWorkers: '50%',
  verbose: true,
  detectLeaks: true,
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  testTimeout: 30000, // Default timeout
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  errorOnDeprecated: false,
  transformIgnorePatterns: [
    '/node_modules/(?!(.*\.mjs$|@testing-library|msw|uuid|nanoid))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json',
      isolatedModules: true,
    },
  },
  // Experimental features from fixed config
  experimental: {
    forceSwcTransforms: false,
  },
};

// Specific configurations for different test suites
const testSuites = {
  // Default / Unit Test Configuration
  unit: {
    displayName: 'Unit Tests',
    testEnvironment: 'jsdom', // Often preferred for unit tests of UI components
    testMatch: [
      '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/unit/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/basic/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/components/**/*.{js,jsx,ts,tsx}',
    ],
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
  },

  // Comprehensive Test Configuration (similar to jest.config.comprehensive.js)
  comprehensive: {
    displayName: 'Comprehensive Tests',
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/unit/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/integration/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/security/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/performance/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/e2e/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/api/**/*.test.{js,jsx,ts,tsx}',
    ],
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 75,
        lines: 80,
        statements: 80,
      },
      'lib/auth/**/*.{js,ts}': {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      'lib/security/**/*.{js,ts}': {
        branches: 85,
        functions: 90,
        lines: 90,
        statements: 90,
      },
      'lib/utils/error-handler.ts': {
        branches: 90,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
    testResultsProcessor: '<rootDir>/__tests__/utils/testResultsProcessor.js',
    globalSetup: '<rootDir>/__tests__/setup/global-setup.js', // Ensure these paths are correct
    globalTeardown: '<rootDir>/__tests__/setup/global-teardown.js', // Ensure these paths are correct
  },

  // Enhanced Test Configuration (similar to jest.config.enhanced.js)
  enhanced: {
    displayName: 'Enhanced Tests',
    testEnvironment: 'jest-environment-jsdom',
    testMatch: [
      '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
      '**/*.(test|spec).(ts|tsx|js|jsx)',
      '**/__tests__/integration/**/*.(test|spec).(ts|tsx)',
      '**/__tests__/e2e/**/*.(test|spec).(ts|tsx)',
      '**/__tests__/security/**/*.(test|spec).(ts|tsx)',
      '**/__tests__/performance/**/*.(test|spec).(ts|tsx)',
    ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
      'lib/database/': { branches: 90, functions: 90, lines: 90, statements: 90 },
      'lib/ai/': { branches: 85, functions: 85, lines: 85, statements: 85 },
      'app/api/': { branches: 80, functions: 80, lines: 80, statements: 80 },
      'lib/services/': { branches: 85, functions: 85, lines: 85, statements: 85 },
      'lib/cache/': { branches: 80, functions: 80, lines: 80, statements: 80 },
      'lib/storage/': { branches: 75, functions: 75, lines: 75, statements: 75 },
    },
    setupFiles: ['<rootDir>/jest.env.js'],
    maxWorkers: '75%',
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
    snapshotSerializers: ['enzyme-to-json/serializer'],
    watchPlugins: [
      'jest-watch-typeahead/filename',
      'jest-watch-typeahead/testname',
    ],
    forceCoverageMatch: [
      '**/lib/**/*.ts',
      '**/app/api/**/*.ts',
      '**/components/**/*.tsx',
    ],
    maxConcurrency: 10,
  },

  // Production Test Configuration (similar to jest.config.production.js)
  production: {
    displayName: 'Production Tests',
    testEnvironment: 'jest-environment-jsdom',
    testMatch: [
      '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
      '<rootDir>/__tests__/**/*.spec.{js,jsx,ts,tsx}',
      '<rootDir>/app/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/components/**/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/lib/**/__tests__/**/*.{js,jsx,ts,tsx}'
    ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      },
      './lib/auth/**/*.{js,jsx,ts,tsx}': { branches: 90, functions: 90, lines: 90, statements: 90 },
      './lib/security/**/*.{js,jsx,ts,tsx}': { branches: 95, functions: 95, lines: 95, statements: 95 },
      './lib/database/**/*.{js,jsx,ts,tsx}': { branches: 85, functions: 85, lines: 85, statements: 85 }
    },
    coverageDirectory: '<rootDir>/coverage/production',
    testEnvironmentOptions: {
      url: 'http://localhost:3000'
    },
    watchPathIgnorePatterns: [
      '<rootDir>/node_modules/',
      '<rootDir>/.next/',
      '<rootDir>/coverage/',
      '<rootDir>/logs/',
      '<rootDir>/uploads/'
    ],
    // customReporter needs to be verified if it exists and is needed
    // reporters: [
    //   'default',
    //   ['<rootDir>/__tests__/utils/customReporter.js', {
    //     outputPath: './test-reports/unified-test-log.json',
    //     includeConsoleOutput: true
    //   }]
    // ],
    testResultsProcessor: '<rootDir>/__tests__/utils/testResultsProcessor.js'
  },

  // Chat Test Configuration (similar to config/jest.chat.config.js)
  chat: {
    displayName: 'Chat Tests',
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/__tests__/lib/chat/**/*.test.{js,ts}',
      '<rootDir>/__tests__/components/chat/**/*.test.{js,ts}',
      '<rootDir>/__tests__/api/chat/**/*.test.{js,ts}',
      '<rootDir>/__tests__/integration/chat/**/*.test.{js,ts}'
    ],
    testPathIgnorePatterns: [
      ...testPathIgnorePatterns,
      // Exclude non-chat features
      '<rootDir>/__tests__/**/face-enhancement/**',
      '<rootDir>/__tests__/**/poster/**',
      '<rootDir>/__tests__/**/cad/**'
    ],
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
    coverageThreshold: {
      global: { branches: 100, functions: 100, lines: 100, statements: 100 },
      './lib/chat/**/*.{js,ts}': { branches: 100, functions: 100, lines: 100, statements: 100 },
      './app/api/ag-ui/chat/**/*.{js,ts}': { branches: 100, functions: 100, lines: 100, statements: 100 },
      './components/chat/**/*.{js,ts,tsx}': { branches: 100, functions: 100, lines: 100, statements: 100 }
    },
    coverageDirectory: '<rootDir>/coverage/chat',
    maxWorkers: 2,
  },

  // Simple Test Configuration (similar to jest.config.simple.js and config/jest.simple.config.js)
  simple: {
    displayName: 'Simple Tests',
    testEnvironment: 'jsdom',
    testMatch: [
      '**/__tests__/basic/**/*.(test|spec).(js|jsx|ts|tsx)',
      '**/__tests__/unit/**/*.(test|spec).(js|jsx|ts|tsx)',
      '**/__tests__/components/**/*.(test|spec).(js|jsx|ts|tsx)',
    ],
    testPathIgnorePatterns: [
      ...testPathIgnorePatterns,
      '<rootDir>/__tests__/performance/',
      '<rootDir>/__tests__/integration/',
      '<rootDir>/__tests__/e2e/',
      '<rootDir>/__tests__/database/',
      '<rootDir>/__tests__/security/',
      '<rootDir>/tests/',
    ],
    collectCoverage: false, // Explicitly turn off for simple tests
    maxWorkers: 1,
    bail: true, // Stop on first failure
    detectOpenHandles: false,
    reporters: ['default'],
    cacheDirectory: '<rootDir>/.jest-cache-simple',
  },
};

// Export a function to allow dynamic selection of test suite
module.exports = function createUnifiedJestConfig(suite = 'unit') {
  const selectedSuiteConfig = testSuites[suite] || testSuites.unit;

  // Merge base config with selected suite config
  let finalConfig = {
    ...baseConfig,
    ...selectedSuiteConfig,
  };

  // Apply environment variable overrides
  if (process.env.CI) {
    finalConfig.maxWorkers = 2;
    finalConfig.verbose = false;
    finalConfig.collectCoverage = true;
  }

  if (process.env.NODE_ENV === 'production') {
    finalConfig.testPathIgnorePatterns.push('<rootDir>/__tests__/**/dev/**');
  }

  if (process.env.TEST_TIMEOUT) {
    finalConfig.testTimeout = parseInt(process.env.TEST_TIMEOUT);
  }

  if (process.env.SKIP_COVERAGE === 'true') {
    delete finalConfig.collectCoverageFrom;
    delete finalConfig.coverageThreshold;
    finalConfig.collectCoverage = false;
  }

  // Handle specific setup files for each suite if needed, otherwise use unified
  if (selectedSuiteConfig.setupFilesAfterEnv) {
    finalConfig.setupFilesAfterEnv = selectedSuiteConfig.setupFilesAfterEnv;
  } else {
    finalConfig.setupFilesAfterEnv = ['<rootDir>/jest.setup.unified.js'];
  }

  // Handle custom reporters for each suite if needed
  if (selectedSuiteConfig.reporters) {
    finalConfig.reporters = selectedSuiteConfig.reporters;
  }

  // Handle global setup/teardown for comprehensive suite
  if (suite === 'comprehensive') {
    finalConfig.globalSetup = selectedSuiteConfig.globalSetup;
    finalConfig.globalTeardown = selectedSuiteConfig.globalTeardown;
  } else {
    delete finalConfig.globalSetup;
    delete finalConfig.globalTeardown;
  }

  // Transform configuration - Next.js handles this, but ensure ts-jest is configured
  finalConfig.transform = {
    '^.+\.(ts|tsx)$': ['ts-jest', {
      tsconfig: finalConfig.globals['ts-jest'].tsconfig,
      isolatedModules: finalConfig.globals['ts-jest'].isolatedModules,
    }],
    '^.+\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
  };

  return createJestConfig(finalConfig);
};

// If directly run, return default 'unit' configuration
if (require.main === module) {
  const suite = process.env.TEST_SUITE || 'unit';
  module.exports = module.exports(suite);
}
