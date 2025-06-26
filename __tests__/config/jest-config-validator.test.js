/**
 * Jest 配置验证器测试
 * 测试增强的错误处理和验证机制
 */

const {
  validateJestConfig,
  validateTestEnvironment,
  safeRequire,
  createSafePolyfills,
  applySafePolyfills
} = require('./jest-config-validator');

describe('Jest 配置验证器', () => {
  let originalEnv;
  let originalConsole;

  beforeEach(() => {
    // 保存原始环境
    originalEnv = { ...process.env };
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };
    
    // Mock console 方法
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // 恢复原始环境
    process.env = originalEnv;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe('validateJestConfig', () => {
    it('应该成功验证有效的 Jest 配置', () => {
      const result = validateJestConfig();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });

    it('应该检测到缺失的 Jest 配置', () => {
      // Mock jest 对象不存在的情况
      const originalJest = global.jest;
      delete global.jest;
      
      expect(() => validateJestConfig()).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to require E:\\zk-agent\\jest.config.fixed.js:',
        expect.any(String)
      );
      
      // 恢复 jest 对象
      global.jest = originalJest;
    });
  });

  describe('validateTestEnvironment', () => {
    it('应该验证测试环境配置', () => {
      process.env.NODE_ENV = 'test';
      
      const result = validateTestEnvironment();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
    });

    it('应该警告非测试环境', () => {
      process.env.NODE_ENV = 'development';
      
      const result = validateTestEnvironment();
      expect(result.warnings).toContain('NODE_ENV is not set to "test"');
    });
  });

  describe('safeRequire', () => {
    it('应该成功加载存在的模块', () => {
      const result = safeRequire('path');
      expect(result).toBeDefined();
      expect(typeof result.join).toBe('function');
    });

    it('应该处理不存在的模块', () => {
      const result = safeRequire('non-existent-module');
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to require non-existent-module:',
        expect.stringContaining('Cannot find module')
      );
    });

    it('应该使用自定义回退值', () => {
      const fallback = { custom: 'fallback' };
      const result = safeRequire('non-existent-module', fallback);
      expect(result).toBe(fallback);
    });
  });

  describe('createSafePolyfills', () => {
    it('should create necessary polyfills', () => {
      const polyfills = createSafePolyfills();
      
      expect(polyfills).toHaveProperty('TextEncoder');
      expect(polyfills).toHaveProperty('TextDecoder');
      expect(typeof polyfills.TextEncoder).toBe('function');
      expect(typeof polyfills.TextDecoder).toBe('function');
    });

    it('should create working TextEncoder polyfill', () => {
      const polyfills = createSafePolyfills();
      expect(() => new polyfills.TextEncoder()).not.toThrow();
    });

    it('should create working TextDecoder polyfill', () => {
      const polyfills = createSafePolyfills();
      expect(() => new polyfills.TextDecoder()).not.toThrow();
    });
  });

  describe('applySafePolyfills', () => {
    it('should apply polyfills safely', () => {
      const polyfills = createSafePolyfills();
      
      expect(polyfills).toHaveProperty('TextEncoder');
      expect(polyfills).toHaveProperty('TextDecoder');
      
      expect(() => applySafePolyfills(polyfills)).not.toThrow();
    });

    it('should not override existing polyfills', () => {
      const originalTextEncoder = global.TextEncoder;
      
      const polyfills = createSafePolyfills();
      applySafePolyfills(polyfills);
      
      expect(global.TextEncoder).toBe(originalTextEncoder);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('already exists, skipping polyfill')
      );
    });

    it('应该处理应用 polyfills 时的错误', () => {
      const invalidPolyfills = {
        get TextEncoder() {
          throw new Error('Test error');
        }
      };
      
      expect(() => applySafePolyfills(invalidPolyfills)).not.toThrow();
      expect(console.error).toHaveBeenCalledWith(
        '应用 polyfills 时发生错误:',
        'Test error'
      );
    });
  });

  describe('集成测试', () => {
    it('应该完整地验证和设置测试环境', () => {
      process.env.NODE_ENV = 'test';
      
      // 运行完整的验证流程
      expect(() => {
        validateJestConfig();
        validateTestEnvironment();
        const polyfills = createSafePolyfills();
        applySafePolyfills(polyfills);
      }).not.toThrow();
      
      // 验证所有组件都正常工作
      expect(global.TextEncoder).toBeDefined();
      expect(global.TextDecoder).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Jest 配置验证通过')
      );
    });
  });
});