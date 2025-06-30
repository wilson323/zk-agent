/**
 * @file 统一权限控制体系
 * @description 基于角色的访问控制(RBAC)和属性访问控制(ABAC)系统
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { z } from 'zod';

import { Logger } from '@/lib/utils/logger';
import { AppError } from '@/lib/errors/app-error';
import { ErrorCode, ErrorType, ErrorSeverity, UserRole, Permission, ResourceType } from '@/lib/types/enums';
// import { ERROR_CODES } from '@/config/constants';

const logger = new Logger('PermissionSystem');



// 权限上下文接口
interface PermissionContext {
  user: {
    id: string;
    role: UserRole;
    permissions: Permission[];
    attributes?: Record<string, unknown>;
  };
  resource?: {
    type: ResourceType;
    id?: string;
    ownerId?: string;
    attributes?: Record<string, unknown>;
  };
  environment?: {
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
    requestId?: string;
  };
  action: Permission;
}

// 权限规则接口
interface PermissionRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  conditions: {
    roles?: UserRole[];
    permissions?: Permission[];
    resourceTypes?: ResourceType[];
    attributes?: Record<string, unknown>;
    timeConstraints?: {
      startTime?: string;
      endTime?: string;
      allowedDays?: number[];
    };
    ipWhitelist?: string[];
  };
  effect: 'ALLOW' | 'DENY';
  validator?: (context: PermissionContext) => Promise<boolean>;
}

// 权限检查结果
interface PermissionResult {
  granted: boolean;
  reason: string;
  appliedRules: string[];
  suggestions?: string[];
  details?: Record<string, unknown>;
}

// 角色权限配置
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.GUEST]: [
    Permission.READ,
    Permission.AGENT_READ
  ],
  [UserRole.USER]: [
    Permission.READ,
    Permission.WRITE,
    Permission.AGENT_READ,
    Permission.AGENT_EXECUTE,
    Permission.CAD_UPLOAD,
    Permission.CAD_ANALYZE,
    Permission.CAD_HISTORY,
    Permission.POSTER_CREATE,
    Permission.POSTER_READ,
    Permission.POSTER_UPDATE,
    Permission.POSTER_DELETE,
    Permission.FILE_UPLOAD,
    Permission.FILE_READ,
    Permission.REPORT_VIEW
  ],
  [UserRole.MODERATOR]: [
    Permission.READ,
    Permission.WRITE,
    Permission.AGENT_READ,
    Permission.AGENT_EXECUTE,
    Permission.CAD_UPLOAD,
    Permission.CAD_ANALYZE,
    Permission.CAD_HISTORY,
    Permission.POSTER_CREATE,
    Permission.POSTER_READ,
    Permission.POSTER_UPDATE,
    Permission.POSTER_DELETE,
    Permission.FILE_UPLOAD,
    Permission.FILE_READ,
    Permission.REPORT_VIEW,
    Permission.USER_READ,
    Permission.USER_LIST,
    Permission.AGENT_CREATE,
    Permission.AGENT_UPDATE,
    Permission.SYSTEM_LOGS
  ],
  [UserRole.ADMIN]: [
    Permission.READ,
    Permission.WRITE,
    Permission.AGENT_READ,
    Permission.AGENT_EXECUTE,
    Permission.CAD_UPLOAD,
    Permission.CAD_ANALYZE,
    Permission.CAD_HISTORY,
    Permission.POSTER_CREATE,
    Permission.POSTER_READ,
    Permission.POSTER_UPDATE,
    Permission.POSTER_DELETE,
    Permission.FILE_UPLOAD,
    Permission.FILE_READ,
    Permission.REPORT_VIEW,
    Permission.USER_READ,
    Permission.USER_LIST,
    Permission.AGENT_CREATE,
    Permission.AGENT_UPDATE,
    Permission.SYSTEM_LOGS,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.AGENT_DELETE,
    Permission.AGENT_CONFIGURE,
    Permission.SYSTEM_CONFIG,
    Permission.SYSTEM_MONITOR,
    Permission.SECURITY_AUDIT,
    Permission.SECURITY_SCAN,
    Permission.FILE_DELETE
  ],
  [UserRole.SUPER_ADMIN]: [
    ...Object.values(Permission)
  ],
  [UserRole.SYSTEM]: [
    ...Object.values(Permission)
  ],
  [UserRole.DEVELOPER]: [
    Permission.READ,
    Permission.WRITE,
    Permission.AGENT_READ,
    Permission.AGENT_EXECUTE,
    Permission.CAD_UPLOAD,
    Permission.CAD_ANALYZE,
    Permission.CAD_HISTORY,
    Permission.POSTER_CREATE,
    Permission.POSTER_READ,
    Permission.POSTER_UPDATE,
    Permission.POSTER_DELETE,
    Permission.FILE_UPLOAD,
    Permission.FILE_READ,
    Permission.REPORT_VIEW,
    Permission.CODE_REVIEW,
    Permission.DEBUG_TOOLS,
    Permission.SYSTEM_LOGS
  ]
};

export class PermissionSystem {
  private rules: Map<string, PermissionRule> = new Map();
  private cacheEnabled = true;
  private permissionCache = new Map<string, { result: PermissionResult; expiry: number }>();
  private cacheExpireTime = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 初始化默认权限规则
   */
  private initializeDefaultRules(): void {
    // 资源所有者规则
    this.addRule({
      id: 'resource-owner-access',
      name: '资源所有者访问权限',
      description: '用户可以访问自己创建的资源',
      priority: 100,
      enabled: true,
      conditions: {},
      effect: 'ALLOW',
      validator: async (context) => {
        return context.resource?.ownerId === context.user.id;
      }
    });

    // 管理员全权限规则
    this.addRule({
      id: 'admin-full-access',
      name: '管理员全权限',
      description: '管理员和超级管理员拥有所有权限',
      priority: 200,
      enabled: true,
      conditions: {
        roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SYSTEM]
      },
      effect: 'ALLOW'
    });

    // 时间限制规则
    this.addRule({
      id: 'business-hours-only',
      name: '工作时间限制',
      description: '某些操作仅在工作时间允许',
      priority: 50,
      enabled: false, // 默认禁用
      conditions: {
        permissions: [Permission.SYSTEM_CONFIG, Permission.USER_DELETE],
        timeConstraints: {
          startTime: '09:00',
          endTime: '18:00',
          allowedDays: [1, 2, 3, 4, 5] // 周一到周五
        }
      },
      effect: 'DENY',
      validator: async (context) => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();
        
        const rule = this.rules.get('business-hours-only');
        if (!rule?.conditions.timeConstraints) {return false;}
        
        const { startTime, endTime, allowedDays } = rule.conditions.timeConstraints;
        
        if (allowedDays && !allowedDays.includes(currentDay)) {
          return true; // 非工作日，拒绝访问
        }
        
        if (startTime && endTime) {
          const start = parseInt(startTime.split(':')[0]);
          const end = parseInt(endTime.split(':')[0]);
          
          if (currentHour < start || currentHour >= end) {
            return true; // 非工作时间，拒绝访问
          }
        }
        
        return false; // 工作时间，允许访问
      }
    });

    // 敏感操作IP限制
    this.addRule({
      id: 'sensitive-operation-ip-restriction',
      name: '敏感操作IP限制',
      description: '敏感操作需要来自受信任的IP地址',
      priority: 150,
      enabled: true,
      conditions: {
        permissions: [
          Permission.USER_DELETE,
          Permission.SYSTEM_CONFIG,
          Permission.SECURITY_AUDIT,
          Permission.SECURITY_SCAN
        ],
        ipWhitelist: [
          '127.0.0.1',
          '::1',
          '10.0.0.0/8',
          '172.16.0.0/12',
          '192.168.0.0/16'
        ]
      },
      effect: 'DENY',
      validator: async (context) => {
        const clientIp = context.environment?.ipAddress;
        if (!clientIp) {return true;} // 无IP信息，拒绝访问
        
        const rule = this.rules.get('sensitive-operation-ip-restriction');
        const allowedIps = rule?.conditions.ipWhitelist || [];
        
        return !this.isIpInWhitelist(clientIp, allowedIps);
      }
    });

    // 文件大小限制规则
    this.addRule({
      id: 'file-size-limit',
      name: '文件大小限制',
      description: '根据用户角色限制文件上传大小',
      priority: 75,
      enabled: true,
      conditions: {
        permissions: [Permission.FILE_UPLOAD, Permission.CAD_UPLOAD]
      },
      effect: 'DENY',
      validator: async (context) => {
        const fileSize = context.resource?.attributes?.fileSize as number;
        if (!fileSize) {return false;}
        
        const maxSizes: Record<UserRole, number> = {
          [UserRole.GUEST]: 5 * 1024 * 1024, // 5MB
          [UserRole.USER]: 50 * 1024 * 1024, // 50MB
          [UserRole.MODERATOR]: 500 * 1024 * 1024, // 500MB
          [UserRole.ADMIN]: 1024 * 1024 * 1024, // 1GB
          [UserRole.SUPER_ADMIN]: Infinity,
          [UserRole.SYSTEM]: Infinity,
          [UserRole.DEVELOPER]: 2 * 1024 * 1024 * 1024 // 2GB
        };
        
        const maxSize = maxSizes[context.user.role] || maxSizes[UserRole.USER];
        return fileSize > maxSize;
      }
    });

    logger.info(`已初始化 ${this.rules.size} 个权限规则`);
  }

  /**
   * 添加权限规则
   */
  addRule(rule: PermissionRule): void {
    this.rules.set(rule.id, rule);
    this.clearCache(); // 清除缓存
    logger.info(`添加权限规则: ${rule.name} (${rule.id})`);
  }

  /**
   * 检查权限
   */
  async checkPermission(context: PermissionContext): Promise<PermissionResult> {
    const cacheKey = this.generateCacheKey(context);
    
    // 检查缓存
    if (this.cacheEnabled) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        logger.debug('权限检查命中缓存', { 
          userId: context.user.id,
          action: context.action,
          granted: cached.result.granted 
        });
        return cached.result;
      }
    }

    const result = await this.evaluatePermission(context);
    
    // 缓存结果
    if (this.cacheEnabled) {
      this.permissionCache.set(cacheKey, {
        result,
        expiry: Date.now() + this.cacheExpireTime
      });
    }

    logger.info('权限检查完成', {
      userId: context.user.id,
      userRole: context.user.role,
      action: context.action,
      resourceType: context.resource?.type,
      granted: result.granted,
      reason: result.reason,
      appliedRules: result.appliedRules
    });

    return result;
  }

  /**
   * 评估权限
   */
  private async evaluatePermission(context: PermissionContext): Promise<PermissionResult> {
    const appliedRules: string[] = [];
    const suggestions: string[] = [];
    let finalDecision = false;
    let reason = '默认拒绝访问';

    try {
      // 1. 检查用户是否具有基础权限
      const userPermissions = this.getUserPermissions(context.user.role);
      if (!userPermissions.includes(context.action)) {
        return {
          granted: false,
          reason: `用户角色 ${context.user.role} 不具有权限 ${context.action}`,
          appliedRules: ['role-based-check'],
          suggestions: ['请联系管理员提升您的权限级别']
        };
      }

      // 2. 按优先级排序规则
      const sortedRules = Array.from(this.rules.values())
        .filter(rule => rule.enabled)
        .sort((a, b) => b.priority - a.priority);

      // 3. 逐个评估规则
      for (const rule of sortedRules) {
        const isApplicable = await this.isRuleApplicable(rule, context);
        
        if (isApplicable) {
          appliedRules.push(rule.id);
          
          if (rule.effect === 'DENY') {
            return {
              granted: false,
              reason: `被规则拒绝: ${rule.name}`,
              appliedRules,
              suggestions: this.generateSuggestions(rule, context),
              details: {
                ruleId: rule.id,
                ruleName: rule.name,
                ruleDescription: rule.description
              }
            };
          } else if (rule.effect === 'ALLOW') {
            finalDecision = true;
            reason = `被规则允许: ${rule.name}`;
            // 继续检查其他规则，因为拒绝规则优先级更高
          }
        }
      }

      // 4. 如果没有明确的ALLOW规则，但用户有基础权限，则允许
      if (!finalDecision) {
        finalDecision = true;
        reason = '基于角色权限允许访问';
        appliedRules.push('role-based-permission');
      }

      return {
        granted: finalDecision,
        reason,
        appliedRules,
        suggestions
      };

    } catch (error) {
      logger.error('权限评估过程出错', {
        error: error instanceof Error ? error.message : String(error),
        context: {
          userId: context.user.id,
          action: context.action,
          resourceType: context.resource?.type
        }
      });

      return {
        granted: false,
        reason: '权限评估失败',
        appliedRules: ['error-handler'],
        suggestions: ['请稍后重试或联系系统管理员']
      };
    }
  }

  /**
   * 检查规则是否适用
   */
  private async isRuleApplicable(rule: PermissionRule, context: PermissionContext): Promise<boolean> {
    const { conditions } = rule;

    // 检查角色条件
    if (conditions.roles && !conditions.roles.includes(context.user.role)) {
      return false;
    }

    // 检查权限条件
    if (conditions.permissions && !conditions.permissions.includes(context.action)) {
      return false;
    }

    // 检查资源类型条件
    if (conditions.resourceTypes && context.resource && 
        !conditions.resourceTypes.includes(context.resource.type)) {
      return false;
    }

    // 检查IP白名单
    if (conditions.ipWhitelist && context.environment?.ipAddress) {
      const isInWhitelist = this.isIpInWhitelist(
        context.environment.ipAddress,
        conditions.ipWhitelist
      );
      if (!isInWhitelist) {
        return false;
      }
    }

    // 执行自定义验证器
    if (rule.validator) {
      try {
        return await rule.validator(context);
      } catch (error) {
        logger.error(`规则验证器执行失败: ${rule.id}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        return false;
      }
    }

    return true;
  }

  /**
   * 获取用户权限
   */
  private getUserPermissions(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * 检查IP是否在白名单中
   */
  private isIpInWhitelist(ip: string, whitelist: string[]): boolean {
    // 简化的IP检查实现
    return whitelist.some(allowedIp => {
      if (allowedIp.includes('/')) {
        // CIDR格式处理 (简化实现)
        const [network, mask] = allowedIp.split('/');
        return ip.startsWith(network.split('.').slice(0, parseInt(mask) / 8).join('.'));
      }
      return ip === allowedIp;
    });
  }

  /**
   * 生成建议
   */
  private generateSuggestions(rule: PermissionRule, context: PermissionContext): string[] {
    const suggestions: string[] = [];

    if (rule.conditions.roles) {
      const requiredRoles = rule.conditions.roles.join(', ');
      suggestions.push(`需要以下角色之一: ${requiredRoles}`);
    }

    if (rule.conditions.timeConstraints) {
      suggestions.push('请在工作时间内进行此操作');
    }

    if (rule.conditions.ipWhitelist) {
      suggestions.push('请从受信任的网络环境访问');
    }

    return suggestions;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(context: PermissionContext): string {
    const key = [
      context.user.id,
      context.user.role,
      context.action,
      context.resource?.type || 'none',
      context.resource?.id || 'none',
      context.resource?.ownerId || 'none'
    ].join(':');
    
    return Buffer.from(key).toString('base64');
  }

  /**
   * 清除权限缓存
   */
  clearCache(): void {
    this.permissionCache.clear();
    logger.info('权限缓存已清除');
  }

  /**
   * 批量检查权限
   */
  async checkMultiplePermissions(
    contexts: PermissionContext[]
  ): Promise<Map<string, PermissionResult>> {
    const results = new Map<string, PermissionResult>();
    
    const promises = contexts.map(async (context, index) => {
      const result = await this.checkPermission(context);
      results.set(index.toString(), result);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 获取用户所有权限
   */
  getUserAllPermissions(role: UserRole): Permission[] {
    return [...this.getUserPermissions(role)];
  }

  /**
   * 获取统计信息
   */
  getStatistics(): Record<string, unknown> {
    const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled);
    const rulesByEffect = {
      allow: enabledRules.filter(r => r.effect === 'ALLOW').length,
      deny: enabledRules.filter(r => r.effect === 'DENY').length
    };

    return {
      totalRules: this.rules.size,
      enabledRules: enabledRules.length,
      rulesByEffect,
      cacheSize: this.permissionCache.size,
      cacheEnabled: this.cacheEnabled
    };
  }
}

// 导出默认实例
export const permissionSystem = new PermissionSystem();

// 权限检查装饰器
export function requirePermission(permission: Permission, resourceType?: ResourceType) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args[0];
      const user = req.user;

      if (!user) {
        throw new AppError(
          ErrorType.AUTHENTICATION,
          ErrorCode.UNAUTHORIZED,
          '用户未认证',
          401,
          ErrorSeverity.MEDIUM
        );
      }

      const context: PermissionContext = {
        user: {
          id: user.id,
          role: user.role,
          permissions: permissionSystem.getUserAllPermissions(user.role)
        },
        action: permission,
        environment: {
          ipAddress: req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress,
          userAgent: req.headers?.['user-agent'],
          timestamp: new Date().toISOString()
        }
      };

      if (resourceType) {
        context.resource = { type: resourceType };
      }

      const result = await permissionSystem.checkPermission(context);

      if (!result.granted) {
        throw new AppError(
          ErrorType.AUTHORIZATION,
          ErrorCode.FORBIDDEN,
          result.reason,
          403,
          ErrorSeverity.MEDIUM
        );
      }

      return await method.apply(this, args);
    };
  };
}

// 导出相关类型和枚举
export type { PermissionContext, PermissionResult, PermissionRule };