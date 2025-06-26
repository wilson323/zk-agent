// Jest setup for production testing
import '@testing-library/jest-dom'
import 'jest-extended'

// 全局测试配置
global.console = {
  ...console,
  // 在生产测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
}

// 模拟 Next.js 路由
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// 模拟 Next.js 导航
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// 模拟环境变量
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/zkagent_test'
process.env.REDIS_URL = 'redis://localhost:6380/1'
process.env.DISABLE_FACE_ENHANCEMENT = 'true'

// 模拟 Web APIs
Object.defineProperty(window, 'matchMedia', {
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
})

// 模拟 ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// 模拟 IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// 模拟 Canvas API
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
})

// 模拟 File API
global.File = class MockFile {
  constructor(parts, filename, properties) {
    this.parts = parts
    this.name = filename
    this.size = parts.reduce((acc, part) => acc + part.length, 0)
    this.type = properties?.type || ''
    this.lastModified = Date.now()
  }
}

global.FileReader = class MockFileReader {
  constructor() {
    this.readyState = 0
    this.result = null
    this.error = null
    this.onload = null
    this.onerror = null
    this.onabort = null
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2
      this.result = 'data:text/plain;base64,dGVzdA=='
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2
      this.result = 'test content'
      if (this.onload) this.onload({ target: this })
    }, 0)
  }
  
  abort() {
    this.readyState = 2
    if (this.onabort) this.onabort({ target: this })
  }
}

// 模拟 Fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
  })
)

// 模拟 WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}))

// 模拟 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// 模拟 URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// 模拟 crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockReturnValue(new Uint32Array(10)),
    randomUUID: jest.fn().mockReturnValue('mocked-uuid'),
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
})

// 模拟 performance API
global.performance = {
  ...global.performance,
  mark: jest.fn(),
  measure: jest.fn(),
  now: jest.fn(() => Date.now()),
}

// 设置测试超时
jest.setTimeout(30000)

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// 测试前清理
beforeEach(() => {
  // 清理所有模拟
  jest.clearAllMocks()
  
  // 重置 localStorage
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  
  // 重置 sessionStorage
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
  
  // 重置 fetch
  global.fetch.mockClear()
})

// 测试后清理
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers()
  
  // 清理事件监听器
  document.removeEventListener = jest.fn()
  window.removeEventListener = jest.fn()
})

// 全局测试工具函数
global.testUtils = {
  // 等待异步操作完成
  waitFor: (callback, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const check = () => {
        try {
          const result = callback()
          if (result) {
            resolve(result)
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'))
          } else {
            setTimeout(check, 100)
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error)
          } else {
            setTimeout(check, 100)
          }
        }
      }
      check()
    })
  },
  
  // 模拟延迟
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 创建模拟文件
  createMockFile: (name = 'test.txt', content = 'test content', type = 'text/plain') => {
    return new File([content], name, { type })
  },
  
  // 创建模拟图片文件
  createMockImageFile: (name = 'test.jpg', type = 'image/jpeg') => {
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'red'
    ctx.fillRect(0, 0, 100, 100)
    
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const file = new File([blob], name, { type })
        resolve(file)
      }, type)
    })
  }
}

// 自定义匹配器
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      }
    }
  },
  
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      }
    }
  },
  
  toHaveValidStructure(received, expectedStructure) {
    const hasStructure = (obj, structure) => {
      for (const key in structure) {
        if (!(key in obj)) return false
        if (typeof structure[key] === 'object' && structure[key] !== null) {
          if (!hasStructure(obj[key], structure[key])) return false
        }
      }
      return true
    }
    
    const pass = hasStructure(received, expectedStructure)
    
    if (pass) {
      return {
        message: () => `expected object not to have valid structure`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected object to have valid structure`,
        pass: false,
      }
    }
  }
})

console.log('🧪 Production test environment initialized')
console.log('📋 Face enhancement features disabled for testing')
console.log('🔧 All mocks and utilities loaded successfully') 