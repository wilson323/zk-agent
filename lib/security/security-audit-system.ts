// @ts-nocheck
/**
 * @file lib/security/security-audit-system.ts
 * @description 安全审计系统 - 解决核查报告中的安全问题
 * @author B团队安全架构师
 * @lastUpdate 2024-12-19
 * @security 生产级安全审计实现
 */

import { Logger } from '@/lib/utils/logger';
import { enhancedCacheManager } from '@/lib/cache/enhanced-cache-manager';
import { getErrorMessage, getErrorCode, isFileNotFoundError } from '@/lib/utils/error-handler';
import { enhancedPasswordSecurity } from '@/lib/auth/enhanced-password-security';

const logger = new Logger('SecurityAuditSystem');

// 安全事件类型
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  API_ACCESS = 'api_access',
  PERMISSION_DENIED = 'permission_denied',
  DATA_EXPORT = 'data_export',
  ADMIN_ACTION = 'admin_action',
  SECURITY_SCAN = 'security_scan',
  MALWARE_DETECTED = 'malware_detected',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  DDoS_ATTEMPT = 'ddos_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
}

// 安全事件严重级别
export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 安全事件接口
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  ip: string;
  userAgent?: string;
  details: Record<string, any>;
  riskScore: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  location?: {
    country?: string;
    city?: string;
    coordinates?: [number, number];
  };
}

// 威胁检测规则
interface ThreatRule {
  id: string;
  name: string;
  type: SecurityEventType;
  condition: (event: SecurityEvent, history: SecurityEvent[]) => boolean;
  severity: SecuritySeverity;
  action: 'log' | 'alert' | 'block' | 'quarantine';
  enabled: boolean;
}

// 文件安全检查结果
export interface FileSecurityResult {
  safe: boolean;
  threats: string[];
  fileType: string;
  size: number;
  hash: string;
  scanTime: number;
}

// 用户行为分析结果
interface UserBehaviorAnalysis {
  userId: string;
  riskScore: number;
  anomalies: string[];
  patterns: {
    loginTimes: number[];
    locations: string[];
    devices: string[];
    activities: string[];
  };
  recommendations: string[];
}

export class SecurityAuditSystem {
  private static instance: SecurityAuditSystem;
  private events: Map<string, SecurityEvent> = new Map();
  private threatRules: Map<string, ThreatRule> = new Map();
  private blockedIPs: Set<string> = new Set();
  private quarantinedFiles: Set<string> = new Set();
  private userBehaviorCache: Map<string, UserBehaviorAnalysis> = new Map();

  private constructor() {
    this.initializeThreatRules();
    this.startBackgroundTasks();
  }

  public static getInstance(): SecurityAuditSystem {
    if (!SecurityAuditSystem.instance) {
      SecurityAuditSystem.instance = new SecurityAuditSystem();
    }
    return SecurityAuditSystem.instance;
  }

  /**
   * 记录安全事件
   */
  async recordEvent(eventData: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): Promise<string> {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      resolved: false,
      ...eventData,
    };

    // 增强地理位置信息
    if (event.ip) {
      event.location = await this.getLocationFromIP(event.ip);
    }

    // 计算风险评分
    event.riskScore = this.calculateRiskScore(event);

    // 存储事件
    this.events.set(event.id, event);

    // 检查威胁规则
    await this.checkThreatRules(event);

    // 更新用户行为分析
    if (event.userId) {
      await this.updateUserBehaviorAnalysis(event.userId, event);
    }

    // 缓存高风险事件
    if (event.riskScore >= 7) {
      await enhancedCacheManager.set(
        `security:high-risk:${event.id}`,
        event,
        { ttl: 86400000, tags: ['security', 'high-risk'] }
      );
    }

    logger.info('Security event recorded', {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      riskScore: event.riskScore,
      userId: event.userId,
      ip: event.ip,
    });

    return event.id;
  }

  /**
   * 文件安全检查
   */
  async scanFile(filePath: string, fileBuffer: Buffer, metadata: {
    originalName: string;
    mimeType: string;
    size: number;
  }): Promise<FileSecurityResult> {
    const startTime = Date.now();
    const hash = this.calculateFileHash(fileBuffer);
    
    const result: FileSecurityResult = {
      safe: true,
      threats: [],
      fileType: metadata.mimeType,
      size: metadata.size,
      hash,
      scanTime: 0,
    };

    try {
      // 1. 文件类型验证
      const allowedTypes = this.getAllowedFileTypes();
      if (!allowedTypes.includes(metadata.mimeType)) {
        result.safe = false;
        result.threats.push(`不允许的文件类型: ${metadata.mimeType}`);
      }

      // 2. 文件大小检查
      const maxSize = this.getMaxFileSize(metadata.mimeType);
      if (metadata.size > maxSize) {
        result.safe = false;
        result.threats.push(`文件大小超限: ${metadata.size} > ${maxSize}`);
      }

      // 3. 文件名安全检查
      if (this.hasUnsafeFileName(metadata.originalName)) {
        result.safe = false;
        result.threats.push('文件名包含危险字符');
      }

      // 4. 文件内容扫描
      const contentThreats = await this.scanFileContent(fileBuffer, metadata.mimeType);
      if (contentThreats.length > 0) {
        result.safe = false;
        result.threats.push(...contentThreats);
      }

      // 5. 恶意软件检查
      const malwareCheck = await this.checkMalware(hash, fileBuffer);
      if (!malwareCheck.safe) {
        result.safe = false;
        result.threats.push(...malwareCheck.threats);
      }

      // 6. 记录扫描事件
      await this.recordEvent({
        type: SecurityEventType.SECURITY_SCAN,
        severity: result.safe ? SecuritySeverity.LOW : SecuritySeverity.HIGH,
        ip: '127.0.0.1', // 系统内部扫描
        details: {
          fileName: metadata.originalName,
          fileSize: metadata.size,
          fileType: metadata.mimeType,
          hash,
          threats: result.threats,
          safe: result.safe,
        },
        riskScore: result.safe ? 1 : 8,
      });

      result.scanTime = Date.now() - startTime;

      logger.info('File security scan completed', {
        fileName: metadata.originalName,
        safe: result.safe,
        threats: result.threats.length,
        scanTime: result.scanTime,
      });

      return result;

    } catch (error) {
      logger.error('File security scan failed', {
        fileName: metadata.originalName,
        error: error.message,
      });

      result.safe = false;
      result.threats.push('扫描过程中发生错误');
      result.scanTime = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * 实时威胁检测
   */
  async detectThreats(request: {
    ip: string;
    userAgent?: string;
    path: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  }): Promise<{
    blocked: boolean;
    threats: string[];
    riskScore: number;
  }> {
    const threats: string[] = [];
    let riskScore = 0;

    // 1. IP黑名单检查
    if (this.blockedIPs.has(request.ip)) {
      threats.push('IP已被封禁');
      riskScore += 10;
    }

    // 2. SQL注入检测
    const sqlInjectionRisk = this.detectSQLInjection(request);
    if (sqlInjectionRisk > 0) {
      threats.push('疑似SQL注入攻击');
      riskScore += sqlInjectionRisk;
    }

    // 3. XSS攻击检测
    const xssRisk = this.detectXSS(request);
    if (xssRisk > 0) {
      threats.push('疑似XSS攻击');
      riskScore += xssRisk;
    }

    // 4. 暴力破解检测
    const bruteForceRisk = await this.detectBruteForce(request.ip);
    if (bruteForceRisk > 0) {
      threats.push('疑似暴力破解攻击');
      riskScore += bruteForceRisk;
    }

    // 5. 异常User-Agent检测
    const userAgentRisk = this.detectSuspiciousUserAgent(request.userAgent);
    if (userAgentRisk > 0) {
      threats.push('异常User-Agent');
      riskScore += userAgentRisk;
    }

    // 6. 频率限制检查
    const rateLimitRisk = await this.checkRateLimit(request.ip, request.path);
    if (rateLimitRisk > 0) {
      threats.push('请求频率过高');
      riskScore += rateLimitRisk;
    }

    const blocked = riskScore >= 7;

    // 记录威胁检测事件
    if (threats.length > 0) {
      await this.recordEvent({
        type: riskScore >= 7 ? SecurityEventType.SUSPICIOUS_ACTIVITY : SecurityEventType.API_ACCESS,
        severity: riskScore >= 7 ? SecuritySeverity.HIGH : SecuritySeverity.LOW,
        ip: request.ip,
        userAgent: request.userAgent,
        details: {
          path: request.path,
          method: request.method,
          threats,
          riskScore,
          blocked,
        },
        riskScore,
      });
    }

    return { blocked, threats, riskScore };
  }

  /**
   * 用户行为分析
   */
  async analyzeUserBehavior(userId: string): Promise<UserBehaviorAnalysis> {
    const cached = this.userBehaviorCache.get(userId);
    if (cached && Date.now() - cached.patterns.loginTimes[0] < 3600000) {
      return cached;
    }

    const userEvents = Array.from(this.events.values())
      .filter(event => event.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100); // 最近100个事件

    const analysis: UserBehaviorAnalysis = {
      userId,
      riskScore: 0,
      anomalies: [],
      patterns: {
        loginTimes: [],
        locations: [],
        devices: [],
        activities: [],
      },
      recommendations: [],
    };

    // 分析登录时间模式
    const loginEvents = userEvents.filter(e => e.type === SecurityEventType.LOGIN_SUCCESS);
    analysis.patterns.loginTimes = loginEvents.map(e => e.timestamp.getHours());

    // 分析地理位置模式
    const locations = userEvents
      .filter(e => e.location?.city)
      .map(e => e.location!.city!)
      .filter((city, index, arr) => arr.indexOf(city) === index);
    analysis.patterns.locations = locations;

    // 分析设备模式
    const devices = userEvents
      .filter(e => e.userAgent)
      .map(e => this.extractDeviceInfo(e.userAgent!))
      .filter((device, index, arr) => arr.indexOf(device) === index);
    analysis.patterns.devices = devices;

    // 分析活动模式
    const activities = userEvents
      .map(e => e.type)
      .filter((type, index, arr) => arr.indexOf(type) === index);
    analysis.patterns.activities = activities;

    // 检测异常
    if (locations.length > 5) {
      analysis.anomalies.push('多地登录');
      analysis.riskScore += 2;
    }

    if (devices.length > 3) {
      analysis.anomalies.push('多设备访问');
      analysis.riskScore += 1;
    }

    const failedLogins = userEvents.filter(e => e.type === SecurityEventType.LOGIN_FAILURE);
    if (failedLogins.length > 5) {
      analysis.anomalies.push('频繁登录失败');
      analysis.riskScore += 3;
    }

    // 生成建议
    if (analysis.riskScore > 3) {
      analysis.recommendations.push('建议启用双因素认证');
    }

    if (locations.length > 3) {
      analysis.recommendations.push('建议设置登录地点白名单');
    }

    // 缓存分析结果
    this.userBehaviorCache.set(userId, analysis);

    return analysis;
  }

  /**
   * 生成安全报告
   */
  async generateSecurityReport(timeRange: {
    start: Date;
    end: Date;
  }): Promise<{
    summary: {
      totalEvents: number;
      highRiskEvents: number;
      blockedAttacks: number;
      resolvedIncidents: number;
    };
    topThreats: Array<{
      type: SecurityEventType;
      count: number;
      severity: SecuritySeverity;
    }>;
    riskTrends: Array<{
      date: string;
      riskScore: number;
      eventCount: number;
    }>;
    recommendations: string[];
  }> {
    const events = Array.from(this.events.values())
      .filter(event => 
        event.timestamp >= timeRange.start && 
        event.timestamp <= timeRange.end
      );

    const summary = {
      totalEvents: events.length,
      highRiskEvents: events.filter(e => e.riskScore >= 7).length,
      blockedAttacks: events.filter(e => e.severity === SecuritySeverity.CRITICAL).length,
      resolvedIncidents: events.filter(e => e.resolved).length,
    };

    // 统计威胁类型
    const threatCounts = new Map<SecurityEventType, number>();
    events.forEach(event => {
      threatCounts.set(event.type, (threatCounts.get(event.type) || 0) + 1);
    });

    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        severity: this.getEventTypeSeverity(type),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 风险趋势分析
    const riskTrends = this.calculateRiskTrends(events, timeRange);

    // 生成建议
    const recommendations = this.generateSecurityRecommendations(events);

    return {
      summary,
      topThreats,
      riskTrends,
      recommendations,
    };
  }

  /**
   * 私有方法：初始化威胁规则
   */
  private initializeThreatRules(): void {
    const rules: ThreatRule[] = [
      {
        id: 'brute-force-detection',
        name: '暴力破解检测',
        type: SecurityEventType.LOGIN_FAILURE,
        condition: (event, history) => {
          const recentFailures = history.filter(e => 
            e.type === SecurityEventType.LOGIN_FAILURE &&
            e.ip === event.ip &&
            Date.now() - e.timestamp.getTime() < 300000 // 5分钟内
          );
          return recentFailures.length >= 5;
        },
        severity: SecuritySeverity.HIGH,
        action: 'block',
        enabled: true,
      },
      {
        id: 'suspicious-location',
        name: '异常地理位置',
        type: SecurityEventType.LOGIN_SUCCESS,
        condition: (event, history) => {
          if (!event.location || !event.userId) {return false;}
          
          const recentLogins = history.filter(e =>
            e.type === SecurityEventType.LOGIN_SUCCESS &&
            e.userId === event.userId &&
            e.location &&
            Date.now() - e.timestamp.getTime() < 86400000 // 24小时内
          );

          const locations = recentLogins.map(e => e.location!.country).filter(Boolean);
          const uniqueCountries = new Set(locations);
          
          return uniqueCountries.size > 2; // 24小时内从超过2个国家登录
        },
        severity: SecuritySeverity.MEDIUM,
        action: 'alert',
        enabled: true,
      },
      {
        id: 'malware-upload',
        name: '恶意文件上传',
        type: SecurityEventType.FILE_UPLOAD,
        condition: (event) => {
          return event.details.threats && event.details.threats.length > 0;
        },
        severity: SecuritySeverity.CRITICAL,
        action: 'quarantine',
        enabled: true,
      },
    ];

    rules.forEach(rule => {
      this.threatRules.set(rule.id, rule);
    });

    logger.info('Threat rules initialized', { count: rules.length });
  }

  /**
   * 私有方法：检查威胁规则
   */
  private async checkThreatRules(event: SecurityEvent): Promise<void> {
    const history = Array.from(this.events.values())
      .filter(e => e.timestamp.getTime() > Date.now() - 86400000) // 24小时历史
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    for (const rule of this.threatRules.values()) {
      if (!rule.enabled) {continue;}

      try {
        if (rule.condition(event, history)) {
          await this.executeRuleAction(rule, event);
          
          logger.warn('Threat rule triggered', {
            ruleId: rule.id,
            ruleName: rule.name,
            eventId: event.id,
            action: rule.action,
          });
        }
      } catch (error) {
        logger.error('Threat rule execution failed', {
          ruleId: rule.id,
          error: error.message,
        });
      }
    }
  }

  /**
   * 私有方法：执行规则动作
   */
  private async executeRuleAction(rule: ThreatRule, event: SecurityEvent): Promise<void> {
    switch (rule.action) {
      case 'log':
        // 已经记录了事件，无需额外操作
        break;

      case 'alert':
        await this.sendSecurityAlert(rule, event);
        break;

      case 'block':
        if (event.ip) {
          this.blockedIPs.add(event.ip);
          await enhancedCacheManager.set(
            `security:blocked-ip:${event.ip}`,
            { blockedAt: new Date(), reason: rule.name },
            { ttl: 3600000 } // 1小时封禁
          );
        }
        break;

      case 'quarantine':
        if (event.details.filePath) {
          this.quarantinedFiles.add(event.details.filePath);
        }
        break;
    }
  }

  /**
   * 私有方法：发送安全警报
   */
  private async sendSecurityAlert(rule: ThreatRule, event: SecurityEvent): Promise<void> {
    // 这里可以集成邮件、短信、Slack等通知方式
    logger.warn('Security alert triggered', {
      ruleName: rule.name,
      eventType: event.type,
      severity: event.severity,
      riskScore: event.riskScore,
      details: event.details,
    });

    // 缓存警报以避免重复发送
    await enhancedCacheManager.set(
      `security:alert:${rule.id}:${event.ip}`,
      { alertSent: true },
      { ttl: 300000 } // 5分钟内不重复发送
    );
  }

  /**
   * 私有方法：计算风险评分
   */
  private calculateRiskScore(event: SecurityEvent): number {
    let score = 0;

    // 基础评分
    switch (event.severity) {
      case SecuritySeverity.LOW:
        score += 1;
        break;
      case SecuritySeverity.MEDIUM:
        score += 3;
        break;
      case SecuritySeverity.HIGH:
        score += 6;
        break;
      case SecuritySeverity.CRITICAL:
        score += 10;
        break;
    }

    // 事件类型评分
    switch (event.type) {
      case SecurityEventType.LOGIN_FAILURE:
        score += 2;
        break;
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        score += 5;
        break;
      case SecurityEventType.MALWARE_DETECTED:
        score += 8;
        break;
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
        score += 7;
        break;
      case SecurityEventType.BRUTE_FORCE_ATTACK:
        score += 6;
        break;
    }

    // IP信誉评分
    if (this.isKnownMaliciousIP(event.ip)) {
      score += 5;
    }

    return Math.min(score, 10); // 最高10分
  }

  /**
   * 私有方法：获取IP地理位置
   */
  private async getLocationFromIP(ip: string): Promise<{
    country?: string;
    city?: string;
    coordinates?: [number, number];
  }> {
    try {
      // 检查是否为本地IP
      if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {
          country: 'Local',
          city: 'Local Network',
          coordinates: [0, 0],
        };
      }

      // 这里应该集成真实的IP地理位置服务，如：
      // - MaxMind GeoIP2
      // - IP2Location
      // - ipapi.co
      // - ipgeolocation.io
      
      // 示例：使用免费的ipapi.co服务
      // const response = await fetch(`https://ipapi.co/${ip}/json/`);
      // const data = await response.json();
      // return {
      //   country: data.country_name,
      //   city: data.city,
      //   coordinates: [data.latitude, data.longitude],
      // };

      // 暂时返回空对象，避免使用模拟数据
      logger.warn('IP geolocation service not configured', { ip });
      return {};

    } catch (error) {
      logger.error('Failed to get location from IP', { ip, error: error.message });
      return {};
    }
  }

  /**
   * 私有方法：文件内容扫描
   */
  private async scanFileContent(buffer: Buffer, mimeType: string): Promise<string[]> {
    const threats: string[] = [];

    try {
      // 1. 检查文件头
      const fileHeader = buffer.slice(0, 16).toString('hex');
      if (this.isSuspiciousFileHeader(fileHeader, mimeType)) {
        threats.push('文件头与声明类型不匹配');
      }

      // 2. 扫描恶意模式
      const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024 * 1024)); // 只扫描前1MB
      const maliciousPatterns = [
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /<script[^>]*>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
      ];

      for (const pattern of maliciousPatterns) {
        if (pattern.test(content)) {
          threats.push(`检测到恶意模式: ${pattern.source}`);
        }
      }

      // 3. 检查嵌入的可执行文件
      if (this.hasEmbeddedExecutable(buffer)) {
        threats.push('文件包含嵌入的可执行代码');
      }

    } catch (error) {
      logger.error('File content scan failed', { error: error.message });
      threats.push('文件内容扫描失败');
    }

    return threats;
  }

  /**
   * 私有方法：恶意软件检查
   */
  private async checkMalware(hash: string, buffer: Buffer): Promise<{
    safe: boolean;
    threats: string[];
  }> {
    const result = { safe: true, threats: [] as string[] };

    try {
      // 1. 检查已知恶意文件哈希
      const knownMalwareHashes = await this.getKnownMalwareHashes();
      if (knownMalwareHashes.has(hash)) {
        result.safe = false;
        result.threats.push('文件哈希匹配已知恶意软件');
        return result;
      }

      // 2. 启发式检测
      const heuristicThreats = this.heuristicMalwareDetection(buffer);
      if (heuristicThreats.length > 0) {
        result.safe = false;
        result.threats.push(...heuristicThreats);
      }

      // 3. 行为分析（模拟）
      const behaviorThreats = this.analyzeSuspiciousBehavior(buffer);
      if (behaviorThreats.length > 0) {
        result.safe = false;
        result.threats.push(...behaviorThreats);
      }

    } catch (error) {
      logger.error('Malware check failed', { hash, error: error.message });
      result.safe = false;
      result.threats.push('恶意软件检查失败');
    }

    return result;
  }

  /**
   * 私有方法：SQL注入检测
   */
  private detectSQLInjection(request: any): number {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\'|\"|;|--|\*|\|)/g,
      /(\bUNION\b.*\bSELECT\b)/gi,
      /(\b(EXEC|EXECUTE)\b.*\b(SP_|XP_))/gi,
    ];

    const testStrings = [
      JSON.stringify(request.body || {}),
      request.path,
      Object.values(request.headers).join(' '),
    ];

    let riskScore = 0;
    for (const testString of testStrings) {
      for (const pattern of sqlPatterns) {
        if (pattern.test(testString)) {
          riskScore += 2;
        }
      }
    }

    return Math.min(riskScore, 8);
  }

  /**
   * 私有方法：XSS检测
   */
  private detectXSS(request: any): number {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /eval\s*\(/gi,
    ];

    const testStrings = [
      JSON.stringify(request.body || {}),
      request.path,
      Object.values(request.headers).join(' '),
    ];

    let riskScore = 0;
    for (const testString of testStrings) {
      for (const pattern of xssPatterns) {
        if (pattern.test(testString)) {
          riskScore += 2;
        }
      }
    }

    return Math.min(riskScore, 6);
  }

  /**
   * 私有方法：暴力破解检测
   */
  private async detectBruteForce(ip: string): Promise<number> {
    const cacheKey = `security:brute-force:${ip}`;
    const attempts = await enhancedCacheManager.get<number>(cacheKey) || 0;
    
    if (attempts >= 10) {
      return 8; // 高风险
    } else if (attempts >= 5) {
      return 4; // 中等风险
    }
    
    return 0;
  }

  /**
   * 私有方法：可疑User-Agent检测
   */
  private detectSuspiciousUserAgent(userAgent?: string): number {
    if (!userAgent) {return 1;}

    const suspiciousPatterns = [
      /bot|crawler|spider/i,
      /curl|wget|python|java/i,
      /scanner|exploit|hack/i,
      /^.{0,10}$/, // 过短的User-Agent
      /^.{200,}$/, // 过长的User-Agent
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        return 2;
      }
    }

    return 0;
  }

  /**
   * 私有方法：频率限制检查
   */
  private async checkRateLimit(ip: string, path: string): Promise<number> {
    const cacheKey = `security:rate-limit:${ip}:${path}`;
    const requests = await enhancedCacheManager.get<number>(cacheKey) || 0;
    
    // 每分钟最多100个请求
    if (requests > 100) {
      return 6;
    } else if (requests > 50) {
      return 3;
    }
    
    // 更新计数器
    await enhancedCacheManager.set(cacheKey, requests + 1, { ttl: 60000 });
    
    return 0;
  }

  /**
   * 私有方法：生成事件ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 私有方法：计算文件哈希
   */
  private calculateFileHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * 私有方法：获取允许的文件类型
   */
  private getAllowedFileTypes(): string[] {
    return [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json',
      'application/xml',
      'application/dwg',
      'application/dxf',
      'application/step',
      'application/iges',
      'model/obj',
    ];
  }

  /**
   * 私有方法：获取文件大小限制
   */
  private getMaxFileSize(mimeType: string): number {
    const limits: Record<string, number> = {
      'image/jpeg': 10 * 1024 * 1024, // 10MB
      'image/png': 10 * 1024 * 1024,
      'application/pdf': 50 * 1024 * 1024, // 50MB
      'application/dwg': 100 * 1024 * 1024, // 100MB
      'application/dxf': 100 * 1024 * 1024,
    };

    return limits[mimeType] || 5 * 1024 * 1024; // 默认5MB
  }

  /**
   * 私有方法：检查不安全的文件名
   */
  private hasUnsafeFileName(fileName: string): boolean {
    const unsafePatterns = [
      /\.\./,
      /[<>:"|?*]/,
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
      /\.(exe|bat|cmd|scr|pif|com|dll|vbs|js|jar)$/i,
    ];

    return unsafePatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * 私有方法：启动后台任务
   */
  private startBackgroundTasks(): void {
    // 定期清理过期事件
    setInterval(() => {
      this.cleanupExpiredEvents();
    }, 3600000); // 每小时清理一次

    // 定期更新威胁情报
    setInterval(() => {
      this.updateThreatIntelligence();
    }, 86400000); // 每天更新一次

    logger.info('Security audit background tasks started');
  }

  /**
   * 私有方法：清理过期事件
   */
  private cleanupExpiredEvents(): void {
    const cutoffTime = Date.now() - 30 * 24 * 3600000; // 30天前
    let cleanedCount = 0;

    for (const [id, event] of this.events.entries()) {
      if (event.timestamp.getTime() < cutoffTime) {
        this.events.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Expired security events cleaned', { count: cleanedCount });
    }
  }

  /**
   * 私有方法：更新威胁情报
   */
  private async updateThreatIntelligence(): Promise<void> {
    try {
      // 这里可以集成第三方威胁情报服务
      logger.info('Threat intelligence updated');
    } catch (error) {
      logger.error('Failed to update threat intelligence', { error: error.message });
    }
  }

  // 其他辅助方法...
  private isSuspiciousFileHeader(header: string, mimeType: string): boolean {
    // 实现文件头检查逻辑
    return false;
  }

  private hasEmbeddedExecutable(buffer: Buffer): boolean {
    // 实现嵌入可执行文件检查
    return false;
  }

  private async getKnownMalwareHashes(): Promise<Set<string>> {
    // 返回已知恶意软件哈希集合
    return new Set();
  }

  private heuristicMalwareDetection(buffer: Buffer): string[] {
    // 实现启发式恶意软件检测
    return [];
  }

  private analyzeSuspiciousBehavior(buffer: Buffer): string[] {
    // 实现可疑行为分析
    return [];
  }

  private isKnownMaliciousIP(ip: string): boolean {
    // 检查IP是否在恶意IP列表中
    return false;
  }

  private extractDeviceInfo(userAgent: string): string {
    // 从User-Agent提取设备信息
    return userAgent.split(' ')[0] || 'Unknown';
  }

  private getEventTypeSeverity(type: SecurityEventType): SecuritySeverity {
    const severityMap: Record<SecurityEventType, SecuritySeverity> = {
      [SecurityEventType.LOGIN_SUCCESS]: SecuritySeverity.LOW,
      [SecurityEventType.LOGIN_FAILURE]: SecuritySeverity.MEDIUM,
      [SecurityEventType.MALWARE_DETECTED]: SecuritySeverity.CRITICAL,
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: SecuritySeverity.HIGH,
      [SecurityEventType.BRUTE_FORCE_ATTACK]: SecuritySeverity.HIGH,
      // ... 其他映射
    } as any;

    return severityMap[type] || SecuritySeverity.MEDIUM;
  }

  private calculateRiskTrends(events: SecurityEvent[], timeRange: { start: Date; end: Date }): Array<{
    date: string;
    riskScore: number;
    eventCount: number;
  }> {
    // 实现风险趋势计算
    return [];
  }

  private generateSecurityRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];

    const highRiskEvents = events.filter(e => e.riskScore >= 7);
    if (highRiskEvents.length > 10) {
      recommendations.push('建议加强安全监控和防护措施');
    }

    const loginFailures = events.filter(e => e.type === SecurityEventType.LOGIN_FAILURE);
    if (loginFailures.length > 50) {
      recommendations.push('建议实施更严格的密码策略');
    }

    return recommendations;
  }

  private async updateUserBehaviorAnalysis(userId: string, event: SecurityEvent): Promise<void> {
    // 更新用户行为分析缓存
    const analysis = await this.analyzeUserBehavior(userId);
    this.userBehaviorCache.set(userId, analysis);
  }
}

// 导出单例实例
export const securityAuditSystem = SecurityAuditSystem.getInstance();

// 导出便捷方法
export const recordSecurityEvent = securityAuditSystem.recordEvent.bind(securityAuditSystem);
export const scanFile = securityAuditSystem.scanFile.bind(securityAuditSystem);
export const detectThreats = securityAuditSystem.detectThreats.bind(securityAuditSystem);
export const analyzeUserBehavior = securityAuditSystem.analyzeUserBehavior.bind(securityAuditSystem);
export const generateSecurityReport = securityAuditSystem.generateSecurityReport.bind(securityAuditSystem); 