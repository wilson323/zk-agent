/**
 * 多智能体上下文管理系统
 * 实现智能体间的上下文共享、状态同步和协作记忆
 * 支持分布式上下文存储、实时同步和智能缓存
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// 上下文类型
export enum ContextType {
  GLOBAL = 'global',
  SESSION = 'session',
  TASK = 'task',
  AGENT = 'agent',
  TOOL = 'tool',
  WORKFLOW = 'workflow',
  TEMPORARY = 'temporary'
}

// 上下文范围
export enum ContextScope {
  PUBLIC = 'public',
  PRIVATE = 'private',
  SHARED = 'shared',
  RESTRICTED = 'restricted'
}

// 上下文访问级别
export enum AccessLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner'
}

// 上下文数据
export interface ContextData {
  id: string;
  type: ContextType;
  scope: ContextScope;
  ownerId: string;
  data: any;
  metadata: ContextMetadata;
  permissions: ContextPermissions;
  lifecycle: ContextLifecycle;
  relationships: ContextRelationship[];
  version: number;
  checksum: string;
}

// 上下文元数据
export interface ContextMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
  priority: number;
  size: number;
  encoding: string;
  mimeType?: string;
  language?: string;
  createdAt: number;
  updatedAt: number;
  accessedAt: number;
  expiresAt?: number;
  source: string;
  dependencies: string[];
}

// 上下文权限
export interface ContextPermissions {
  owner: string;
  readers: string[];
  writers: string[];
  admins: string[];
  publicRead: boolean;
  publicWrite: boolean;
  inheritPermissions: boolean;
  accessControl: AccessControlRule[];
}

// 访问控制规则
export interface AccessControlRule {
  id: string;
  type: 'allow' | 'deny';
  principal: string; // agent ID, role, or group
  action: AccessLevel;
  resource: string; // context path or pattern
  condition?: string; // conditional expression
  priority: number;
}

// 上下文生命周期
export interface ContextLifecycle {
  status: 'active' | 'inactive' | 'archived' | 'deleted';
  ttl?: number; // time to live in milliseconds
  autoCleanup: boolean;
  backupEnabled: boolean;
  versioningEnabled: boolean;
  maxVersions: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

// 上下文关系
export interface ContextRelationship {
  id: string;
  type: 'parent' | 'child' | 'sibling' | 'reference' | 'dependency';
  targetId: string;
  strength: number; // 0-1, relationship strength
  bidirectional: boolean;
  metadata?: Record<string, any>;
}

// 上下文查询
export interface ContextQuery {
  type?: ContextType[];
  scope?: ContextScope[];
  ownerId?: string[];
  tags?: string[];
  category?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  textSearch?: string;
  relationships?: {
    type: string;
    targetId: string;
  }[];
  sortBy?: 'createdAt' | 'updatedAt' | 'accessedAt' | 'priority' | 'size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// 上下文更新
export interface ContextUpdate {
  data?: any;
  metadata?: Partial<ContextMetadata>;
  permissions?: Partial<ContextPermissions>;
  lifecycle?: Partial<ContextLifecycle>;
  relationships?: {
    add?: ContextRelationship[];
    remove?: string[];
    update?: ContextRelationship[];
  };
}

// 上下文同步配置
export interface SyncConfig {
  enabled: boolean;
  mode: 'realtime' | 'batch' | 'manual';
  interval?: number; // for batch mode
  conflictResolution: 'latest' | 'merge' | 'manual';
  compression: boolean;
  encryption: boolean;
  retryAttempts: number;
  timeout: number;
}

// 上下文事件
export interface ContextEvent {
  id: string;
  type: 'created' | 'updated' | 'deleted' | 'accessed' | 'shared' | 'synchronized';
  contextId: string;
  agentId: string;
  timestamp: number;
  data?: any;
  metadata?: Record<string, any>;
}

// 上下文统计
export interface ContextStats {
  total: number;
  byType: Record<ContextType, number>;
  byScope: Record<ContextScope, number>;
  totalSize: number;
  averageSize: number;
  accessFrequency: Record<string, number>;
  topAgents: { agentId: string; accessCount: number; }[];
  recentActivity: ContextEvent[];
}

// 上下文缓存配置
export interface CacheConfig {
  enabled: boolean;
  maxSize: number; // in MB
  ttl: number; // in milliseconds
  strategy: 'lru' | 'lfu' | 'fifo' | 'adaptive';
  compression: boolean;
  persistToDisk: boolean;
  warmupOnStart: boolean;
}

// 上下文索引
export interface ContextIndex {
  id: string;
  type: 'text' | 'semantic' | 'metadata' | 'relationship';
  fields: string[];
  options: {
    caseSensitive?: boolean;
    stemming?: boolean;
    stopWords?: string[];
    synonyms?: Record<string, string[]>;
    weights?: Record<string, number>;
  };
  status: 'building' | 'ready' | 'updating' | 'error';
  lastUpdated: number;
}

// 上下文备份
export interface ContextBackup {
  id: string;
  contextId: string;
  version: number;
  data: any;
  metadata: ContextMetadata;
  timestamp: number;
  size: number;
  checksum: string;
  compressed: boolean;
  encrypted: boolean;
}

/**
 * 多智能体上下文管理器
 */
export class MultiAgentContextManager extends EventEmitter {
  private contexts: Map<string, ContextData> = new Map();
  private contextVersions: Map<string, ContextBackup[]> = new Map();
  private contextEvents: ContextEvent[] = [];
  private contextIndexes: Map<string, ContextIndex> = new Map();
  private accessLog: Map<string, number> = new Map();

  private storage: IContextStorage;
  private cache: IContextCache;
  private synchronizer: IContextSynchronizer;
  private indexer: IContextIndexer;
  private encryptor: IContextEncryptor;
  private compressor: IContextCompressor;
  private permissionManager: PermissionManager;
  private relationshipManager: RelationshipManager;
  private lifecycleManager: LifecycleManager;
  private metricsCollector: MetricsCollector;

  private syncConfig: SyncConfig;
  private cacheConfig: CacheConfig;
  private syncInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    storage: IContextStorage,
    syncConfig: SyncConfig = this.getDefaultSyncConfig(),
    cacheConfig: CacheConfig = this.getDefaultCacheConfig()
  ) {
    super();

    this.storage = storage;
    this.syncConfig = syncConfig;
    this.cacheConfig = cacheConfig;

    this.cache = new ContextCache(cacheConfig);
    this.synchronizer = new ContextSynchronizer(syncConfig);
    this.indexer = new ContextIndexer();
    this.encryptor = new ContextEncryptor();
    this.compressor = new ContextCompressor();
    this.permissionManager = new PermissionManager();
    this.relationshipManager = new RelationshipManager();
    this.lifecycleManager = new LifecycleManager();
    this.metricsCollector = new MetricsCollector();

    this.initializeSystem();
  }

  /**
   * 初始化系统
   */
  private async initializeSystem(): Promise<void> {
    try {
      // 加载持久化上下文
      await this.loadPersistedContexts();

      // 初始化索引
      await this.initializeIndexes();

      // 启动同步
      if (this.syncConfig.enabled) {
        this.startSynchronization();
      }

      // 启动清理任务
      this.startCleanupTasks();

      // 预热缓存
      if (this.cacheConfig.warmupOnStart) {
        await this.warmupCache();
      }

      this.emit('systemInitialized');

    } catch (error) {
      this.emit('systemInitializationError', error);
      throw error;
    }
  }

  /**
   * 创建上下文
   */
  public async createContext(
    type: ContextType,
    scope: ContextScope,
    ownerId: string,
    data: any,
    metadata?: Partial<ContextMetadata>,
    permissions?: Partial<ContextPermissions>
  ): Promise<ContextData> {
    const contextId = this.generateContextId();
    const now = Date.now();

    const context: ContextData = {
      id: contextId,
      type,
      scope,
      ownerId,
      data,
      metadata: {
        title: metadata?.title || `Context ${contextId}`,
        description: metadata?.description || '',
        tags: metadata?.tags || [],
        category: metadata?.category || 'general',
        priority: metadata?.priority || 0,
        size: this.calculateDataSize(data),
        encoding: 'utf-8',
        createdAt: now,
        updatedAt: now,
        accessedAt: now,
        source: metadata?.source || 'system',
        dependencies: metadata?.dependencies || [],
        ...metadata
      },
      permissions: {
        owner: ownerId,
        readers: permissions?.readers || [],
        writers: permissions?.writers || [],
        admins: permissions?.admins || [],
        publicRead: permissions?.publicRead || false,
        publicWrite: permissions?.publicWrite || false,
        inheritPermissions: permissions?.inheritPermissions || false,
        accessControl: permissions?.accessControl || [],
        ...permissions
      },
      lifecycle: {
        status: 'active',
        autoCleanup: true,
        backupEnabled: true,
        versioningEnabled: true,
        maxVersions: 10,
        compressionEnabled: false,
        encryptionEnabled: false
      },
      relationships: [],
      version: 1,
      checksum: await this.calculateChecksum(data)
    };

    // 存储上下文
    this.contexts.set(contextId, context);

    // 缓存上下文
    await this.cache.set(contextId, context);

    // 持久化存储
    await this.storage.save(context);

    // 创建索引
    await this.indexer.index(context);

    // 记录事件
    this.recordEvent({
      id: this.generateEventId(),
      type: 'created',
      contextId,
      agentId: ownerId,
      timestamp: now,
      data: { type, scope }
    });

    // 收集指标
    this.metricsCollector.recordContextCreation(context);

    this.emit('contextCreated', context);
    return context;
  }

  /**
   * 获取上下文
   */
  public async getContext(
    contextId: string,
    agentId: string,
    includeData: boolean = true
  ): Promise<ContextData | null> {
    try {
      // 检查缓存
      let context = await this.cache.get(contextId);

      if (!context) {
        // 从内存获取
        context = this.contexts.get(contextId);

        if (!context) {
          // 从存储加载
          context = await this.storage.load(contextId);
          if (context) {
            this.contexts.set(contextId, context);
          }
        }

        if (context) {
          // 更新缓存
          await this.cache.set(contextId, context);
        }
      }

      if (!context) {
        return null;
      }

      // 检查权限
      if (!this.permissionManager.hasAccess(context, agentId, AccessLevel.read)) {
        throw new Error(`Access denied for context ${contextId}`);
      }

      // 更新访问时间
      context.metadata.accessedAt = Date.now();
      this.accessLog.set(contextId, (this.accessLog.get(contextId) || 0) + 1);

      // 记录事件
      this.recordEvent({
        id: this.generateEventId(),
        type: 'accessed',
        contextId,
        agentId,
        timestamp: Date.now()
      });

      // 收集指标
      this.metricsCollector.recordContextAccess(context, agentId);

      // 返回上下文（可选择是否包含数据）
      if (!includeData) {
        const { data, ...contextWithoutData } = context;
        return contextWithoutData as ContextData;
      }

      return context;

    } catch (error) {
      this.emit('contextAccessError', contextId, agentId, error);
      throw error;
    }
  }

  /**
   * 更新上下文
   */
  public async updateContext(
    contextId: string,
    agentId: string,
    update: ContextUpdate
  ): Promise<ContextData> {
    const context = await this.getContext(contextId, agentId, true);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    // 检查写权限
    if (!this.permissionManager.hasAccess(context, agentId, AccessLevel.WRITE)) {
      throw new Error(`Write access denied for context ${contextId}`);
    }

    // 创建备份（如果启用版本控制）
    if (context.lifecycle.versioningEnabled) {
      await this.createBackup(context);
    }

    // 应用更新
    const updatedContext = { ...context };

    if (update.data !== undefined) {
      updatedContext.data = update.data;
      updatedContext.metadata.size = this.calculateDataSize(update.data);
      updatedContext.checksum = await this.calculateChecksum(update.data);
    }

    if (update.metadata) {
      updatedContext.metadata = { ...updatedContext.metadata, ...update.metadata };
    }

    if (update.permissions) {
      updatedContext.permissions = { ...updatedContext.permissions, ...update.permissions };
    }

    if (update.lifecycle) {
      updatedContext.lifecycle = { ...updatedContext.lifecycle, ...update.lifecycle };
    }

    if (update.relationships) {
      updatedContext.relationships = this.relationshipManager.applyRelationshipUpdates(
        updatedContext.relationships,
        update.relationships
      );
    }

    updatedContext.version++;
    updatedContext.metadata.updatedAt = Date.now();

    // 存储更新
    this.contexts.set(contextId, updatedContext);
    await this.cache.set(contextId, updatedContext);
    await this.storage.save(updatedContext);

    // 更新索引
    await this.indexer.update(updatedContext);

    // 记录事件
    this.recordEvent({
      id: this.generateEventId(),
      type: 'updated',
      contextId,
      agentId,
      timestamp: Date.now(),
      data: update
    });

    // 收集指标
    this.metricsCollector.recordContextUpdate(updatedContext, agentId);

    this.emit('contextUpdated', updatedContext, context);
    return updatedContext;
  }

  /**
   * 删除上下文
   */
  public async deleteContext(contextId: string, agentId: string): Promise<boolean> {
    const context = await this.getContext(contextId, agentId, false);
    if (!context) {
      return false;
    }

    // 检查管理员权限
    if (!this.permissionManager.hasAccess(context, agentId, AccessLevel.ADMIN)) {
      throw new Error(`Admin access required to delete context ${contextId}`);
    }

    // 软删除或硬删除
    if (context.lifecycle.backupEnabled) {
      // 软删除：标记为已删除
      context.lifecycle.status = 'deleted';
      await this.updateContext(contextId, agentId, { lifecycle: context.lifecycle });
    } else {
      // 硬删除：完全移除
      this.contexts.delete(contextId);
      await this.cache.delete(contextId);
      await this.storage.delete(contextId);
      await this.indexer.remove(contextId);

      // 删除版本历史
      this.contextVersions.delete(contextId);
    }

    // 记录事件
    this.recordEvent({
      id: this.generateEventId(),
      type: 'deleted',
      contextId,
      agentId,
      timestamp: Date.now()
    });

    // 收集指标
    this.metricsCollector.recordContextDeletion(context, agentId);

    this.emit('contextDeleted', contextId, agentId);
    return true;
  }

  /**
   * 查询上下文
   */
  public async queryContexts(
    query: ContextQuery,
    agentId: string
  ): Promise<ContextData[]> {
    try {
      // 使用索引进行快速查询
      let results = await this.indexer.search(query);

      // 过滤权限
      results = results.filter(context =>
        this.permissionManager.hasAccess(context, agentId, AccessLevel.read)
      );

      // 应用排序和分页
      if (query.sortBy) {
        results = this.sortContexts(results, query.sortBy, query.sortOrder || 'desc');
      }

      if (query.offset || query.limit) {
        const start = query.offset || 0;
        const end = query.limit ? start + query.limit : undefined;
        results = results.slice(start, end);
      }

      // 收集指标
      this.metricsCollector.recordContextQuery(query, results.length, agentId);

      return results;

    } catch (error) {
      this.emit('contextQueryError', query, agentId, error);
      throw error;
    }
  }

  /**
   * 共享上下文
   */
  public async shareContext(
    contextId: string,
    ownerId: string,
    targetAgentId: string,
    accessLevel: AccessLevel,
    expiresAt?: number
  ): Promise<boolean> {
    const context = await this.getContext(contextId, ownerId, false);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    // 检查所有者权限
    if (!this.permissionManager.hasAccess(context, ownerId, AccessLevel.ADMIN)) {
      throw new Error(`Admin access required to share context ${contextId}`);
    }

    // 更新权限
    const permissions = { ...context.permissions };

    switch (accessLevel) {
      case AccessLevel.read:
        if (!permissions.readers.includes(targetAgentId)) {
          permissions.readers.push(targetAgentId);
        }
        break;
      case AccessLevel.WRITE:
        if (!permissions.writers.includes(targetAgentId)) {
          permissions.writers.push(targetAgentId);
        }
        break;
      case AccessLevel.ADMIN:
        if (!permissions.admins.includes(targetAgentId)) {
          permissions.admins.push(targetAgentId);
        }
        break;
    }

    // 添加访问控制规则（如果有过期时间）
    if (expiresAt) {
      permissions.accessControl.push({
        id: this.generateRuleId(),
        type: 'allow',
        principal: targetAgentId,
        action: accessLevel,
        resource: contextId,
        condition: `timestamp < ${expiresAt}`,
        priority: 100
      });
    }

    await this.updateContext(contextId, ownerId, { permissions });

    // 记录事件
    this.recordEvent({
      id: this.generateEventId(),
      type: 'shared',
      contextId,
      agentId: ownerId,
      timestamp: Date.now(),
      data: { targetAgentId, accessLevel, expiresAt }
    });

    this.emit('contextShared', contextId, ownerId, targetAgentId, accessLevel);
    return true;
  }

  /**
   * 同步上下文
   */
  public async synchronizeContext(
    contextId: string,
    agentId: string
  ): Promise<boolean> {
    try {
      const context = await this.getContext(contextId, agentId, true);
      if (!context) {
        return false;
      }

      await this.synchronizer.sync(context);

      // 记录事件
      this.recordEvent({
        id: this.generateEventId(),
        type: 'synchronized',
        contextId,
        agentId,
        timestamp: Date.now()
      });

      this.emit('contextSynchronized', contextId, agentId);
      return true;

    } catch (error) {
      this.emit('contextSyncError', contextId, agentId, error);
      return false;
    }
  }

  /**
   * 获取上下文关系
   */
  public async getContextRelationships(
    contextId: string,
    agentId: string,
    relationshipType?: string
  ): Promise<ContextRelationship[]> {
    const context = await this.getContext(contextId, agentId, false);
    if (!context) {
      return [];
    }

    let relationships = context.relationships;

    if (relationshipType) {
      relationships = relationships.filter(r => r.type === relationshipType);
    }

    return relationships;
  }

  /**
   * 创建上下文关系
   */
  public async createContextRelationship(
    sourceId: string,
    targetId: string,
    type: string,
    agentId: string,
    strength: number = 1.0,
    bidirectional: boolean = false
  ): Promise<boolean> {
    const sourceContext = await this.getContext(sourceId, agentId, false);
    const targetContext = await this.getContext(targetId, agentId, false);

    if (!sourceContext || !targetContext) {
      return false;
    }

    // 检查写权限
    if (!this.permissionManager.hasAccess(sourceContext, agentId, AccessLevel.WRITE)) {
      throw new Error(`Write access required for source context ${sourceId}`);
    }

    const relationship: ContextRelationship = {
      id: this.generateRelationshipId(),
      type,
      targetId,
      strength,
      bidirectional
    };

    // 添加关系到源上下文
    await this.updateContext(sourceId, agentId, {
      relationships: {
        add: [relationship]
      }
    });

    // 如果是双向关系，也添加到目标上下文
    if (bidirectional && this.permissionManager.hasAccess(targetContext, agentId, AccessLevel.WRITE)) {
      const reverseRelationship: ContextRelationship = {
        id: this.generateRelationshipId(),
        type,
        targetId: sourceId,
        strength,
        bidirectional: true
      };

      await this.updateContext(targetId, agentId, {
        relationships: {
          add: [reverseRelationship]
        }
      });
    }

    this.emit('relationshipCreated', sourceId, targetId, type, agentId);
    return true;
  }

  /**
   * 获取上下文统计
   */
  public getContextStats(): ContextStats {
    const contexts = Array.from(this.contexts.values());

    const stats: ContextStats = {
      total: contexts.length,
      byType: {} as Record<ContextType, number>,
      byScope: {} as Record<ContextScope, number>,
      totalSize: 0,
      averageSize: 0,
      accessFrequency: Object.fromEntries(this.accessLog),
      topAgents: [],
      recentActivity: this.contextEvents.slice(-10)
    };

    // 统计类型和范围
    for (const type of Object.values(ContextType)) {
      stats.byType[type] = contexts.filter(c => c.type === type).length;
    }

    for (const scope of Object.values(ContextScope)) {
      stats.byScope[scope] = contexts.filter(c => c.scope === scope).length;
    }

    // 计算大小统计
    stats.totalSize = contexts.reduce((sum, c) => sum + c.metadata.size, 0);
    stats.averageSize = contexts.length > 0 ? stats.totalSize / contexts.length : 0;

    // 计算顶级智能体
    const agentAccess = new Map<string, number>();
    contexts.forEach(c => {
      const count = agentAccess.get(c.ownerId) || 0;
      agentAccess.set(c.ownerId, count + (this.accessLog.get(c.id) || 0));
    });

    stats.topAgents = Array.from(agentAccess.entries())
      .map(([agentId, accessCount]) => ({ agentId, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return stats;
  }

  /**
   * 清理过期上下文
   */
  public async cleanupExpiredContexts(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [contextId, context] of this.contexts.entries()) {
      if (context.metadata.expiresAt && context.metadata.expiresAt < now) {
        try {
          await this.deleteContext(contextId, 'system');
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup context ${contextId}:`, error);
        }
      }
    }

    this.emit('contextsCleanedUp', cleanedCount);
    return cleanedCount;
  }

  /**
   * 导出上下文
   */
  public async exportContext(
    contextId: string,
    agentId: string,
    format: 'json' | 'binary' = 'json'
  ): Promise<any> {
    const context = await this.getContext(contextId, agentId, true);
    if (!context) {
      throw new Error(`Context not found: ${contextId}`);
    }

    if (format === 'json') {
      return JSON.stringify(context, null, 2);
    } else {
      // 二进制格式导出
      return Buffer.from(JSON.stringify(context));
    }
  }

  /**
   * 导入上下文
   */
  public async importContext(
    data: any,
    agentId: string,
    overwrite: boolean = false
  ): Promise<ContextData> {
    let contextData: ContextData;

    if (typeof data === 'string') {
      contextData = JSON.parse(data);
    } else if (Buffer.isBuffer(data)) {
      contextData = JSON.parse(data.toString());
    } else {
      contextData = data;
    }

    // 验证上下文数据
    if (!this.validateContextData(contextData)) {
      throw new Error('Invalid context data');
    }

    // 检查是否已存在
    const existingContext = this.contexts.get(contextData.id);
    if (existingContext && !overwrite) {
      throw new Error(`Context already exists: ${contextData.id}`);
    }

    // 更新所有者和时间戳
    contextData.ownerId = agentId;
    contextData.metadata.updatedAt = Date.now();

    // 存储上下文
    this.contexts.set(contextData.id, contextData);
    await this.cache.set(contextData.id, contextData);
    await this.storage.save(contextData);
    await this.indexer.index(contextData);

    this.emit('contextImported', contextData, agentId);
    return contextData;
  }

  // 辅助方法
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRelationshipId(): string {
    return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private async calculateChecksum(data: any): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private recordEvent(event: ContextEvent): void {
    this.contextEvents.push(event);

    // 保持事件历史在合理范围内
    if (this.contextEvents.length > 1000) {
      this.contextEvents = this.contextEvents.slice(-500);
    }

    this.emit('contextEvent', event);
  }

  private sortContexts(
    contexts: ContextData[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): ContextData[] {
    return contexts.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = a.metadata.createdAt;
          bValue = b.metadata.createdAt;
          break;
        case 'updatedAt':
          aValue = a.metadata.updatedAt;
          bValue = b.metadata.updatedAt;
          break;
        case 'accessedAt':
          aValue = a.metadata.accessedAt;
          bValue = b.metadata.accessedAt;
          break;
        case 'priority':
          aValue = a.metadata.priority;
          bValue = b.metadata.priority;
          break;
        case 'size':
          aValue = a.metadata.size;
          bValue = b.metadata.size;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  private validateContextData(data: any): boolean {
    return !!(data.id && data.type && data.scope && data.ownerId && data.metadata);
  }

  private getDefaultSyncConfig(): SyncConfig {
    return {
      enabled: true,
      mode: 'realtime',
      conflictResolution: 'latest',
      compression: true,
      encryption: false,
      retryAttempts: 3,
      timeout: 30000
    };
  }

  private getDefaultCacheConfig(): CacheConfig {
    return {
      enabled: true,
      maxSize: 100, // 100MB
      ttl: 3600000, // 1 hour
      strategy: 'lru',
      compression: true,
      persistToDisk: false,
      warmupOnStart: true
    };
  }

  private async loadPersistedContexts(): Promise<void> {
    // 从存储加载上下文的实现
  }

  private async initializeIndexes(): Promise<void> {
    // 初始化索引的实现
  }

  private startSynchronization(): void {
    if (this.syncConfig.mode === 'batch' && this.syncConfig.interval) {
      this.syncInterval = setInterval(() => {
        this.synchronizeAllContexts();
      }, this.syncConfig.interval);
    }
  }

  private startCleanupTasks(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredContexts();
    }, 3600000); // 每小时清理一次
  }

  private async warmupCache(): Promise<void> {
    // 预热缓存的实现
  }

  private async synchronizeAllContexts(): Promise<void> {
    // 同步所有上下文的实现
  }

  private async createBackup(context: ContextData): Promise<void> {
    const backup: ContextBackup = {
      id: this.generateEventId(),
      contextId: context.id,
      version: context.version,
      data: context.data,
      metadata: context.metadata,
      timestamp: Date.now(),
      size: context.metadata.size,
      checksum: context.checksum,
      compressed: false,
      encrypted: false
    };

    let backups = this.contextVersions.get(context.id) || [];
    backups.push(backup);

    // 保持版本数量在限制内
    if (backups.length > context.lifecycle.maxVersions) {
      backups = backups.slice(-context.lifecycle.maxVersions);
    }

    this.contextVersions.set(context.id, backups);
  }

  /**
   * 关闭系统
   */
  public async shutdown(): Promise<void> {
    // 停止定时任务
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 同步所有上下文
    await this.synchronizeAllContexts();

    // 清理资源
    await this.cache.clear();

    this.emit('systemShutdown');
  }
}

// 接口定义
export interface IContextStorage {
  save(context: ContextData): Promise<void>;
  load(contextId: string): Promise<ContextData | null>;
  delete(contextId: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface IContextCache {
  get(contextId: string): Promise<ContextData | null>;
  set(contextId: string, context: ContextData): Promise<void>;
  delete(contextId: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IContextSynchronizer {
  sync(context: ContextData): Promise<void>;
  syncAll(contexts: ContextData[]): Promise<void>;
}

export interface IContextIndexer {
  index(context: ContextData): Promise<void>;
  update(context: ContextData): Promise<void>;
  remove(contextId: string): Promise<void>;
  search(query: ContextQuery): Promise<ContextData[]>;
}

export interface IContextEncryptor {
  encrypt(data: any): Promise<any>;
  decrypt(data: any): Promise<any>;
}

export interface IContextCompressor {
  compress(data: any): Promise<any>;
  decompress(data: any): Promise<any>;
}

// 实现类
class ContextCache implements IContextCache {
  private cache: Map<string, { data: ContextData; timestamp: number; }> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  async get(contextId: string): Promise<ContextData | null> {
    const item = this.cache.get(contextId);
    if (item && Date.now() - item.timestamp < this.config.ttl) {
      return item.data;
    }
    this.cache.delete(contextId);
    return null;
  }

  async set(contextId: string, context: ContextData): Promise<void> {
    this.cache.set(contextId, {
      data: context,
      timestamp: Date.now()
    });

    // 检查缓存大小限制
    this.enforceSize();
  }

  async delete(contextId: string): Promise<void> {
    this.cache.delete(contextId);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private enforceSize(): void {
    // 简化的大小控制实现
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

class ContextSynchronizer implements IContextSynchronizer {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  async sync(context: ContextData): Promise<void> {
    // 同步实现
  }

  async syncAll(contexts: ContextData[]): Promise<void> {
    // 批量同步实现
  }
}

class ContextIndexer implements IContextIndexer {
  private indexes: Map<string, any> = new Map();

  async index(context: ContextData): Promise<void> {
    // 索引实现
  }

  async update(context: ContextData): Promise<void> {
    // 更新索引实现
  }

  async remove(contextId: string): Promise<void> {
    // 移除索引实现
  }

  async search(query: ContextQuery): Promise<ContextData[]> {
    // 搜索实现
    return [];
  }
}

class ContextEncryptor implements IContextEncryptor {
  async encrypt(data: any): Promise<any> {
    // 加密实现
    return data;
  }

  async decrypt(data: any): Promise<any> {
    // 解密实现
    return data;
  }
}

class ContextCompressor implements IContextCompressor {
  async compress(data: any): Promise<any> {
    // 压缩实现
    return data;
  }

  async decompress(data: any): Promise<any> {
    // 解压实现
    return data;
  }
}

class PermissionManager {
  hasAccess(context: ContextData, agentId: string, level: AccessLevel): boolean {
    // 权限检查实现
    if (context.ownerId === agentId) return true;
    if (context.permissions.publicRead && level === AccessLevel.read) return true;
    if (context.permissions.publicWrite && level === AccessLevel.WRITE) return true;

    switch (level) {
      case AccessLevel.read:
        return context.permissions.readers.includes(agentId);
      case AccessLevel.WRITE:
        return context.permissions.writers.includes(agentId);
      case AccessLevel.ADMIN:
        return context.permissions.admins.includes(agentId);
      default:
        return false;
    }
  }
}

class RelationshipManager {
  applyRelationshipUpdates(
    current: ContextRelationship[],
    updates: {
      add?: ContextRelationship[];
      remove?: string[];
      update?: ContextRelationship[];
    }
  ): ContextRelationship[] {
    let relationships = [...current];

    // 移除关系
    if (updates.remove) {
      relationships = relationships.filter(r => !updates.remove!.includes(r.id));
    }

    // 添加关系
    if (updates.add) {
      relationships.push(...updates.add);
    }

    // 更新关系
    if (updates.update) {
      updates.update.forEach(updatedRel => {
        const index = relationships.findIndex(r => r.id === updatedRel.id);
        if (index !== -1) {
          relationships[index] = updatedRel;
        }
      });
    }

    return relationships;
  }
}

class LifecycleManager {
  // 生命周期管理实现
}

class MetricsCollector {
  recordContextCreation(context: ContextData): void {
    // 记录创建指标
  }

  recordContextAccess(context: ContextData, agentId: string): void {
    // 记录访问指标
  }

  recordContextUpdate(context: ContextData, agentId: string): void {
    // 记录更新指标
  }

  recordContextDeletion(context: ContextData, agentId: string): void {
    // 记录删除指标
  }

  recordContextQuery(query: ContextQuery, resultCount: number, agentId: string): void {
    // 记录查询指标
  }
}

export {
  ContextCache,
  ContextSynchronizer,
  ContextIndexer,
  ContextEncryptor,
  ContextCompressor,
  PermissionManager,
  RelationshipManager,
  LifecycleManager,
  MetricsCollector
};