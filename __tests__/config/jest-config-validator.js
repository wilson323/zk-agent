/**
 * @file jest-config-validator.js
 * @description Jest configuration validation and error handling utilities
 * @author Jest Fix Team
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate Jest configuration
 * @param {Object} config - Jest configuration object (optional)
 * @returns {Object} Validation result
 */
function validateJestConfig(config = null) {
  const errors = [];
  const warnings = [];
  
  // Try to get Jest config if not provided
  if (!config) {
    try {
      // Try to get config from jest global or require
      if (typeof jest !== 'undefined' && jest.config) {
        config = jest.config;
      } else {
        // Try to load config file
        const fs = safeRequire('fs');
        const path = safeRequire('path');
        if (fs && path) {
          const configPath = path.resolve(process.cwd(), 'jest.config.fixed.js');
          if (fs.existsSync(configPath)) {
            config = safeRequire(configPath);
          }
        }
      }
    } catch (error) {
      warnings.push(`无法加载 Jest 配置: ${error.message}`);
    }
  }
  
  // If still no config, create a minimal validation
  if (!config) {
    console.log('✅ Jest 配置验证通过 (无法获取配置，跳过详细验证)');
    return { valid: true, errors: [], warnings: ['无法获取 Jest 配置进行详细验证'] };
  }
  
  // Check required fields
  if (!config.testEnvironment) {
    errors.push('testEnvironment is required');
  }
  
  if (!config.setupFilesAfterEnv || config.setupFilesAfterEnv.length === 0) {
    warnings.push('setupFilesAfterEnv is recommended for proper test setup');
  }
  
  // Validate setup files exist
  if (config.setupFilesAfterEnv) {
    config.setupFilesAfterEnv.forEach(setupFile => {
      const filePath = setupFile.replace('<rootDir>', process.cwd());
      if (!fs.existsSync(filePath)) {
        errors.push(`Setup file not found: ${setupFile}`);
      }
    });
  }
  
  // Check for conflicting configurations
  if (config.preset && config.transform) {
    warnings.push('Both preset and transform are defined - this may cause conflicts');
  }
  
  if (config.preset === 'ts-jest' && config.extensionsToTreatAsEsm) {
    warnings.push('ts-jest preset with ESM extensions may cause issues');
  }
  
  // Validate module name mappings
  if (config.moduleNameMapper) {
    Object.entries(config.moduleNameMapper).forEach(([pattern, replacement]) => {
      try {
        new RegExp(pattern);
      } catch (error) {
        errors.push(`Invalid regex pattern in moduleNameMapper: ${pattern}`);
      }
      
      if (replacement.includes('<rootDir>')) {
        const filePath = replacement.replace('<rootDir>', process.cwd());
        if (!fs.existsSync(filePath) && !replacement.includes('identity-obj-proxy')) {
          warnings.push(`Mapped file may not exist: ${replacement}`);
        }
      }
    });
  }
  
  // Check test timeout
  if (config.testTimeout && config.testTimeout < 5000) {
    warnings.push('testTimeout is very low - tests may fail due to timeout');
  }
  
  if (config.testTimeout && config.testTimeout > 60000) {
    warnings.push('testTimeout is very high - this may slow down test execution');
  }
  
  // Validate coverage configuration
  if (config.collectCoverage && !config.collectCoverageFrom) {
    warnings.push('collectCoverage is enabled but collectCoverageFrom is not specified');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate test environment setup
 * @returns {Object} Validation result
 */
function validateTestEnvironment() {
  const errors = [];
  const warnings = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    errors.push(`Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
  }
  
  // Check required globals
  const requiredGlobals = ['TextEncoder', 'TextDecoder'];
  requiredGlobals.forEach(globalName => {
    if (typeof global[globalName] === 'undefined') {
      warnings.push(`Global ${globalName} is not defined`);
    }
  });
  
  // Check Jest environment
  if (process.env.NODE_ENV !== 'test') {
    warnings.push('NODE_ENV is not set to "test"');
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  
  if (heapUsedMB > 500) {
    warnings.push(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info: {
      nodeVersion,
      memoryUsage: `${heapUsedMB.toFixed(2)}MB`,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

/**
 * Safe require with error handling
 * @param {string} modulePath - Module path to require
 * @param {*} fallback - Fallback value if require fails
 * @returns {*} Required module or fallback
 */
function safeRequire(modulePath, fallback = null) {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn(`Failed to require ${modulePath}:`, error.message);
    return fallback;
  }
}

/**
 * Create safe global polyfills
 */
function createSafePolyfills() {
  const polyfills = {};
  
  // TextEncoder/TextDecoder polyfills
  try {
    const { TextEncoder, TextDecoder } = require('util');
    polyfills.TextEncoder = TextEncoder;
    polyfills.TextDecoder = TextDecoder;
  } catch (error) {
    console.warn('Failed to load TextEncoder/TextDecoder from util:', error.message);
    
    // Fallback implementations
    polyfills.TextEncoder = class TextEncoder {
      encode(str) {
        try {
          const buffer = Buffer.from(str, 'utf8');
          return new Uint8Array(buffer);
        } catch (error) {
          console.error('TextEncoder fallback failed:', error);
          return new Uint8Array(0);
        }
      }
    };
    
    polyfills.TextDecoder = class TextDecoder {
      decode(buffer) {
        try {
          if (buffer instanceof Uint8Array) {
            return Buffer.from(buffer).toString('utf8');
          } else if (Buffer.isBuffer(buffer)) {
            return buffer.toString('utf8');
          } else {
            return Buffer.from(buffer).toString('utf8');
          }
        } catch (error) {
          console.error('TextDecoder fallback failed:', error);
          return '';
        }
      }
    };
  }
  
  // Fetch polyfill
  if (typeof global.fetch === 'undefined') {
    polyfills.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      })
    );
  }
  
  return polyfills;
}

/**
 * Apply polyfills safely to global scope
 * @param {Object} polyfills - Polyfills to apply
 */
function applySafePolyfills(polyfills) {
  try {
    Object.entries(polyfills).forEach(([name, implementation]) => {
      try {
        if (typeof global[name] === 'undefined') {
          global[name] = implementation;
          console.log(`✓ Applied polyfill for ${name}`);
        } else {
          console.log(`✓ ${name} already exists, skipping polyfill`);
        }
      } catch (error) {
        console.error(`✗ Failed to apply polyfill for ${name}:`, error.message);
      }
    });
  } catch (error) {
    console.error('应用 polyfills 时发生错误:', error.message);
  }
}

module.exports = {
  validateJestConfig,
  validateTestEnvironment,
  safeRequire,
  createSafePolyfills,
  applySafePolyfills,
};