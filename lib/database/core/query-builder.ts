/**
 * @file Query Builder
 * @description 统一查询构建器
 */

import { DatabaseConnection } from './connection-manager';
import { Logger } from '../../utils/logger';

/**
 * 查询操作符
 */
export type QueryOperator = 
  | '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=' 
  | 'LIKE' | 'NOT LIKE' | 'ILIKE' | 'NOT ILIKE'
  | 'IN' | 'NOT IN' | 'BETWEEN' | 'NOT BETWEEN'
  | 'IS NULL' | 'IS NOT NULL'
  | 'EXISTS' | 'NOT EXISTS';

/**
 * 排序方向
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * 连接类型
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

/**
 * 聚合函数
 */
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

/**
 * 查询条件
 */
export interface WhereCondition {
  column: string;
  operator: QueryOperator;
  value?: any;
  raw?: boolean;
}

/**
 * 连接条件
 */
export interface JoinCondition {
  type: JoinType;
  table: string;
  on: string;
  alias?: string;
}

/**
 * 排序条件
 */
export interface OrderCondition {
  column: string;
  direction: SortDirection;
}

/**
 * 分组条件
 */
export interface GroupCondition {
  column: string;
}

/**
 * Having条件
 */
export interface HavingCondition {
  column: string;
  operator: QueryOperator;
  value: any;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  distinct?: boolean;
  forUpdate?: boolean;
  timeout?: number;
}

/**
 * 插入数据
 */
export type InsertData = Record<string, any> | Record<string, any>[];

/**
 * 更新数据
 */
export type UpdateData = Record<string, any>;

/**
 * 查询结果
 */
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: any[];
  command?: string;
}

/**
 * 统一查询构建器
 */
export class QueryBuilder<T = any> {
  private connection: DatabaseConnection;
  private logger: Logger;
  
  // 查询组件
  private _select: string[] = [];
  private _from: string = '';
  private _joins: JoinCondition[] = [];
  private _where: WhereCondition[] = [];
  private _groupBy: GroupCondition[] = [];
  private _having: HavingCondition[] = [];
  private _orderBy: OrderCondition[] = [];
  private _options: QueryOptions = {};
  
  // 参数绑定
  private _params: any[] = [];
  private _paramIndex = 0;
  
  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.logger = new Logger(`QueryBuilder:${connection.id}`);
  }
  
  /**
   * 选择字段
   */
  select(...columns: string[]): this {
    if (columns.length === 0) {
      this._select = ['*'];
    } else {
      this._select = [...this._select, ...columns];
    }
    return this;
  }
  
  /**
   * 选择聚合函数
   */
  selectAggregate(func: AggregateFunction, column: string, alias?: string): this {
    const expr = alias ? `${func}(${column}) AS ${alias}` : `${func}(${column})`;
    this._select.push(expr);
    return this;
  }
  
  /**
   * 选择原始表达式
   */
  selectRaw(expression: string): this {
    this._select.push(expression);
    return this;
  }
  
  /**
   * 从表
   */
  from(table: string, alias?: string): this {
    this._from = alias ? `${table} AS ${alias}` : table;
    return this;
  }
  
  /**
   * 连接表
   */
  join(type: JoinType, table: string, on: string, alias?: string): this {
    this._joins.push({ type, table, on, alias });
    return this;
  }
  
  /**
   * 内连接
   */
  innerJoin(table: string, on: string, alias?: string): this {
    return this.join('INNER', table, on, alias);
  }
  
  /**
   * 左连接
   */
  leftJoin(table: string, on: string, alias?: string): this {
    return this.join('LEFT', table, on, alias);
  }
  
  /**
   * 右连接
   */
  rightJoin(table: string, on: string, alias?: string): this {
    return this.join('RIGHT', table, on, alias);
  }
  
  /**
   * 全连接
   */
  fullJoin(table: string, on: string, alias?: string): this {
    return this.join('FULL', table, on, alias);
  }
  
  /**
   * 交叉连接
   */
  crossJoin(table: string, alias?: string): this {
    return this.join('CROSS', table, '', alias);
  }
  
  /**
   * WHERE条件
   */
  where(column: string, operator: QueryOperator, value?: any): this {
    this._where.push({ column, operator, value });
    return this;
  }
  
  /**
   * WHERE原始条件
   */
  whereRaw(condition: string): this {
    this._where.push({ column: condition, operator: '=', raw: true });
    return this;
  }
  
  /**
   * WHERE IN条件
   */
  whereIn(column: string, values: any[]): this {
    return this.where(column, 'IN', values);
  }
  
  /**
   * WHERE NOT IN条件
   */
  whereNotIn(column: string, values: any[]): this {
    return this.where(column, 'NOT IN', values);
  }
  
  /**
   * WHERE BETWEEN条件
   */
  whereBetween(column: string, min: any, max: any): this {
    return this.where(column, 'BETWEEN', [min, max]);
  }
  
  /**
   * WHERE NOT BETWEEN条件
   */
  whereNotBetween(column: string, min: any, max: any): this {
    return this.where(column, 'NOT BETWEEN', [min, max]);
  }
  
  /**
   * WHERE NULL条件
   */
  whereNull(column: string): this {
    return this.where(column, 'IS NULL');
  }
  
  /**
   * WHERE NOT NULL条件
   */
  whereNotNull(column: string): this {
    return this.where(column, 'IS NOT NULL');
  }
  
  /**
   * WHERE LIKE条件
   */
  whereLike(column: string, pattern: string): this {
    return this.where(column, 'LIKE', pattern);
  }
  
  /**
   * WHERE NOT LIKE条件
   */
  whereNotLike(column: string, pattern: string): this {
    return this.where(column, 'NOT LIKE', pattern);
  }
  
  /**
   * GROUP BY
   */
  groupBy(...columns: string[]): this {
    this._groupBy.push(...columns.map(column => ({ column })));
    return this;
  }
  
  /**
   * HAVING条件
   */
  having(column: string, operator: QueryOperator, value: any): this {
    this._having.push({ column, operator, value });
    return this;
  }
  
  /**
   * ORDER BY
   */
  orderBy(column: string, direction: SortDirection = 'ASC'): this {
    this._orderBy.push({ column, direction });
    return this;
  }
  
  /**
   * ORDER BY ASC
   */
  orderByAsc(column: string): this {
    return this.orderBy(column, 'ASC');
  }
  
  /**
   * ORDER BY DESC
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, 'DESC');
  }
  
  /**
   * LIMIT
   */
  limit(count: number): this {
    this._options.limit = count;
    return this;
  }
  
  /**
   * OFFSET
   */
  offset(count: number): this {
    this._options.offset = count;
    return this;
  }
  
  /**
   * 分页
   */
  paginate(page: number, perPage: number): this {
    this._options.limit = perPage;
    this._options.offset = (page - 1) * perPage;
    return this;
  }
  
  /**
   * DISTINCT
   */
  distinct(): this {
    this._options.distinct = true;
    return this;
  }
  
  /**
   * FOR UPDATE
   */
  forUpdate(): this {
    this._options.forUpdate = true;
    return this;
  }
  
  /**
   * 设置超时
   */
  timeout(ms: number): this {
    this._options.timeout = ms;
    return this;
  }
  
  /**
   * 构建SELECT查询
   */
  private buildSelectQuery(): { sql: string; params: any[] } {
    let sql = 'SELECT';
    
    // DISTINCT
    if (this._options.distinct) {
      sql += ' DISTINCT';
    }
    
    // SELECT字段
    sql += ` ${this._select.length > 0 ? this._select.join(', ') : '*'}`;
    
    // FROM
    if (!this._from) {
      throw new Error('FROM clause is required');
    }
    sql += ` FROM ${this._from}`;
    
    // JOIN
    for (const join of this._joins) {
      const tableExpr = join.alias ? `${join.table} AS ${join.alias}` : join.table;
      if (join.type === 'CROSS') {
        sql += ` CROSS JOIN ${tableExpr}`;
      } else {
        sql += ` ${join.type} JOIN ${tableExpr} ON ${join.on}`;
      }
    }
    
    // WHERE
    const whereClause = this.buildWhereClause();
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    // GROUP BY
    if (this._groupBy.length > 0) {
      sql += ` GROUP BY ${this._groupBy.map(g => g.column).join(', ')}`;
    }
    
    // HAVING
    if (this._having.length > 0) {
      const havingConditions = this._having.map(h => {
        const paramPlaceholder = this.getParameterPlaceholder();
        this._params.push(h.value);
        return `${h.column} ${h.operator} ${paramPlaceholder}`;
      });
      sql += ` HAVING ${havingConditions.join(' AND ')}`;
    }
    
    // ORDER BY
    if (this._orderBy.length > 0) {
      sql += ` ORDER BY ${this._orderBy.map(o => `${o.column} ${o.direction}`).join(', ')}`;
    }
    
    // LIMIT
    if (this._options.limit !== undefined) {
      sql += ` LIMIT ${this._options.limit}`;
    }
    
    // OFFSET
    if (this._options.offset !== undefined) {
      sql += ` OFFSET ${this._options.offset}`;
    }
    
    // FOR UPDATE
    if (this._options.forUpdate) {
      sql += ' FOR UPDATE';
    }
    
    return { sql, params: [...whereClause.params, ...this._params] };
  }
  
  /**
   * 构建WHERE子句
   */
  private buildWhereClause(): { sql: string; params: any[] } {
    if (this._where.length === 0) {
      return { sql: '', params: [] };
    }
    
    const conditions: string[] = [];
    const params: any[] = [];
    
    for (const condition of this._where) {
      if (condition.raw) {
        conditions.push(condition.column);
        continue;
      }
      
      let conditionSql = condition.column;
      
      switch (condition.operator) {
        case 'IS NULL':
        case 'IS NOT NULL':
          conditionSql += ` ${condition.operator}`;
          break;
          
        case 'IN':
        case 'NOT IN':
          if (Array.isArray(condition.value)) {
            const placeholders = condition.value.map(() => this.getParameterPlaceholder()).join(', ');
            conditionSql += ` ${condition.operator} (${placeholders})`;
            params.push(...condition.value);
          }
          break;
          
        case 'BETWEEN':
        case 'NOT BETWEEN':
          if (Array.isArray(condition.value) && condition.value.length === 2) {
            const placeholder1 = this.getParameterPlaceholder();
            const placeholder2 = this.getParameterPlaceholder();
            conditionSql += ` ${condition.operator} ${placeholder1} AND ${placeholder2}`;
            params.push(condition.value[0], condition.value[1]);
          }
          break;
          
        default:
          const placeholder = this.getParameterPlaceholder();
          conditionSql += ` ${condition.operator} ${placeholder}`;
          params.push(condition.value);
          break;
      }
      
      conditions.push(conditionSql);
    }
    
    return {
      sql: conditions.join(' AND '),
      params
    };
  }
  
  /**
   * 获取参数占位符
   */
  private getParameterPlaceholder(): string {
    // 根据数据库类型返回不同的占位符
    const dbType = this.connection.config.type;
    
    switch (dbType) {
      case 'postgresql':
        return `$${++this._paramIndex}`;
      case 'mysql':
      case 'sqlite':
      default:
        return '?';
    }
  }
  
  /**
   * 重置查询构建器
   */
  private reset(): void {
    this._select = [];
    this._from = '';
    this._joins = [];
    this._where = [];
    this._groupBy = [];
    this._having = [];
    this._orderBy = [];
    this._options = {};
    this._params = [];
    this._paramIndex = 0;
  }
  
  /**
   * 执行查询
   */
  async get(): Promise<T[]> {
    const { sql, params } = this.buildSelectQuery();
    
    try {
      this.logger.debug('Executing SELECT query', { sql, params });
      const result = await this.connection.query<T[]>(sql, params);
      return result;
    } finally {
      this.reset();
    }
  }
  
  /**
   * 获取第一条记录
   */
  async first(): Promise<T | null> {
    this.limit(1);
    const results = await this.get();
    return results.length > 0 ? results[0] : null;
  }
  
  /**
   * 获取记录数量
   */
  async count(column: string = '*'): Promise<number> {
    // 保存原始选择字段
    const originalSelect = [...this._select];
    
    // 重置选择字段为COUNT
    this._select = [`COUNT(${column}) as count`];
    
    try {
      const result = await this.first() as any;
      return result ? parseInt(result.count, 10) : 0;
    } finally {
      // 恢复原始选择字段
      this._select = originalSelect;
    }
  }
  
  /**
   * 检查记录是否存在
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }
  
  /**
   * 插入记录
   */
  async insert(data: InsertData): Promise<any> {
    if (!this._from) {
      throw new Error('Table name is required for insert');
    }
    
    const records = Array.isArray(data) ? data : [data];
    
    if (records.length === 0) {
      throw new Error('Insert data cannot be empty');
    }
    
    const columns = Object.keys(records[0]);
    const placeholders = records.map(record => 
      `(${columns.map(() => this.getParameterPlaceholder()).join(', ')})`
    ).join(', ');
    
    const params = records.flatMap(record => columns.map(col => record[col]));
    
    const sql = `INSERT INTO ${this._from} (${columns.join(', ')}) VALUES ${placeholders}`;
    
    try {
      this.logger.debug('Executing INSERT query', { sql, params });
      return await this.connection.query(sql, params);
    } finally {
      this.reset();
    }
  }
  
  /**
   * 更新记录
   */
  async update(data: UpdateData): Promise<any> {
    if (!this._from) {
      throw new Error('Table name is required for update');
    }
    
    if (Object.keys(data).length === 0) {
      throw new Error('Update data cannot be empty');
    }
    
    const setClause = Object.keys(data).map(column => {
      const placeholder = this.getParameterPlaceholder();
      return `${column} = ${placeholder}`;
    }).join(', ');
    
    const setParams = Object.values(data);
    
    let sql = `UPDATE ${this._from} SET ${setClause}`;
    
    // WHERE
    const whereClause = this.buildWhereClause();
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    const params = [...setParams, ...whereClause.params];
    
    try {
      this.logger.debug('Executing UPDATE query', { sql, params });
      return await this.connection.query(sql, params);
    } finally {
      this.reset();
    }
  }
  
  /**
   * 删除记录
   */
  async delete(): Promise<any> {
    if (!this._from) {
      throw new Error('Table name is required for delete');
    }
    
    let sql = `DELETE FROM ${this._from}`;
    
    // WHERE
    const whereClause = this.buildWhereClause();
    if (whereClause.sql) {
      sql += ` WHERE ${whereClause.sql}`;
    }
    
    try {
      this.logger.debug('Executing DELETE query', { sql, params: whereClause.params });
      return await this.connection.query(sql, whereClause.params);
    } finally {
      this.reset();
    }
  }
  
  /**
   * 执行原始查询
   */
  async raw(sql: string, params?: any[]): Promise<any> {
    this.logger.debug('Executing raw query', { sql, params });
    return await this.connection.query(sql, params);
  }
  
  /**
   * 克隆查询构建器
   */
  clone(): QueryBuilder<T> {
    const cloned = new QueryBuilder<T>(this.connection);
    cloned._select = [...this._select];
    cloned._from = this._from;
    cloned._joins = [...this._joins];
    cloned._where = [...this._where];
    cloned._groupBy = [...this._groupBy];
    cloned._having = [...this._having];
    cloned._orderBy = [...this._orderBy];
    cloned._options = { ...this._options };
    cloned._params = [...this._params];
    cloned._paramIndex = this._paramIndex;
    return cloned;
  }
}

/**
 * 查询构建器工厂
 */
export class QueryBuilderFactory {
  /**
   * 创建查询构建器
   */
  static create<T = any>(connection: DatabaseConnection): QueryBuilder<T> {
    return new QueryBuilder<T>(connection);
  }
  
  /**
   * 创建表查询构建器
   */
  static table<T = any>(connection: DatabaseConnection, tableName: string): QueryBuilder<T> {
    return new QueryBuilder<T>(connection).from(tableName);
  }
}