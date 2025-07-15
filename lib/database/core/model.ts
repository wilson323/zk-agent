/**
 * @file Database Model
 * @description 数据库模型基类
 */

import { EventEmitter } from 'events';
import { QueryBuilder, QueryBuilderFactory } from './query-builder';
import { DatabaseConnection, connectionManager } from './connection-manager';
import { Logger } from '../../utils/logger';
import { validateConfig } from '../../config/core/validation';
import { z } from 'zod';

/**
 * 模型配置
 */
export interface ModelConfig {
  tableName: string;
  primaryKey?: string;
  timestamps?: boolean;
  softDeletes?: boolean;
  connectionId?: string;
  schema?: z.ZodSchema;
  fillable?: string[];
  guarded?: string[];
  hidden?: string[];
  casts?: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'json'>;
}

/**
 * 模型关系类型
 */
export type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/**
 * 模型关系配置
 */
export interface RelationConfig {
  type: RelationType;
  model: typeof BaseModel;
  foreignKey?: string;
  localKey?: string;
  pivotTable?: string;
  pivotForeignKey?: string;
  pivotLocalKey?: string;
}

/**
 * 模型事件
 */
export type ModelEvent = 
  | 'creating' | 'created'
  | 'updating' | 'updated'
  | 'deleting' | 'deleted'
  | 'saving' | 'saved'
  | 'restoring' | 'restored';

/**
 * 模型属性
 */
export interface ModelAttributes {
  [key: string]: any;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  with?: string[];
  withTrashed?: boolean;
  onlyTrashed?: boolean;
}

/**
 * 分页结果
 */
export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 数据库模型基类
 */
export abstract class BaseModel extends EventEmitter {
  protected static config: ModelConfig;
  protected static relations: Map<string, RelationConfig> = new Map();
  protected static logger = new Logger('BaseModel');
  
  // 实例属性
  protected attributes: ModelAttributes = {};
  protected original: ModelAttributes = {};
  protected relations_cache: Map<string, any> = new Map();
  protected exists = false;
  protected wasRecentlyCreated = false;
  
  constructor(attributes: ModelAttributes = {}) {
    super();
    this.fill(attributes);
  }
  
  /**
   * 获取模型配置
   */
  static getConfig(): ModelConfig {
    if (!this.config) {
      throw new Error(`Model config not defined for ${this.name}`);
    }
    return this.config;
  }
  
  /**
   * 获取数据库连接
   */
  static getConnection(): DatabaseConnection {
    const config = this.getConfig();
    const connectionId = config.connectionId || 'default';
    return connectionManager.getConnection(connectionId);
  }
  
  /**
   * 创建查询构建器
   */
  static query<T extends BaseModel = any>(): QueryBuilder<T> {
    const config = this.getConfig();
    const connection = this.getConnection();
    return QueryBuilderFactory.table<T>(connection, config.tableName);
  }
  
  /**
   * 定义关系
   */
  static hasOne(model: typeof BaseModel, foreignKey?: string, localKey?: string): void {
    const relationName = model.name.toLowerCase();
    this.relations.set(relationName, {
      type: 'hasOne',
      model,
      foreignKey: foreignKey || `${this.name.toLowerCase()}_id`,
      localKey: localKey || this.getConfig().primaryKey || 'id',
    });
  }
  
  static hasMany(model: typeof BaseModel, foreignKey?: string, localKey?: string): void {
    const relationName = model.name.toLowerCase() + 's';
    this.relations.set(relationName, {
      type: 'hasMany',
      model,
      foreignKey: foreignKey || `${this.name.toLowerCase()}_id`,
      localKey: localKey || this.getConfig().primaryKey || 'id',
    });
  }
  
  static belongsTo(model: typeof BaseModel, foreignKey?: string, localKey?: string): void {
    const relationName = model.name.toLowerCase();
    this.relations.set(relationName, {
      type: 'belongsTo',
      model,
      foreignKey: foreignKey || `${model.name.toLowerCase()}_id`,
      localKey: localKey || model.getConfig().primaryKey || 'id',
    });
  }
  
  static belongsToMany(
    model: typeof BaseModel,
    pivotTable?: string,
    foreignKey?: string,
    localKey?: string
  ): void {
    const relationName = model.name.toLowerCase() + 's';
    this.relations.set(relationName, {
      type: 'belongsToMany',
      model,
      pivotTable: pivotTable || [this.name.toLowerCase(), model.name.toLowerCase()].sort().join('_'),
      pivotForeignKey: foreignKey || `${this.name.toLowerCase()}_id`,
      pivotLocalKey: localKey || `${model.name.toLowerCase()}_id`,
    });
  }
  
  /**
   * 查找所有记录
   */
  static async all<T extends BaseModel>(options?: QueryOptions): Promise<T[]> {
    let query = this.query<T>();
    
    if (options?.withTrashed && this.getConfig().softDeletes) {
      // 包含软删除记录
    } else if (options?.onlyTrashed && this.getConfig().softDeletes) {
      query = query.whereNotNull('deleted_at');
    } else if (this.getConfig().softDeletes) {
      query = query.whereNull('deleted_at');
    }
    
    const results = await query.get();
    return results.map(data => this.newFromBuilder(data));
  }
  
  /**
   * 根据主键查找记录
   */
  static async find<T extends BaseModel>(id: any, options?: QueryOptions): Promise<T | null> {
    const config = this.getConfig();
    const primaryKey = config.primaryKey || 'id';
    
    let query = this.query<T>().where(primaryKey, '=', id);
    
    if (options?.withTrashed && config.softDeletes) {
      // 包含软删除记录
    } else if (options?.onlyTrashed && config.softDeletes) {
      query = query.whereNotNull('deleted_at');
    } else if (config.softDeletes) {
      query = query.whereNull('deleted_at');
    }
    
    const result = await query.first();
    return result ? this.newFromBuilder(result) : null;
  }
  
  /**
   * 根据主键查找记录，不存在则抛出异常
   */
  static async findOrFail<T extends BaseModel>(id: any, options?: QueryOptions): Promise<T> {
    const result = await this.find<T>(id, options);
    
    if (!result) {
      throw new Error(`Model ${this.name} with id ${id} not found`);
    }
    
    return result;
  }
  
  /**
   * 根据条件查找第一条记录
   */
  static async where<T extends BaseModel>(column: string, operator: any, value?: any): Promise<QueryBuilder<T>> {
    return this.query<T>().where(column, operator, value);
  }
  
  /**
   * 创建新记录
   */
  static async create<T extends BaseModel>(attributes: ModelAttributes): Promise<T> {
    const instance = new this(attributes) as T;
    await instance.save();
    return instance;
  }
  
  /**
   * 批量创建记录
   */
  static async createMany<T extends BaseModel>(records: ModelAttributes[]): Promise<T[]> {
    const instances: T[] = [];
    
    for (const attributes of records) {
      const instance = await this.create<T>(attributes);
      instances.push(instance);
    }
    
    return instances;
  }
  
  /**
   * 更新或创建记录
   */
  static async updateOrCreate<T extends BaseModel>(
    conditions: ModelAttributes,
    attributes: ModelAttributes
  ): Promise<{ model: T; created: boolean }> {
    let query = this.query<T>();
    
    for (const [column, value] of Object.entries(conditions)) {
      query = query.where(column, '=', value);
    }
    
    const existing = await query.first();
    
    if (existing) {
      const instance = this.newFromBuilder(existing);
      instance.fill(attributes);
      await instance.save();
      return { model: instance, created: false };
    } else {
      const instance = await this.create<T>({ ...conditions, ...attributes });
      return { model: instance, created: true };
    }
  }
  
  /**
   * 分页查询
   */
  static async paginate<T extends BaseModel>(
    page: number = 1,
    perPage: number = 15,
    options?: QueryOptions
  ): Promise<PaginationResult<T>> {
    let query = this.query<T>();
    
    if (options?.withTrashed && this.getConfig().softDeletes) {
      // 包含软删除记录
    } else if (options?.onlyTrashed && this.getConfig().softDeletes) {
      query = query.whereNotNull('deleted_at');
    } else if (this.getConfig().softDeletes) {
      query = query.whereNull('deleted_at');
    }
    
    const total = await query.clone().count();
    const data = await query.paginate(page, perPage).get();
    
    const totalPages = Math.ceil(total / perPage);
    
    return {
      data: data.map(item => this.newFromBuilder(item)),
      total,
      page,
      perPage,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
  
  /**
   * 从查询结果创建模型实例
   */
  protected static newFromBuilder<T extends BaseModel>(attributes: ModelAttributes): T {
    const instance = new this(attributes) as T;
    instance.exists = true;
    instance.wasRecentlyCreated = false;
    instance.syncOriginal();
    return instance;
  }
  
  /**
   * 填充属性
   */
  fill(attributes: ModelAttributes): this {
    const config = (this.constructor as typeof BaseModel).getConfig();
    
    for (const [key, value] of Object.entries(attributes)) {
      if (this.isFillable(key)) {
        this.setAttribute(key, value);
      }
    }
    
    return this;
  }
  
  /**
   * 检查属性是否可填充
   */
  protected isFillable(key: string): boolean {
    const config = (this.constructor as typeof BaseModel).getConfig();
    
    if (config.fillable && config.fillable.length > 0) {
      return config.fillable.includes(key);
    }
    
    if (config.guarded && config.guarded.length > 0) {
      return !config.guarded.includes(key);
    }
    
    return true;
  }
  
  /**
   * 设置属性
   */
  setAttribute(key: string, value: any): void {
    const config = (this.constructor as typeof BaseModel).getConfig();
    
    // 类型转换
    if (config.casts && config.casts[key]) {
      value = this.castAttribute(key, value, config.casts[key]);
    }
    
    this.attributes[key] = value;
  }
  
  /**
   * 获取属性
   */
  getAttribute(key: string): any {
    return this.attributes[key];
  }
  
  /**
   * 类型转换
   */
  protected castAttribute(key: string, value: any, cast: string): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    switch (cast) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return value instanceof Date ? value : new Date(value);
      case 'json':
        return typeof value === 'string' ? JSON.parse(value) : value;
      default:
        return value;
    }
  }
  
  /**
   * 获取主键值
   */
  getKey(): any {
    const config = (this.constructor as typeof BaseModel).getConfig();
    const primaryKey = config.primaryKey || 'id';
    return this.getAttribute(primaryKey);
  }
  
  /**
   * 设置主键值
   */
  setKey(value: any): void {
    const config = (this.constructor as typeof BaseModel).getConfig();
    const primaryKey = config.primaryKey || 'id';
    this.setAttribute(primaryKey, value);
  }
  
  /**
   * 检查模型是否存在于数据库
   */
  isExists(): boolean {
    return this.exists;
  }
  
  /**
   * 检查模型是否刚创建
   */
  wasRecentlyCreated(): boolean {
    return this.wasRecentlyCreated;
  }
  
  /**
   * 检查属性是否已更改
   */
  isDirty(key?: string): boolean {
    if (key) {
      return this.attributes[key] !== this.original[key];
    }
    
    for (const [k, v] of Object.entries(this.attributes)) {
      if (v !== this.original[k]) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * 获取已更改的属性
   */
  getDirty(): ModelAttributes {
    const dirty: ModelAttributes = {};
    
    for (const [key, value] of Object.entries(this.attributes)) {
      if (value !== this.original[key]) {
        dirty[key] = value;
      }
    }
    
    return dirty;
  }
  
  /**
   * 同步原始属性
   */
  syncOriginal(): void {
    this.original = { ...this.attributes };
  }
  
  /**
   * 验证模型数据
   */
  validate(): { isValid: boolean; errors: string[] } {
    const config = (this.constructor as typeof BaseModel).getConfig();
    
    if (!config.schema) {
      return { isValid: true, errors: [] };
    }
    
    try {
      config.schema.parse(this.attributes);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }
      
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
      };
    }
  }
  
  /**
   * 保存模型
   */
  async save(): Promise<boolean> {
    const config = (this.constructor as typeof BaseModel).getConfig();
    
    // 验证数据
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // 触发事件
    await this.fireModelEvent('saving');
    
    if (this.exists) {
      await this.fireModelEvent('updating');
      await this.performUpdate();
      await this.fireModelEvent('updated');
    } else {
      await this.fireModelEvent('creating');
      await this.performInsert();
      await this.fireModelEvent('created');
    }
    
    await this.fireModelEvent('saved');
    
    this.syncOriginal();
    return true;
  }
  
  /**
   * 执行插入操作
   */
  protected async performInsert(): Promise<void> {
    const config = (this.constructor as typeof BaseModel).getConfig();
    const connection = (this.constructor as typeof BaseModel).getConnection();
    
    // 添加时间戳
    if (config.timestamps) {
      const now = new Date();
      this.setAttribute('created_at', now);
      this.setAttribute('updated_at', now);
    }
    
    const query = QueryBuilderFactory.table(connection, config.tableName);
    const result = await query.insert(this.attributes);
    
    // 设置主键（如果是自增主键）
    if (result && result.insertId) {
      const primaryKey = config.primaryKey || 'id';
      this.setAttribute(primaryKey, result.insertId);
    }
    
    this.exists = true;
    this.wasRecentlyCreated = true;
  }
  
  /**
   * 执行更新操作
   */
  protected async performUpdate(): Promise<void> {
    const config = (this.constructor as typeof BaseModel).getConfig();
    const connection = (this.constructor as typeof BaseModel).getConnection();
    const primaryKey = config.primaryKey || 'id';
    
    if (!this.getKey()) {
      throw new Error('Cannot update model without primary key');
    }
    
    const dirty = this.getDirty();
    
    if (Object.keys(dirty).length === 0) {
      return; // 没有更改
    }
    
    // 添加时间戳
    if (config.timestamps) {
      dirty.updated_at = new Date();
      this.setAttribute('updated_at', dirty.updated_at);
    }
    
    const query = QueryBuilderFactory.table(connection, config.tableName)
      .where(primaryKey, '=', this.getKey());
    
    await query.update(dirty);
  }
  
  /**
   * 删除模型
   */
  async delete(): Promise<boolean> {
    const config = (this.constructor as typeof BaseModel).getConfig();
    const connection = (this.constructor as typeof BaseModel).getConnection();
    const primaryKey = config.primaryKey || 'id';
    
    if (!this.exists || !this.getKey()) {
      return false;
    }
    
    await this.fireModelEvent('deleting');
    
    if (config.softDeletes) {
      // 软删除
      this.setAttribute('deleted_at', new Date());
      await this.save();
    } else {
      // 硬删除
      const query = QueryBuilderFactory.table(connection, config.tableName)
        .where(primaryKey, '=', this.getKey());
      
      await query.delete();
      this.exists = false;
    }
    
    await this.fireModelEvent('deleted');
    return true;
  }
  
  /**
   * 恢复软删除的模型
   */
  async restore(): Promise<boolean> {
    const config = (this.constructor as typeof BaseModel).getConfig();
    
    if (!config.softDeletes || !this.getAttribute('deleted_at')) {
      return false;
    }
    
    await this.fireModelEvent('restoring');
    
    this.setAttribute('deleted_at', null);
    await this.save();
    
    await this.fireModelEvent('restored');
    return true;
  }
  
  /**
   * 触发模型事件
   */
  protected async fireModelEvent(event: ModelEvent): Promise<void> {
    this.emit(event, this);
    
    // 调用对应的钩子方法
    const hookMethod = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    if (typeof (this as any)[hookMethod] === 'function') {
      await (this as any)[hookMethod]();
    }
  }
  
  /**
   * 转换为普通对象
   */
  toObject(): ModelAttributes {
    const config = (this.constructor as typeof BaseModel).getConfig();
    const result = { ...this.attributes };
    
    // 隐藏指定字段
    if (config.hidden) {
      for (const field of config.hidden) {
        delete result[field];
      }
    }
    
    return result;
  }
  
  /**
   * 转换为JSON
   */
  toJSON(): ModelAttributes {
    return this.toObject();
  }
  
  /**
   * 克隆模型
   */
  clone(): this {
    const cloned = new (this.constructor as any)(this.attributes);
    cloned.exists = false;
    cloned.wasRecentlyCreated = false;
    return cloned;
  }
}

/**
 * 模型装饰器
 */
export function Model(config: ModelConfig) {
  return function <T extends typeof BaseModel>(target: T): T {
    target.config = config;
    return target;
  };
}

/**
 * 关系装饰器
 */
export function HasOne(model: typeof BaseModel, foreignKey?: string, localKey?: string) {
  return function (target: any, propertyKey: string) {
    const relationName = propertyKey;
    (target.constructor as typeof BaseModel).relations.set(relationName, {
      type: 'hasOne',
      model,
      foreignKey: foreignKey || `${target.constructor.name.toLowerCase()}_id`,
      localKey: localKey || 'id',
    });
  };
}

export function HasMany(model: typeof BaseModel, foreignKey?: string, localKey?: string) {
  return function (target: any, propertyKey: string) {
    const relationName = propertyKey;
    (target.constructor as typeof BaseModel).relations.set(relationName, {
      type: 'hasMany',
      model,
      foreignKey: foreignKey || `${target.constructor.name.toLowerCase()}_id`,
      localKey: localKey || 'id',
    });
  };
}

export function BelongsTo(model: typeof BaseModel, foreignKey?: string, localKey?: string) {
  return function (target: any, propertyKey: string) {
    const relationName = propertyKey;
    (target.constructor as typeof BaseModel).relations.set(relationName, {
      type: 'belongsTo',
      model,
      foreignKey: foreignKey || `${model.name.toLowerCase()}_id`,
      localKey: localKey || 'id',
    });
  };
}

export function BelongsToMany(
  model: typeof BaseModel,
  pivotTable?: string,
  foreignKey?: string,
  localKey?: string
) {
  return function (target: any, propertyKey: string) {
    const relationName = propertyKey;
    (target.constructor as typeof BaseModel).relations.set(relationName, {
      type: 'belongsToMany',
      model,
      pivotTable: pivotTable || [target.constructor.name.toLowerCase(), model.name.toLowerCase()].sort().join('_'),
      pivotForeignKey: foreignKey || `${target.constructor.name.toLowerCase()}_id`,
      pivotLocalKey: localKey || `${model.name.toLowerCase()}_id`,
    });
  };
}