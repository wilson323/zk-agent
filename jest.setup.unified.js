/**
 * @file jest.setup.unified.js
 * @description Unified Jest setup file for ZK-Agent.
 *              Consolidates common setup logic, mocks, and utilities from various setup files.
 * @author ZK-Agent Team
 * @date 2025-06-29
 */

// Load test environment variables from .env.test file if it exists
require('dotenv').config({ path: '.env.test' });

// Import required modules
require('@testing-library/jest-dom');
require('jest-extended'); // For extended matchers

// Polyfills for TextEncoder/TextDecoder in JSDOM environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Fix EventEmitter memory leak warnings
require('events').EventEmitter.defaultMaxListeners = 20;

// Mock process.exit to prevent Jest from exiting prematurely
const originalExit = process.exit;
process.exit = jest.fn((code) => {
  if (process.env.NODE_ENV === 'test') {
    console.warn(`process.exit(${code}) called in test environment - mocked`);
    return;
  }
  return originalExit(code);
});

// --- Environment Variables ---
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/zkagent_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-purposes-only-32-chars-minimum';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret-key-for-testing-purposes-only-32-chars-minimum';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// AI Service Mock Configuration
process.env.FASTGPT_BASE_URL = process.env.FASTGPT_BASE_URL || 'https://api.fastgpt.test';
process.env.FASTGPT_API_KEY = process.env.FASTGPT_API_KEY || 'test-fastgpt-key';
process.env.FASTGPT_APP_ID = process.env.FASTGPT_APP_ID || 'test-app-id';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'test-siliconflow-key';
process.env.QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope.test.com';
process.env.QWEN_API_KEY = process.env.QWEN_API_KEY || 'test-qwen-key';

// Enable Mock Data (if needed for specific tests)
process.env.ENABLE_MOCKS = 'true';
process.env.DISABLE_FACE_ENHANCEMENT = 'true'; // From production setup

// --- Global Mocks ---

// Console Mock
global.console = {
  ...console,
  log: jest.fn((...args) => {
    if (process.env.JEST_VERBOSE === 'true') { // From chat.setup.js
      console.log(...args);
    }
  }),
  debug: jest.fn(),
  info: jest.fn((...args) => {
    if (process.env.JEST_VERBOSE === 'true') { // From chat.setup.js
      console.info(...args);
    }
  }),
  warn: jest.fn((...args) => { // Keep original warn for now, or make it verbose
    if (process.env.JEST_VERBOSE === 'true') {
      console.warn(...args);
    }
  }),
  error: jest.fn((...args) => { // Keep original error for now, or make it verbose
    console.error(...args);
  }),
};

// Fetch API Mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()), // From production setup
  })
);

// localStorage Mock
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// sessionStorage Mock
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock });

// WebSocket Mock (from chat.setup.js and production.js)
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// EventSource Mock (from chat.setup.js)
global.EventSource = jest.fn(() => ({
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
}));

// window.matchMedia Mock
Object.defineProperty(global, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// IntersectionObserver Mock
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// ResizeObserver Mock
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Crypto Mock
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: { // From production setup
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

// URL.createObjectURL Mock (from production setup)
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Performance API Mock (from production setup)
global.performance = {
  ...global.performance,
  mark: jest.fn(),
  measure: jest.fn(),
  now: jest.fn(() => Date.now()),
};

// File API Mock (from production setup)
global.File = class MockFile {
  constructor(parts, filename, properties) {
    this.parts = parts;
    this.name = filename;
    this.size = parts.reduce((acc, part) => acc + part.length, 0);
    this.type = properties?.type || '';
    this.lastModified = Date.now();
  }
};

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:text/plain;base64,dGVzdA==';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'test content';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
  
  abort() {
    this.readyState = 2;
    if (this.onabort) this.onabort({ target: this });
  }
};

// Canvas API Mock (from production setup)
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Array(4).fill(0),
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  });
}


// --- Next.js Mocks ---

// Mock Next.js router (combined from multiple setups)
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false, // From production setup
  }),
}));

// Mock Next.js navigation (combined from multiple setups)
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(), // From production setup
  }),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));


// --- Prisma Mock ---
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    agentConfig: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    posterTask: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    errorLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    usageStats: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  })),
  Prisma: {
    TransactionIsolationLevel: {
      ReadCommitted: 'ReadCommitted',
      ReadUncommitted: 'ReadUncommitted',
      RepeatableRead: 'RepeatableRead',
      Serializable: 'Serializable',
    },
  },
}));

// --- File System Mock ---
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  access: jest.fn(),
}));


// --- Global Test Utilities ---
global.testUtils = {
  // Create Mock User
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create Mock Agent
  createMockAgent: (overrides = {}) => ({
    id: 'test-agent-id',
    name: 'Test Agent',
    description: 'Test agent description',
    systemPrompt: 'You are a test agent',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    isPublic: true,
    createdBy: 'test-user-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create Mock Chat Session
  createMockChatSession: (overrides = {}) => ({
    id: 'test-session-id',
    title: 'Test Chat Session',
    userId: 'test-user-id',
    agentId: 'test-agent-id',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  // Create Mock API Response
  createMockApiResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Map(),
  }),

  // Wait for async operation
  waitFor: (callback, timeout = 5000) => { // Combined from production and fixed
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        try {
          const result = callback();
          if (result) {
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(check, 100);
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(check, 100);
          }
        }
      };
      check();
    });
  },

  // Simulate network delay
  simulateNetworkDelay: (min = 100, max = 500) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  // Create Mock Security Event
  createMockSecurityEvent: () => ({
    id: 'test-event-123',
    type: 'login_success',
    severity: 'low',
    timestamp: new Date(),
    ip: '192.168.1.100',
    userId: 'test-user-123',
    details: {},
    riskScore: 1,
    resolved: false,
  }),
  
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)), // From fixed
  
  // Create Mock File (from production setup)
  createMockFile: (name = 'test.txt', content = 'test content', type = 'text/plain') => {
    return new File([content], name, { type });
  },
  
  // Create Mock Image File (from production setup)
  createMockImageFile: (name = 'test.jpg', type = 'image/jpeg') => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const file = new File([blob], name, { type });
        resolve(file);
      }, type);
    });
  }
};

// --- Performance Test Utilities ---
global.performanceUtils = {
  // Measure function execution time
  measureTime: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start,
    };
  },

  // Memory usage test
  measureMemory: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
      };
    }
    return null;
  },
};

// --- Custom Jest Matchers ---
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toHaveValidStructure(received, expectedStructure) {
    const hasStructure = (obj, structure) => {
      for (const key in structure) {
        if (!(key in obj)) return false;
        if (typeof structure[key] === 'object' && structure[key] !== null) {
          if (!hasStructure(obj[key], structure[key])) return false;
        }
      }
      return true;
    };
    
    const pass = hasStructure(received, expectedStructure);
    
    if (pass) {
      return {
        message: () => `expected object not to have valid structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected object to have valid structure`,
        pass: false,
      };
    }
  }
});

// --- Jest Hooks and Error Handling ---

// Set global test timeout
jest.setTimeout(30000);

// Global error handling for unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Override console.error to ignore specific warnings (from enhanced and fixed)
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is deprecated') ||
     message.includes('Warning: componentWillReceiveProps has been renamed'))
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Before each test: clear all mocks and reset localStorage/sessionStorage
beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks(); // Ensure mocks are restored
  jest.clearAllTimers();
  jest.useRealTimers(); // Ensure real timers are used by default

  // Reset localStorage and sessionStorage mocks
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();

  // Reset fetch mock
  if (global.fetch.mockClear) {
    global.fetch.mockClear();
  }
});

// After each test: clean up timers and event listeners
afterEach(() => {
  jest.clearAllTimers();
  // Clean up event listeners if they were mocked
  if (document.removeEventListener) document.removeEventListener = jest.fn();
  if (window.removeEventListener) window.removeEventListener = jest.fn();
});

console.log('✅ Unified Jest setup completed.');