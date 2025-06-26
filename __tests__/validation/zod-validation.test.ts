// @ts-nocheck
/**
 * @file __tests__/validation/zod-validation.test.ts
 * @description Zod验证系统的完整测试套件
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 */

import { describe, it, expect } from '@jest/globals'
import {
  validateCADFile,
  validateChatMessage,
  validateAgentConfig,
  validateUserInput,
  CADFileSchema,
  ChatMessageSchema,
  AgentConfigSchema,
  UserInputSchema,
  CADAnalysisConfigSchema,
  ResponsiveConfigSchema,
  VALIDATION_LIMITS,
  createValidator,
  sanitizeAndValidate,
} from '@/lib/validation/schemas'

// 中间件测试暂时注释掉，避免环境依赖问题
// import {
//   withValidation,
//   validateRequest,
//   withSecurity,
//   combineMiddleware,
//   ValidationError,
// } from '@/lib/validation/middleware'

// import { NextRequest, NextResponse } from 'next/server'

// 测试数据工厂
const createMockFile = (overrides: Partial<any> = {}) => ({
  name: 'test.dwg',
  size: 1024 * 1024, // 1MB
  type: 'application/x-dwg',
  lastModified: Date.now(),
  ...overrides,
})

const createMockChatMessage = (overrides: Partial<any> = {}) => ({
  content: 'Hello, this is a test message',
  type: 'text',
  role: 'user',
  timestamp: new Date(),
  ...overrides,
})

const createMockAgentConfig = (overrides: Partial<any> = {}) => ({
  id: 'test-agent-001',
  name: 'Test Agent',
  description: 'A test agent for validation',
  type: 'fastgpt',
  capabilities: ['chat', 'analysis'],
  config: {},
  enabled: true,
  priority: 50,
  ...overrides,
})

const createMockUserInput = (overrides: Partial<any> = {}) => ({
  email: 'test@example.com',
  name: 'Test User',
  password: 'TestPass123',
  ...overrides,
})

describe('Zod验证系统测试', () => {
  describe('CAD文件验证', () => {
    it('应该验证有效的CAD文件', () => {
      const validFile = createMockFile()
      const result = validateCADFile(validFile)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('test.dwg')
        expect(result.data.size).toBe(1024 * 1024)
        expect(result.data.type).toBe('application/x-dwg')
      }
    })

    it('应该拒绝不支持的文件格式', () => {
      const invalidFile = createMockFile({
        name: 'test.txt',
        type: 'text/plain'
      })
      const result = validateCADFile(invalidFile)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('CAD文件验证失败')
        expect(result.error.issues).toHaveLength(2) // name和type都不符合
      }
    })

    it('应该拒绝过大的文件', () => {
      const largeFile = createMockFile({
        size: VALIDATION_LIMITS.MAX_FILE_SIZE + 1
      })
      const result = validateCADFile(largeFile)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('文件大小不能超过')
        )).toBe(true)
      }
    })

    it('应该拒绝空文件名', () => {
      const emptyNameFile = createMockFile({ name: '' })
      const result = validateCADFile(emptyNameFile)
      
      expect(result.success).toBe(false)
    })

    it('应该支持所有CAD文件格式', () => {
      const formats = [
        { name: 'test.dwg', type: 'application/x-dwg' },
        { name: 'test.dxf', type: 'application/x-dxf' },
        { name: 'test.step', type: 'application/step' },
        { name: 'test.iges', type: 'application/iges' },
        { name: 'test.stl', type: 'model/stl' },
        { name: 'test.obj', type: 'model/obj' },
        { name: 'test.gltf', type: 'model/gltf+json' },
        { name: 'test.glb', type: 'model/gltf-binary' },
      ]

      formats.forEach(format => {
        const file = createMockFile(format)
        const result = validateCADFile(file)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('聊天消息验证', () => {
    it('应该验证有效的聊天消息', () => {
      const validMessage = createMockChatMessage()
      const result = validateChatMessage(validMessage)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('Hello, this is a test message')
        expect(result.data.type).toBe('text')
        expect(result.data.role).toBe('user')
      }
    })

    it('应该拒绝空消息内容', () => {
      const emptyMessage = createMockChatMessage({ content: '' })
      const result = validateChatMessage(emptyMessage)
      
      expect(result.success).toBe(false)
    })

    it('应该拒绝过长的消息', () => {
      const longMessage = createMockChatMessage({
        content: 'a'.repeat(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH + 1)
      })
      const result = validateChatMessage(longMessage)
      
      expect(result.success).toBe(false)
    })

    it('应该检测潜在的XSS攻击', () => {
      const maliciousMessages = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        '<img onload="alert(\'xss\')" src="x">',
        '<div onerror="alert(\'xss\')">test</div>'
      ]

      maliciousMessages.forEach(content => {
        const maliciousMessage = createMockChatMessage({ content })
        const result = validateChatMessage(maliciousMessage)
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues.some(issue => 
            issue.message.includes('安全风险')
          )).toBe(true)
        }
      })
    })

    it('应该支持所有消息类型和角色', () => {
      const types = ['text', 'file', 'image', 'system']
      const roles = ['user', 'assistant', 'system', 'tool']

      types.forEach(type => {
        roles.forEach(role => {
          const message = createMockChatMessage({ type, role })
          const result = validateChatMessage(message)
          expect(result.success).toBe(true)
        })
      })
    })

    it('应该自动设置默认值', () => {
      const minimalMessage = { content: 'test' }
      const result = ChatMessageSchema.parse(minimalMessage)
      
      expect(result.type).toBe('text')
      expect(result.role).toBe('user')
      expect(result.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('智能体配置验证', () => {
    it('应该验证有效的智能体配置', () => {
      const validConfig = createMockAgentConfig()
      const result = validateAgentConfig(validConfig)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('test-agent-001')
        expect(result.data.name).toBe('Test Agent')
        expect(result.data.type).toBe('fastgpt')
      }
    })

    it('应该拒绝无效的智能体ID', () => {
      const invalidIds = [
        '', // 空ID
        'test agent', // 包含空格
        'test@agent', // 包含特殊字符
        'test.agent', // 包含点号
        'test/agent', // 包含斜杠
      ]

      invalidIds.forEach(id => {
        const config = createMockAgentConfig({ id })
        const result = validateAgentConfig(config)
        expect(result.success).toBe(false)
      })
    })

    it('应该支持所有智能体类型', () => {
      const types = ['fastgpt', 'cad', 'poster', 'custom']
      
      types.forEach(type => {
        const config = createMockAgentConfig({ type })
        const result = validateAgentConfig(config)
        expect(result.success).toBe(true)
      })
    })

    it('应该限制能力数量', () => {
      const tooManyCapabilities = Array(VALIDATION_LIMITS.MAX_CAPABILITIES_COUNT + 1)
        .fill(0)
        .map((_, i) => `capability-${i}`)
      
      const config = createMockAgentConfig({ capabilities: tooManyCapabilities })
      const result = validateAgentConfig(config)
      
      expect(result.success).toBe(false)
    })

    it('应该验证优先级范围', () => {
      const invalidPriorities = [-1, 101, 999]
      
      invalidPriorities.forEach(priority => {
        const config = createMockAgentConfig({ priority })
        const result = validateAgentConfig(config)
        expect(result.success).toBe(false)
      })
    })

    it('应该设置默认值', () => {
      const minimalConfig = {
        id: 'test',
        name: 'Test',
        type: 'fastgpt'
      }
      const result = AgentConfigSchema.parse(minimalConfig)
      
      expect(result.capabilities).toEqual([])
      expect(result.config).toEqual({})
      expect(result.enabled).toBe(true)
      expect(result.priority).toBe(50)
    })
  })

  describe('用户输入验证', () => {
    it('应该验证有效的用户输入', () => {
      const validInput = createMockUserInput()
      const result = validateUserInput(validInput)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.name).toBe('Test User')
      }
    })

    it('应该拒绝无效的邮箱格式', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
      ]

      invalidEmails.forEach(email => {
        const input = createMockUserInput({ email })
        const result = validateUserInput(input)
        expect(result.success).toBe(false)
      })
    })

    it('应该验证密码强度', () => {
      const weakPasswords = [
        'short', // 太短
        'nouppercase123', // 没有大写字母
        'NOLOWERCASE123', // 没有小写字母
        'NoNumbers', // 没有数字
      ]

      weakPasswords.forEach(password => {
        const input = createMockUserInput({ password })
        const result = validateUserInput(input)
        expect(result.success).toBe(false)
      })
    })

    it('应该验证姓名格式', () => {
      const validNames = [
        '张三',
        'John Doe',
        '李小明',
        'Mary Jane',
        '王二小',
      ]

      validNames.forEach(name => {
        const input = createMockUserInput({ name })
        const result = validateUserInput(input)
        expect(result.success).toBe(true)
      })

      const invalidNames = [
        'John123', // 包含数字
        'Test@User', // 包含特殊字符
        'User_Name', // 包含下划线
      ]

      invalidNames.forEach(name => {
        const input = createMockUserInput({ name })
        const result = validateUserInput(input)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('CAD分析配置验证', () => {
    it('应该验证有效的分析配置', () => {
      const config = {
        precision: 'high',
        enableAI: true,
        enableDeviceDetection: false,
        timeout: 120000,
        maxEntities: 1000,
      }
      
      const result = CADAnalysisConfigSchema.parse(config)
      expect(result.precision).toBe('high')
      expect(result.enableAI).toBe(true)
      expect(result.enableDeviceDetection).toBe(false)
    })

    it('应该设置默认值', () => {
      const result = CADAnalysisConfigSchema.parse({})
      
      expect(result.precision).toBe('standard')
      expect(result.enableAI).toBe(true)
      expect(result.enableDeviceDetection).toBe(true)
      expect(result.timeout).toBe(60000)
      expect(result.maxEntities).toBe(5000)
    })

    it('应该验证超时时间范围', () => {
      const invalidTimeouts = [500, VALIDATION_LIMITS.MAX_ANALYSIS_TIMEOUT + 1]
      
      invalidTimeouts.forEach(timeout => {
        expect(() => CADAnalysisConfigSchema.parse({ timeout })).toThrow()
      })
    })
  })

  describe('响应式配置验证', () => {
    it('应该验证有效的响应式配置', () => {
      const config = {
        breakpoint: 'lg',
        width: 1024,
        height: 768,
        deviceType: 'desktop',
        touchOptimized: false,
        performance: {
          level: 'high',
          memory: 8,
          cores: 4,
        }
      }
      
      const result = ResponsiveConfigSchema.parse(config)
      expect(result.breakpoint).toBe('lg')
      expect(result.deviceType).toBe('desktop')
      expect(result.performance?.level).toBe('high')
    })

    it('应该验证屏幕尺寸限制', () => {
      const invalidSizes = [
        { width: 319, height: 768 }, // 宽度太小
        { width: 1024, height: 239 }, // 高度太小
      ]

      invalidSizes.forEach(size => {
        expect(() => ResponsiveConfigSchema.parse(size)).toThrow()
      })
    })
  })

  describe('验证工具函数', () => {
    it('createValidator应该创建自定义验证器', () => {
      const customSchema = CADFileSchema
      const validator = createValidator(customSchema, '自定义错误消息')
      
      const validFile = createMockFile()
      const result = validator(validFile)
      
      expect(result.success).toBe(true)
      
      const invalidFile = createMockFile({ name: 'invalid.txt' })
      const invalidResult = validator(invalidFile)
      
      expect(invalidResult.success).toBe(false)
      if (!invalidResult.success) {
        expect(invalidResult.error.message).toBe('自定义错误消息')
      }
    })

    it('sanitizeAndValidate应该清理并验证数据', () => {
      const schema = ChatMessageSchema
      const dirtyData = {
        content: '  Hello World  ',
        type: 'text',
        role: 'user',
      }
      
      const sanitizers = [
        (data: any) => ({
          ...data,
          content: data.content?.trim?.() || data.content
        })
      ]
      
      const result = sanitizeAndValidate(schema, dirtyData, sanitizers)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('Hello World')
      }
    })
  })

  describe('验证限制常量', () => {
    it('应该定义所有必要的限制', () => {
      expect(VALIDATION_LIMITS.MAX_FILE_SIZE).toBe(100 * 1024 * 1024)
      expect(VALIDATION_LIMITS.MAX_FILENAME_LENGTH).toBe(255)
      expect(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH).toBe(4000)
      expect(VALIDATION_LIMITS.MAX_USER_NAME_LENGTH).toBe(100)
      expect(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH).toBe(8)
      expect(VALIDATION_LIMITS.MAX_CAD_ENTITIES).toBe(10000)
      expect(VALIDATION_LIMITS.MAX_ANALYSIS_TIMEOUT).toBe(300000)
      expect(VALIDATION_LIMITS.MAX_AGENT_NAME_LENGTH).toBe(50)
      expect(VALIDATION_LIMITS.MAX_AGENT_DESCRIPTION_LENGTH).toBe(500)
      expect(VALIDATION_LIMITS.MAX_CAPABILITIES_COUNT).toBe(20)
    })
  })

  describe('边界值测试', () => {
    it('应该处理边界值情况', () => {
      // 最大允许的文件大小
      const maxSizeFile = createMockFile({ 
        size: VALIDATION_LIMITS.MAX_FILE_SIZE 
      })
      expect(validateCADFile(maxSizeFile).success).toBe(true)
      
      // 最大允许的消息长度
      const maxLengthMessage = createMockChatMessage({
        content: 'a'.repeat(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH)
      })
      expect(validateChatMessage(maxLengthMessage).success).toBe(true)
      
      // 最小密码长度
      const minPasswordUser = createMockUserInput({
        password: 'A'.repeat(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH - 1) + 'a1'
      })
      expect(validateUserInput(minPasswordUser).success).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('应该处理非预期的输入类型', () => {
      const invalidInputs = [
        null,
        undefined,
        'string',
        123,
        [],
        true,
      ]

      invalidInputs.forEach(input => {
        const result = validateCADFile(input)
        expect(result.success).toBe(false)
      })
    })

    it('应该提供详细的错误信息', () => {
      const invalidFile = {
        name: '', // 空名称
        size: -1, // 负数大小
        type: 'invalid/type', // 无效类型
      }
      
      const result = validateCADFile(invalidFile)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
        result.error.issues.forEach(issue => {
          expect(issue.path).toBeDefined()
          expect(issue.message).toBeDefined()
          expect(issue.code).toBeDefined()
        })
      }
    })
  })
})

// 中间件测试暂时注释掉，避免Next.js环境依赖问题
// describe('验证中间件测试', () => {
//   // 测试代码已注释，可在完整环境中启用
// }) 