// @ts-nocheck
/**
 * @file lib/validation/schemas.ts
 * @description 基于Zod的统一数据验证模块 - 多智能体平台数据验证中心
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 创建基于zod的统一验证系统
 * 
 * 🔤 命名规范说明：
 * - Schema名称：PascalCase + Schema后缀（如：UserInputSchema）
 * - 验证函数：validate + 对象名称（如：validateCADFile）
 * - 错误类型：ValidationError + 具体类型（如：CADValidationError）
 * - 配置常量：VALIDATION_ + 大写描述（如：VALIDATION_LIMITS）
 * 
 * ⚠️ 本模块为现有系统的增强，保持向后兼容性
 */

import { z } from 'zod'

// 📝 命名规范：验证配置常量使用VALIDATION_前缀
export const VALIDATION_LIMITS = {
  // 文件上传限制
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILENAME_LENGTH: 255,
  
  // 文本内容限制
  MAX_MESSAGE_LENGTH: 4000,
  MAX_USER_NAME_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 8,
  
  // CAD文件特定限制
  MAX_CAD_ENTITIES: 10000,
  MAX_ANALYSIS_TIMEOUT: 300000, // 5分钟
  
  // 智能体配置限制
  MAX_AGENT_NAME_LENGTH: 50,
  MAX_AGENT_DESCRIPTION_LENGTH: 500,
  MAX_CAPABILITIES_COUNT: 20,
} as const

// 📝 命名规范：基础Schema使用PascalCase + Schema后缀
export const BaseFileSchema = z.object({
  name: z.string()
    .min(1, '文件名不能为空')
    .max(VALIDATION_LIMITS.MAX_FILENAME_LENGTH, `文件名不能超过${VALIDATION_LIMITS.MAX_FILENAME_LENGTH}个字符`)
    .regex(/^[^<>:"/\\|?*]+$/, '文件名包含非法字符'),
  
  size: z.number()
    .min(1, '文件大小必须大于0')
    .max(VALIDATION_LIMITS.MAX_FILE_SIZE, `文件大小不能超过${VALIDATION_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`),
  
  type: z.string()
    .min(1, '文件类型不能为空'),
  
  lastModified: z.number()
    .optional(),
})

// 📝 命名规范：CAD相关Schema使用CAD前缀
export const CADFileSchema = BaseFileSchema.extend({
  name: z.string()
    .regex(/\.(dwg|dxf|step|stp|iges|igs|stl|obj|gltf|glb)$/i, '不支持的CAD文件格式'),
  
  type: z.enum([
    'application/octet-stream',
    'application/x-dwg',
    'application/x-dxf',
    'application/step',
    'application/iges',
    'model/stl',
    'model/obj',
    'model/gltf+json',
    'model/gltf-binary',
  ], {
    errorMap: () => ({ message: '不支持的CAD文件MIME类型' })
  }),
})

// 📝 命名规范：分析配置Schema
export const CADAnalysisConfigSchema = z.object({
  precision: z.enum(['low', 'standard', 'high', 'ultra'], {
    errorMap: () => ({ message: '分析精度必须是 low, standard, high, ultra 之一' })
  }).default('standard'),
  
  enableAI: z.boolean().default(true),
  enableDeviceDetection: z.boolean().default(true),
  enableRiskAssessment: z.boolean().default(true),
  enableManufacturingAnalysis: z.boolean().default(false),
  enableCostEstimation: z.boolean().default(false),
  
  timeout: z.number()
    .min(1000, '超时时间不能少于1秒')
    .max(VALIDATION_LIMITS.MAX_ANALYSIS_TIMEOUT, '超时时间不能超过5分钟')
    .default(60000),
  
  maxEntities: z.number()
    .min(1, '最大实体数不能少于1')
    .max(VALIDATION_LIMITS.MAX_CAD_ENTITIES, `最大实体数不能超过${VALIDATION_LIMITS.MAX_CAD_ENTITIES}`)
    .default(5000),
})

// 📝 命名规范：用户输入Schema
export const UserInputSchema = z.object({
  email: z.string()
    .email('邮箱格式不正确')
    .max(254, '邮箱地址过长'),
  
  name: z.string()
    .min(1, '姓名不能为空')
    .max(VALIDATION_LIMITS.MAX_USER_NAME_LENGTH, `姓名不能超过${VALIDATION_LIMITS.MAX_USER_NAME_LENGTH}个字符`)
    .regex(/^[\u4e00-\u9fff\u3400-\u4dbfa-zA-Z\s]+$/, '姓名只能包含中文、英文和空格'),
  
  password: z.string()
    .min(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH, `密码不能少于${VALIDATION_LIMITS.MIN_PASSWORD_LENGTH}个字符`)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
})

// 📝 命名规范：聊天消息Schema
export const ChatMessageSchema = z.object({
  content: z.string()
    .min(1, '消息内容不能为空')
    .max(VALIDATION_LIMITS.MAX_MESSAGE_LENGTH, `消息内容不能超过${VALIDATION_LIMITS.MAX_MESSAGE_LENGTH}个字符`)
    .refine(
      content => !/<script|javascript:|data:|vbscript:|onload|onerror/i.test(content),
      '消息内容包含潜在的安全风险'
    ),
  
  type: z.enum(['text', 'file', 'image', 'system'], {
    errorMap: () => ({ message: '消息类型必须是 text, file, image, system 之一' })
  }).default('text'),
  
  role: z.enum(['user', 'assistant', 'system', 'tool'], {
    errorMap: () => ({ message: '消息角色必须是 user, assistant, system, tool 之一' })
  }).default('user'),
  
  timestamp: z.date().default(() => new Date()),
  
  metadata: z.record(z.unknown()).optional(),
})

// 📝 命名规范：智能体配置Schema
export const AgentConfigSchema = z.object({
  id: z.string()
    .min(1, '智能体ID不能为空')
    .regex(/^[a-zA-Z0-9_-]+$/, '智能体ID只能包含字母、数字、下划线和连字符'),
  
  name: z.string()
    .min(1, '智能体名称不能为空')
    .max(VALIDATION_LIMITS.MAX_AGENT_NAME_LENGTH, `智能体名称不能超过${VALIDATION_LIMITS.MAX_AGENT_NAME_LENGTH}个字符`),
  
  description: z.string()
    .max(VALIDATION_LIMITS.MAX_AGENT_DESCRIPTION_LENGTH, `智能体描述不能超过${VALIDATION_LIMITS.MAX_AGENT_DESCRIPTION_LENGTH}个字符`)
    .optional(),
  
  type: z.enum(['fastgpt', 'cad', 'poster', 'custom'], {
    errorMap: () => ({ message: '智能体类型必须是 fastgpt, cad, poster, custom 之一' })
  }),
  
  capabilities: z.array(z.string())
    .max(VALIDATION_LIMITS.MAX_CAPABILITIES_COUNT, `智能体能力不能超过${VALIDATION_LIMITS.MAX_CAPABILITIES_COUNT}个`)
    .default([]),
  
  config: z.record(z.unknown()).default({}),
  
  enabled: z.boolean().default(true),
  
  priority: z.number()
    .min(0, '优先级不能小于0')
    .max(100, '优先级不能大于100')
    .default(50),
})

// 📝 命名规范：API请求Schema
export const APIRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], {
    errorMap: () => ({ message: 'HTTP方法不支持' })
  }),
  
  headers: z.record(z.string()).optional(),
  
  query: z.record(z.union([z.string(), z.array(z.string())])).optional(),
  
  body: z.unknown().optional(),
  
  timeout: z.number()
    .min(1000, '请求超时时间不能少于1秒')
    .max(300000, '请求超时时间不能超过5分钟')
    .default(30000),
})

// 📝 命名规范：响应式配置Schema
export const ResponsiveConfigSchema = z.object({
  breakpoint: z.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'], {
    errorMap: () => ({ message: '断点配置不正确' })
  }),
  
  width: z.number().min(320, '屏幕宽度不能小于320px'),
  height: z.number().min(240, '屏幕高度不能小于240px'),
  
  deviceType: z.enum(['mobile', 'tablet', 'desktop', 'tv'], {
    errorMap: () => ({ message: '设备类型必须是 mobile, tablet, desktop, tv 之一' })
  }),
  
  touchOptimized: z.boolean().default(false),
  
  performance: z.object({
    level: z.enum(['low', 'medium', 'high']).default('medium'),
    memory: z.number().min(1).default(4),
    cores: z.number().min(1).default(4),
  }).optional(),
})

// 📝 命名规范：验证结果类型
export type ValidationResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: {
    message: string
    issues: Array<{
      path: (string | number)[]
      message: string
      code: string
    }>
  }
}

// 📝 命名规范：验证函数使用validate前缀
export const validateCADFile = (file: unknown): ValidationResult<z.infer<typeof CADFileSchema>> => {
  try {
    const data = CADFileSchema.parse(file)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: 'CAD文件验证失败',
          issues: error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          }))
        }
      }
    }
    return {
      success: false,
      error: {
        message: '未知验证错误',
        issues: []
      }
    }
  }
}

export const validateChatMessage = (message: unknown): ValidationResult<z.infer<typeof ChatMessageSchema>> => {
  try {
    const data = ChatMessageSchema.parse(message)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: '聊天消息验证失败',
          issues: error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          }))
        }
      }
    }
    return {
      success: false,
      error: {
        message: '未知验证错误',
        issues: []
      }
    }
  }
}

export const validateAgentConfig = (config: unknown): ValidationResult<z.infer<typeof AgentConfigSchema>> => {
  try {
    const data = AgentConfigSchema.parse(config)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: '智能体配置验证失败',
          issues: error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          }))
        }
      }
    }
    return {
      success: false,
      error: {
        message: '未知验证错误',
        issues: []
      }
    }
  }
}

export const validateUserInput = (input: unknown): ValidationResult<z.infer<typeof UserInputSchema>> => {
  try {
    const data = UserInputSchema.parse(input)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: '用户输入验证失败',
          issues: error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          }))
        }
      }
    }
    return {
      success: false,
      error: {
        message: '未知验证错误',
        issues: []
      }
    }
  }
}

// 📝 命名规范：通用验证工具函数
export const createValidator = <T extends z.ZodSchema>(schema: T, errorMessage: string) => {
  return (data: unknown): ValidationResult<z.infer<T>> => {
    try {
      const validData = schema.parse(data)
      return { success: true, data: validData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            message: errorMessage,
            issues: error.issues.map(issue => ({
              path: issue.path,
              message: issue.message,
              code: issue.code,
            }))
          }
        }
      }
      return {
        success: false,
        error: {
          message: '未知验证错误',
          issues: []
        }
      }
    }
  }
}

// 📝 命名规范：安全验证工具
export const sanitizeAndValidate = <T extends z.ZodSchema>(
  schema: T,
  data: unknown,
  sanitizers?: Array<(_input: any) => any>
): ValidationResult<z.infer<T>> => {
  try {
    let sanitizedData = data
    
    // 应用清理函数
    if (sanitizers) {
      for (const sanitizer of sanitizers) {
        sanitizedData = sanitizer(sanitizedData)
      }
    }
    
    const validData = schema.parse(sanitizedData)
    return { success: true, data: validData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          message: '数据验证失败',
          issues: error.issues.map(issue => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          }))
        }
      }
    }
    return {
      success: false,
      error: {
        message: '未知验证错误',
        issues: []
      }
    }
  }
}

// 导出所有Schema类型
export type CADFileType = z.infer<typeof CADFileSchema>
export type CADAnalysisConfigType = z.infer<typeof CADAnalysisConfigSchema>
export type UserInputType = z.infer<typeof UserInputSchema>
export type ChatMessageType = z.infer<typeof ChatMessageSchema>
export type AgentConfigType = z.infer<typeof AgentConfigSchema>
export type APIRequestType = z.infer<typeof APIRequestSchema>
export type ResponsiveConfigType = z.infer<typeof ResponsiveConfigSchema>