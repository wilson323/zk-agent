/**
 * 智能对话功能测试设置
 * 确保测试环境完全准备就绪
 */

// 环境变量设置
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://postgres:123456@localhost:5432/zkagent2'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-chat-testing'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// FastGPT测试配置
process.env.FASTGPT_BASE_URL = 'https://api.fastgpt.test'
process.env.FASTGPT_API_KEY = 'test-fastgpt-key'
process.env.FASTGPT_APP_ID = 'test-app-id'

// AI模型测试配置
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.SILICONFLOW_API_KEY = 'test-siliconflow-key'

// 全局测试工具
global.console = {
  ...console,
  // 在测试中保持日志输出
  log: jest.fn((...args) => {
    if (process.env.JEST_VERBOSE === 'true') {
      console.log(...args)
    }
  }),
  error: jest.fn((...args) => {
    console.error(...args)
  }),
  warn: jest.fn((...args) => {
    if (process.env.JEST_VERBOSE === 'true') {
      console.warn(...args)
    }
  }),
  info: jest.fn((...args) => {
    if (process.env.JEST_VERBOSE === 'true') {
      console.info(...args)
    }
  })
}

// 模拟localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// 模拟sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// 模拟fetch
global.fetch = jest.fn()

// 模拟WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1
}))

// 模拟EventSource (用于SSE)
global.EventSource = jest.fn(() => ({
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1
}))

// 测试超时设置
jest.setTimeout(15000)

// 每个测试前清理
beforeEach(() => {
  // 清理所有模拟
  jest.clearAllMocks()
  
  // 重置localStorage
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  
  // 重置sessionStorage
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
  
  // 重置fetch模拟
  if (global.fetch.mockClear) {
    global.fetch.mockClear()
  }
})

// 每个测试后清理
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers()
  
  // 清理所有模拟
  jest.restoreAllMocks()
})

// 全局错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

console.log('✅ 智能对话测试环境初始化完成') 