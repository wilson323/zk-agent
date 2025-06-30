/**
 * @file Database Security Manager
 * @description 数据库安全管理器 - 第二阶段安全性增强实现
 * @author ZK-Agent Team
 * @date 2024-12-19
 * @version 1.0.0
 */

import { EventEmitter } from 'events'
import { Logger } from '../utils/logger'
import * as crypto from 'crypto'

/**
 * 安全配置接口
 */
interface SecurityConfig {
  /** 是否启用参数过滤 */
  enableParameterFiltering: boolean
  /** 是否启用数据脱敏 */
  enableDataMasking: boolean
  /** 是否启用连接加密 */
  enableConnectionEncryption: boolean
  /** 是否启用审计日志 */
  enableAuditLogging: boolean
  /** 是否启用权限控制 */
  enableAccessControl: boolean
  /** 加密算法 */
  encryptionAlgorithm: string
  /** 加密密钥 */
  encryptionKey?: string
  /** 敏感字段列表 */
  sensitiveFields: string[]
  /** 允许的IP地址 */
  allowedIPs: string[]
  /** 最大连接尝试次数 */
  maxConnectionAttempts: number
  /** 连接锁定时间(秒) */
  lockoutDuration: number
}

/**
 * 审计日志条目接口
 */
interface AuditLogEntry {
  /** 日志ID */
  id: string
  /** 时间戳 */
  timestamp: Date
  /** 用户ID */
  userId?: string
  /** 操作类型 */
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CONNECT' | 'DISCONNECT'
  /** 表名 */
  tableName?: string
  /** SQL语句 */
  sql?: string
  /** 影响行数 */
  affectedRows?: number
  /** 客户端IP */
  clientIP?: string
  /** 用户代理 */
  userAgent?: string
  /** 执行状态 */
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED'
  /** 错误信息 */
  errorMessage?: string
  /** 风险级别 */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

/**
 * 访问控制规则接口
 */
interface AccessControlRule {
  /** 规则ID */
  id: string
  /** 规则名称 */
  name: string
  /** 用户/角色 */
  principal: string
  /** 资源类型 */
  resourceType: 'TABLE' | 'COLUMN' | 'DATABASE' | 'SCHEMA'
  /** 资源名称 */
  resourceName: string
  /** 允许的操作 */
  allowedOperations: string[]
  /** 拒绝的操作 */
  deniedOperations: string[]
  /** 条件表达式 */
  condition?: string
  /** 是否启用 */
  enabled: boolean
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

/**
 * 安全威胁检测结果接口
 */
interface ThreatDetectionResult {
  /** 是否检测到威胁 */
  threatDetected: boolean
  /** 威胁类型 */
  threatType?: 'SQL_INJECTION' | 'UNAUTHORIZED_ACCESS' | 'DATA_EXFILTRATION' | 'BRUTE_FORCE'
  /** 风险级别 */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  /** 威胁描述 */
  description: string
  /** 建议措施 */
  recommendations: string[]
  /** 检测时间 */
  detectedAt: Date
}

/**
 * 连接尝试记录接口
 */
interface ConnectionAttempt {
  /** 客户端IP */
  clientIP: string
  /** 尝试时间 */
  timestamp: Date
  /** 是否成功 */
  success: boolean
  /** 用户名 */
  username?: string
  /** 错误信息 */
  errorMessage?: string
}

/**
 * 数据库安全管理器
 * 实现第二阶段安全性增强目标：
 * - SQL注入防护
 * - 参数过滤和验证
 * - 数据脱敏处理
 * - 连接加密强化
 * - 访问权限控制
 * - 安全审计日志
 * - 威胁检测和响应
 */
export class DatabaseSecurityManager extends EventEmitter {
  private logger: Logger
  private config: SecurityConfig
  private auditLogs: AuditLogEntry[] = []
  private accessControlRules: Map<string, AccessControlRule> = new Map()
  private connectionAttempts: Map<string, ConnectionAttempt[]> = new Map()
  private blockedIPs: Set<string> = new Set()
  private encryptionKey: Buffer
  private isMonitoring: boolean = false

  constructor(config: Partial<SecurityConfig> = {}) {
    super()
    this.logger = new Logger('DatabaseSecurityManager')
    
    this.config = {
      enableParameterFiltering: true,
      enableDataMasking: true,
      enableConnectionEncryption: true,
      enableAuditLogging: true,
      enableAccessControl: true,
      encryptionAlgorithm: 'aes-256-gcm',
      sensitiveFields: ['password', 'email', 'phone', 'ssn', 'credit_card'],
      allowedIPs: [],
      maxConnectionAttempts: 5,
      lockoutDuration: 300, // 5分钟
      ...config
    }
    
    // 初始化加密密钥
    this.encryptionKey = this.config.encryptionKey 
      ? Buffer.from(this.config.encryptionKey, 'hex')
      : crypto.randomBytes(32)
    
    // 启动监控
    this.startSecurityMonitoring()
    
    this.logger.info('数据库安全管理器已初始化', {
      config: {
        ...this.config,
        encryptionKey: '[REDACTED]'
      }
    })
  }

  /**
   * 验证和过滤SQL参数
   * @param sql SQL语句
   * @param parameters 参数数组
   * @returns 过滤后的参数
   */
  public filterParameters(sql: string, parameters: any[]): any[] {
    if (!this.config.enableParameterFiltering) {
      return parameters
    }
    
    const filteredParams = parameters.map((param, index) => {
      // 检测SQL注入模式
      if (typeof param === 'string') {
        const threatResult = this.detectSQLInjection(param)
        if (threatResult.threatDetected) {
          this.logger.warn('检测到SQL注入尝试', {
            parameter: param,
            index,
            threat: threatResult
          })
          
          this.recordAuditLog({
            id: this.generateId(),
            timestamp: new Date(),
            operation: 'SELECT',
            sql,
            status: 'BLOCKED',
            errorMessage: `SQL注入检测: ${threatResult.description}`,
            riskLevel: threatResult.riskLevel
          })
          
          throw new Error(`安全威胁检测: ${threatResult.description}`)
        }
        
        // 清理危险字符
        return this.sanitizeString(param)
      }
      
      return param
    })
    
    return filteredParams
  }

  /**
   * 检测SQL注入
   * @param input 输入字符串
   * @returns 威胁检测结果
   */
  private detectSQLInjection(input: string): ThreatDetectionResult {
    const lowerInput = input.toLowerCase()
    
    // SQL注入模式
    const injectionPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i, // 基本SQL字符
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i, // SQL关键字
      /(script|javascript|vbscript|onload|onerror)/i, // 脚本注入
      /(\<|\>|\&lt;|\&gt;)/i, // HTML标签
      /(\%27|\%22|\%3B|\%3C|\%3E)/i, // URL编码的危险字符
      /(0x[0-9a-f]+)/i, // 十六进制
      /(char\(|ascii\(|substring\()/i, // 函数调用
      /(waitfor|delay|sleep|benchmark)/i // 时间延迟攻击
    ]
    
    for (const pattern of injectionPatterns) {
      if (pattern.test(input)) {
        return {
          threatDetected: true,
          threatType: 'SQL_INJECTION',
          riskLevel: 'HIGH',
          description: `检测到SQL注入模式: ${pattern.source}`,
          recommendations: [
            '使用参数化查询',
            '验证和清理用户输入',
            '实施最小权限原则'
          ],
          detectedAt: new Date()
        }
      }
    }
    
    return {
      threatDetected: false,
      riskLevel: 'LOW',
      description: '未检测到威胁',
      recommendations: [],
      detectedAt: new Date()
    }
  }

  /**
   * 清理字符串
   * @param input 输入字符串
   * @returns 清理后的字符串
   */
  private sanitizeString(input: string): string {
    return input
      .replace(/[<>"'&]/g, '') // 移除危险字符
      .replace(/\s+/g, ' ') // 合并空格
      .trim()
  }

  /**
   * 数据脱敏处理
   * @param data 原始数据
   * @param fieldName 字段名
   * @returns 脱敏后的数据
   */
  public maskSensitiveData(data: any, fieldName: string): any {
    if (!this.config.enableDataMasking || !this.isSensitiveField(fieldName)) {
      return data
    }
    
    if (typeof data !== 'string') {
      return data
    }
    
    // 根据字段类型进行不同的脱敏处理
    switch (fieldName.toLowerCase()) {
      case 'password':
        return '***MASKED***'
      
      case 'email':
        return this.maskEmail(data)
      
      case 'phone':
        return this.maskPhone(data)
      
      case 'ssn':
        return this.maskSSN(data)
      
      case 'credit_card':
        return this.maskCreditCard(data)
      
      default:
        return this.maskGeneric(data)
    }
  }

  /**
   * 检查是否为敏感字段
   * @param fieldName 字段名
   * @returns 是否敏感
   */
  private isSensitiveField(fieldName: string): boolean {
    return this.config.sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    )
  }

  /**
   * 邮箱脱敏
   * @param email 邮箱地址
   * @returns 脱敏后的邮箱
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@')
    if (!username || !domain) return '***@***.***'
    
    const maskedUsername = username.length > 2 
      ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
      : '***'
    
    return `${maskedUsername}@${domain}`
  }

  /**
   * 电话号码脱敏
   * @param phone 电话号码
   * @returns 脱敏后的电话号码
   */
  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 4) return '***'
    
    return digits.slice(0, 3) + '*'.repeat(digits.length - 6) + digits.slice(-3)
  }

  /**
   * 社会保障号脱敏
   * @param ssn 社会保障号
   * @returns 脱敏后的SSN
   */
  private maskSSN(ssn: string): string {
    const digits = ssn.replace(/\D/g, '')
    if (digits.length !== 9) return '***-**-****'
    
    return `***-**-${digits.slice(-4)}`
  }

  /**
   * 信用卡号脱敏
   * @param cardNumber 信用卡号
   * @returns 脱敏后的信用卡号
   */
  private maskCreditCard(cardNumber: string): string {
    const digits = cardNumber.replace(/\D/g, '')
    if (digits.length < 4) return '****'
    
    return '*'.repeat(digits.length - 4) + digits.slice(-4)
  }

  /**
   * 通用脱敏
   * @param data 数据
   * @returns 脱敏后的数据
   */
  private maskGeneric(data: string): string {
    if (data.length <= 4) return '***'
    
    return data.slice(0, 2) + '*'.repeat(data.length - 4) + data.slice(-2)
  }

  /**
   * 加密敏感数据
   * @param data 原始数据
   * @returns 加密后的数据
   */
  public encryptData(data: string): string {
    if (!this.config.enableConnectionEncryption) {
      return data
    }
    
    try {
      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv)
      
      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const authTag = cipher.getAuthTag()
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
    } catch (error) {
      this.logger.error('数据加密失败', { error })
      throw new Error('数据加密失败')
    }
  }

  /**
   * 解密数据
   * @param encryptedData 加密的数据
   * @returns 解密后的数据
   */
  public decryptData(encryptedData: string): string {
    if (!this.config.enableConnectionEncryption) {
      return encryptedData
    }
    
    try {
      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('无效的加密数据格式')
      }
      
      const [ivHex, authTagHex, encrypted] = parts
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
      decipher.setAuthTag(authTag)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      this.logger.error('数据解密失败', { error })
      throw new Error('数据解密失败')
    }
  }

  /**
   * 验证访问权限
   * @param userId 用户ID
   * @param operation 操作类型
   * @param resourceType 资源类型
   * @param resourceName 资源名称
   * @returns 是否有权限
   */
  public checkAccess(
    userId: string,
    operation: string,
    resourceType: string,
    resourceName: string
  ): boolean {
    if (!this.config.enableAccessControl) {
      return true
    }
    
    // 查找适用的访问控制规则
    const applicableRules = Array.from(this.accessControlRules.values())
      .filter(rule => 
        rule.enabled &&
        rule.principal === userId &&
        rule.resourceType === resourceType &&
        (rule.resourceName === '*' || rule.resourceName === resourceName)
      )
    
    // 如果没有规则，默认拒绝
    if (applicableRules.length === 0) {
      this.recordAuditLog({
        id: this.generateId(),
        timestamp: new Date(),
        userId,
        operation: operation as any,
        tableName: resourceName,
        status: 'BLOCKED',
        errorMessage: '没有访问权限',
        riskLevel: 'MEDIUM'
      })
      
      return false
    }
    
    // 检查是否被明确拒绝
    const isDenied = applicableRules.some(rule => 
      rule.deniedOperations.includes(operation) || rule.deniedOperations.includes('*')
    )
    
    if (isDenied) {
      this.recordAuditLog({
        id: this.generateId(),
        timestamp: new Date(),
        userId,
        operation: operation as any,
        tableName: resourceName,
        status: 'BLOCKED',
        errorMessage: '操作被明确拒绝',
        riskLevel: 'MEDIUM'
      })
      
      return false
    }
    
    // 检查是否被明确允许
    const isAllowed = applicableRules.some(rule => 
      rule.allowedOperations.includes(operation) || rule.allowedOperations.includes('*')
    )
    
    if (!isAllowed) {
      this.recordAuditLog({
        id: this.generateId(),
        timestamp: new Date(),
        userId,
        operation: operation as any,
        tableName: resourceName,
        status: 'BLOCKED',
        errorMessage: '操作未被明确允许',
        riskLevel: 'MEDIUM'
      })
    }
    
    return isAllowed
  }

  /**
   * 记录连接尝试
   * @param clientIP 客户端IP
   * @param success 是否成功
   * @param username 用户名
   * @param errorMessage 错误信息
   */
  public recordConnectionAttempt(
    clientIP: string,
    success: boolean,
    username?: string,
    errorMessage?: string
  ): void {
    const attempt: ConnectionAttempt = {
      clientIP,
      timestamp: new Date(),
      success,
      username,
      errorMessage
    }
    
    if (!this.connectionAttempts.has(clientIP)) {
      this.connectionAttempts.set(clientIP, [])
    }
    
    const attempts = this.connectionAttempts.get(clientIP)!
    attempts.push(attempt)
    
    // 保留最近的尝试记录
    if (attempts.length > 100) {
      this.connectionAttempts.set(clientIP, attempts.slice(-50))
    }
    
    // 检查是否需要锁定IP
    if (!success) {
      this.checkForBruteForce(clientIP)
    }
    
    // 记录审计日志
    this.recordAuditLog({
      id: this.generateId(),
      timestamp: new Date(),
      userId: username,
      operation: success ? 'CONNECT' : 'CONNECT',
      clientIP,
      status: success ? 'SUCCESS' : 'FAILED',
      errorMessage,
      riskLevel: success ? 'LOW' : 'MEDIUM'
    })
  }

  /**
   * 检查暴力破解攻击
   * @param clientIP 客户端IP
   */
  private checkForBruteForce(clientIP: string): void {
    const attempts = this.connectionAttempts.get(clientIP) || []
    const recentAttempts = attempts.filter(attempt => 
      Date.now() - attempt.timestamp.getTime() < 5 * 60 * 1000 // 5分钟内
    )
    
    const failedAttempts = recentAttempts.filter(attempt => !attempt.success)
    
    if (failedAttempts.length >= this.config.maxConnectionAttempts) {
      this.blockedIPs.add(clientIP)
      
      // 设置解锁定时器
      setTimeout(() => {
        this.blockedIPs.delete(clientIP)
        this.logger.info('IP地址已解锁', { clientIP })
      }, this.config.lockoutDuration * 1000)
      
      this.logger.warn('检测到暴力破解攻击，IP已被锁定', {
        clientIP,
        failedAttempts: failedAttempts.length,
        lockoutDuration: this.config.lockoutDuration
      })
      
      this.emit('brute_force_detected', {
        clientIP,
        failedAttempts: failedAttempts.length,
        lockoutDuration: this.config.lockoutDuration
      })
    }
  }

  /**
   * 检查IP是否被阻止
   * @param clientIP 客户端IP
   * @returns 是否被阻止
   */
  public isIPBlocked(clientIP: string): boolean {
    return this.blockedIPs.has(clientIP)
  }

  /**
   * 验证IP地址是否在允许列表中
   * @param clientIP 客户端IP
   * @returns 是否允许
   */
  public isIPAllowed(clientIP: string): boolean {
    if (this.config.allowedIPs.length === 0) {
      return true // 如果没有配置允许列表，则允许所有IP
    }
    
    return this.config.allowedIPs.includes(clientIP)
  }

  /**
   * 记录审计日志
   * @param entry 日志条目
   */
  public recordAuditLog(entry: Omit<AuditLogEntry, 'id'> & { id?: string }): void {
    if (!this.config.enableAuditLogging) {
      return
    }
    
    const auditEntry: AuditLogEntry = {
      id: entry.id || this.generateId(),
      ...entry
    }
    
    this.auditLogs.push(auditEntry)
    
    // 限制日志数量
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000)
    }
    
    // 触发审计事件
    this.emit('audit_log_created', auditEntry)
    
    // 高风险事件立即告警
    if (auditEntry.riskLevel === 'HIGH' || auditEntry.riskLevel === 'CRITICAL') {
      this.emit('security_alert', auditEntry)
    }
  }

  /**
   * 添加访问控制规则
   * @param rule 访问控制规则
   */
  public addAccessControlRule(rule: Omit<AccessControlRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const ruleId = this.generateId()
    const now = new Date()
    
    const fullRule: AccessControlRule = {
      id: ruleId,
      createdAt: now,
      updatedAt: now,
      ...rule
    }
    
    this.accessControlRules.set(ruleId, fullRule)
    
    this.logger.info('访问控制规则已添加', { rule: fullRule })
    this.emit('access_rule_added', fullRule)
    
    return ruleId
  }

  /**
   * 更新访问控制规则
   * @param ruleId 规则ID
   * @param updates 更新内容
   */
  public updateAccessControlRule(
    ruleId: string, 
    updates: Partial<Omit<AccessControlRule, 'id' | 'createdAt' | 'updatedAt'>>
  ): boolean {
    const rule = this.accessControlRules.get(ruleId)
    if (!rule) {
      return false
    }
    
    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    }
    
    this.accessControlRules.set(ruleId, updatedRule)
    
    this.logger.info('访问控制规则已更新', { ruleId, updates })
    this.emit('access_rule_updated', updatedRule)
    
    return true
  }

  /**
   * 删除访问控制规则
   * @param ruleId 规则ID
   */
  public deleteAccessControlRule(ruleId: string): boolean {
    const deleted = this.accessControlRules.delete(ruleId)
    
    if (deleted) {
      this.logger.info('访问控制规则已删除', { ruleId })
      this.emit('access_rule_deleted', ruleId)
    }
    
    return deleted
  }

  /**
   * 获取审计日志
   * @param filters 过滤条件
   * @param limit 返回数量限制
   * @returns 审计日志数组
   */
  public getAuditLogs(
    filters: Partial<Pick<AuditLogEntry, 'userId' | 'operation' | 'status' | 'riskLevel'>> = {},
    limit: number = 100
  ): AuditLogEntry[] {
    let filteredLogs = this.auditLogs
    
    // 应用过滤条件
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
    }
    if (filters.operation) {
      filteredLogs = filteredLogs.filter(log => log.operation === filters.operation)
    }
    if (filters.status) {
      filteredLogs = filteredLogs.filter(log => log.status === filters.status)
    }
    if (filters.riskLevel) {
      filteredLogs = filteredLogs.filter(log => log.riskLevel === filters.riskLevel)
    }
    
    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * 获取安全统计信息
   * @returns 安全统计
   */
  public getSecurityStats() {
    const totalLogs = this.auditLogs.length
    const recentLogs = this.auditLogs.filter(log => 
      Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000
    )
    
    const threatCounts = recentLogs.reduce((counts, log) => {
      counts[log.riskLevel] = (counts[log.riskLevel] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    const blockedAttempts = recentLogs.filter(log => log.status === 'BLOCKED').length
    const failedConnections = recentLogs.filter(log => 
      log.operation === 'CONNECT' && log.status === 'FAILED'
    ).length
    
    return {
      totalAuditLogs: totalLogs,
      recentLogs: recentLogs.length,
      threatCounts,
      blockedAttempts,
      failedConnections,
      blockedIPs: this.blockedIPs.size,
      accessControlRules: this.accessControlRules.size,
      securityConfig: {
        parameterFiltering: this.config.enableParameterFiltering,
        dataMasking: this.config.enableDataMasking,
        connectionEncryption: this.config.enableConnectionEncryption,
        auditLogging: this.config.enableAuditLogging,
        accessControl: this.config.enableAccessControl
      }
    }
  }

  /**
   * 启动安全监控
   */
  private startSecurityMonitoring(): void {
    if (this.isMonitoring) {
      return
    }
    
    this.isMonitoring = true
    
    // 每小时清理过期的连接尝试记录
    setInterval(() => {
      this.cleanupConnectionAttempts()
    }, 60 * 60 * 1000)
    
    // 每天生成安全报告
    setInterval(() => {
      this.generateSecurityReport()
    }, 24 * 60 * 60 * 1000)
    
    this.logger.info('安全监控已启动')
  }

  /**
   * 清理过期的连接尝试记录
   */
  private cleanupConnectionAttempts(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    
    this.connectionAttempts.forEach((attempts, ip) => {
      const recentAttempts = attempts.filter(attempt => 
        attempt.timestamp.getTime() > oneDayAgo
      )
      
      if (recentAttempts.length === 0) {
        this.connectionAttempts.delete(ip)
      } else {
        this.connectionAttempts.set(ip, recentAttempts)
      }
    })
  }

  /**
   * 生成安全报告
   */
  private generateSecurityReport(): void {
    const stats = this.getSecurityStats()
    const report = {
      timestamp: new Date(),
      period: '24小时',
      ...stats,
      recommendations: this.generateSecurityRecommendations(stats)
    }
    
    this.logger.info('安全报告已生成', report)
    this.emit('security_report', report)
  }

  /**
   * 生成安全建议
   * @param stats 安全统计
   * @returns 建议列表
   */
  private generateSecurityRecommendations(stats: any): string[] {
    const recommendations: string[] = []
    
    if (stats.blockedAttempts > 10) {
      recommendations.push('检测到大量阻止的访问尝试，建议加强访问控制')
    }
    
    if (stats.failedConnections > 20) {
      recommendations.push('连接失败次数较多，建议检查网络配置和认证设置')
    }
    
    if (stats.threatCounts.HIGH > 0 || stats.threatCounts.CRITICAL > 0) {
      recommendations.push('检测到高风险威胁，建议立即审查相关日志')
    }
    
    if (stats.blockedIPs > 5) {
      recommendations.push('多个IP被阻止，建议检查是否存在协调攻击')
    }
    
    return recommendations
  }

  /**
   * 生成唯一ID
   * @returns 唯一ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
   * 获取配置
   * @returns 安全配置
   */
  public getConfig(): SecurityConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   * @param newConfig 新配置
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    const oldConfig = { ...this.config }
    this.config = { ...this.config, ...newConfig }
    
    this.logger.info('安全配置已更新', {
      oldConfig: { ...oldConfig, encryptionKey: '[REDACTED]' },
      newConfig: { ...this.config, encryptionKey: '[REDACTED]' }
    })
    
    this.emit('config_updated', {
      oldConfig,
      newConfig: this.config
    })
  }

  /**
   * 销毁安全管理器
   */
  public destroy(): void {
    this.isMonitoring = false
    this.auditLogs = []
    this.accessControlRules.clear()
    this.connectionAttempts.clear()
    this.blockedIPs.clear()
    this.removeAllListeners()
    
    this.logger.info('数据库安全管理器已销毁')
  }
}

// 导出单例实例
export const databaseSecurityManager = new DatabaseSecurityManager()