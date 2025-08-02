/**
 * @file Database Schema Builder
 * @description 数据库模式构建器 - 提供表结构定义和管理功能
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { DatabaseConnectionManager } from '../core/connection-manager';
import { QueryBuilder } from '../core/query-builder';

// 列类型定义
export type ColumnType =
  | 'bigint'
  | 'int'
  | 'smallint'
  | 'tinyint'
  | 'decimal'
  | 'float'
  | 'double'
  | 'varchar'
  | 'char'
  | 'text'
  | 'longtext'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'time'
  | 'boolean'
  | 'json'
  | 'blob'
  | 'binary'
  | 'enum'
  | 'set';

// 列定义接口
export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
  default?: any;
  autoIncrement?: boolean;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
  comment?: string;
  enumValues?: string[];
  after?: string;
  first?: boolean;
}

// 索引定义接口
export interface IndexDefinition {
  name: string;
  columns: string[];
  type: 'index' | 'unique' | 'fulltext' | 'spatial';
  method?: 'btree' | 'hash';
  comment?: string;
}

// 外键定义接口
export interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onUpdate?: 'cascade' | 'set null' | 'restrict' | 'no action';
  onDelete?: 'cascade' | 'set null' | 'restrict' | 'no action';
}

// 表定义接口
export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
  engine?: string;
  charset?: string;
  collation?: string;
  comment?: string;
  temporary?: boolean;
}

// 表修改操作接口
export interface TableModification {
  type:
    | 'add_column'
    | 'drop_column'
    | 'modify_column'
    | 'rename_column'
    | 'add_index'
    | 'drop_index'
    | 'add_foreign_key'
    | 'drop_foreign_key'
    | 'rename_table'
    | 'change_engine'
    | 'change_charset';
  data: any;
}

/**
 * 表构建器
 */
export class TableBuilder {
  private tableName: string;
  private columns: ColumnDefinition[] = [];
  private indexes: IndexDefinition[] = [];
  private foreignKeys: ForeignKeyDefinition[] = [];
  private tableOptions: Partial<TableDefinition> = {};
  private modifications: TableModification[] = [];
  private isModifying = false;

  constructor(tableName: string, isModifying = false) {
    this.tableName = tableName;
    this.isModifying = isModifying;
  }

  /**
   * 添加主键ID列
   */
  id(name = 'id'): this {
    return this.bigInteger(name).autoIncrement().primary();
  }

  /**
   * 添加大整数列
   */
  bigInteger(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'bigint');
  }

  /**
   * 添加整数列
   */
  integer(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'int');
  }

  /**
   * 添加小整数列
   */
  smallInteger(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'smallint');
  }

  /**
   * 添加微整数列
   */
  tinyInteger(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'tinyint');
  }

  /**
   * 添加字符串列
   */
  string(name: string, length = 255): ColumnBuilder {
    return new ColumnBuilder(this, name, 'varchar').length(length);
  }

  /**
   * 添加文本列
   */
  text(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'text');
  }

  /**
   * 添加长文本列
   */
  longText(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'longtext');
  }

  /**
   * 添加布尔列
   */
  boolean(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'boolean');
  }

  /**
   * 添加日期列
   */
  date(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'date');
  }

  /**
   * 添加日期时间列
   */
  dateTime(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'datetime');
  }

  /**
   * 添加时间戳列
   */
  timestamp(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'timestamp');
  }

  /**
   * 添加时间列
   */
  time(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'time');
  }

  /**
   * 添加JSON列
   */
  json(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'json');
  }

  /**
   * 添加枚举列
   */
  enum(name: string, values: string[]): ColumnBuilder {
    return new ColumnBuilder(this, name, 'enum').enumValues(values);
  }

  /**
   * 添加小数列
   */
  decimal(name: string, precision = 8, scale = 2): ColumnBuilder {
    return new ColumnBuilder(this, name, 'decimal').precision(precision, scale);
  }

  /**
   * 添加浮点数列
   */
  float(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'float');
  }

  /**
   * 添加双精度浮点数列
   */
  double(name: string): ColumnBuilder {
    return new ColumnBuilder(this, name, 'double');
  }

  /**
   * 添加时间戳列（创建时间和更新时间）
   */
  timestamps(): this {
    this.timestamp('created_at').default('CURRENT_TIMESTAMP');
    this.timestamp('updated_at').default('CURRENT_TIMESTAMP').onUpdate('CURRENT_TIMESTAMP');
    return this;
  }

  /**
   * 添加软删除列
   */
  softDeletes(): this {
    this.timestamp('deleted_at').nullable();
    return this;
  }

  /**
   * 添加索引
   */
  index(columns: string | string[], name?: string): this {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    const indexName = name || `idx_${this.tableName}_${columnArray.join('_')}`;

    this.indexes.push({
      name: indexName,
      columns: columnArray,
      type: 'index',
    });

    return this;
  }

  /**
   * 添加唯一索引
   */
  unique(columns: string | string[], name?: string): this {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    const indexName = name || `uk_${this.tableName}_${columnArray.join('_')}`;

    this.indexes.push({
      name: indexName,
      columns: columnArray,
      type: 'unique',
    });

    return this;
  }

  /**
   * 添加全文索引
   */
  fulltext(columns: string | string[], name?: string): this {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    const indexName = name || `ft_${this.tableName}_${columnArray.join('_')}`;

    this.indexes.push({
      name: indexName,
      columns: columnArray,
      type: 'fulltext',
    });

    return this;
  }

  /**
   * 添加外键
   */
  foreign(columns: string | string[], name?: string): ForeignKeyBuilder {
    const columnArray = Array.isArray(columns) ? columns : [columns];
    const keyName = name || `fk_${this.tableName}_${columnArray.join('_')}`;

    return new ForeignKeyBuilder(this, keyName, columnArray);
  }

  /**
   * 设置表引擎
   */
  engine(engine: string): this {
    this.tableOptions.engine = engine;
    return this;
  }

  /**
   * 设置字符集
   */
  charset(charset: string): this {
    this.tableOptions.charset = charset;
    return this;
  }

  /**
   * 设置排序规则
   */
  collation(collation: string): this {
    this.tableOptions.collation = collation;
    return this;
  }

  /**
   * 设置表注释
   */
  comment(comment: string): this {
    this.tableOptions.comment = comment;
    return this;
  }

  /**
   * 设置为临时表
   */
  temporary(): this {
    this.tableOptions.temporary = true;
    return this;
  }

  /**
   * 删除列
   */
  dropColumn(name: string): this {
    if (this.isModifying) {
      this.modifications.push({
        type: 'drop_column',
        data: { name },
      });
    }
    return this;
  }

  /**
   * 重命名列
   */
  renameColumn(from: string, to: string): this {
    if (this.isModifying) {
      this.modifications.push({
        type: 'rename_column',
        data: { from, to },
      });
    }
    return this;
  }

  /**
   * 删除索引
   */
  dropIndex(name: string): this {
    if (this.isModifying) {
      this.modifications.push({
        type: 'drop_index',
        data: { name },
      });
    }
    return this;
  }

  /**
   * 删除外键
   */
  dropForeign(name: string): this {
    if (this.isModifying) {
      this.modifications.push({
        type: 'drop_foreign_key',
        data: { name },
      });
    }
    return this;
  }

  /**
   * 添加列到内部列表
   */
  addColumn(column: ColumnDefinition): void {
    if (this.isModifying) {
      this.modifications.push({
        type: 'add_column',
        data: column,
      });
    } else {
      this.columns.push(column);
    }
  }

  /**
   * 修改列
   */
  modifyColumn(column: ColumnDefinition): void {
    if (this.isModifying) {
      this.modifications.push({
        type: 'modify_column',
        data: column,
      });
    }
  }

  /**
   * 添加外键到内部列表
   */
  addForeignKey(foreignKey: ForeignKeyDefinition): void {
    if (this.isModifying) {
      this.modifications.push({
        type: 'add_foreign_key',
        data: foreignKey,
      });
    } else {
      this.foreignKeys.push(foreignKey);
    }
  }

  /**
   * 获取表定义
   */
  getTableDefinition(): TableDefinition {
    return {
      name: this.tableName,
      columns: this.columns,
      indexes: this.indexes,
      foreignKeys: this.foreignKeys,
      ...this.tableOptions,
    };
  }

  /**
   * 获取修改操作
   */
  getModifications(): TableModification[] {
    return this.modifications;
  }
}

/**
 * 列构建器
 */
export class ColumnBuilder {
  private tableBuilder: TableBuilder;
  private column: ColumnDefinition;

  constructor(tableBuilder: TableBuilder, name: string, type: ColumnType) {
    this.tableBuilder = tableBuilder;
    this.column = {
      name,
      type,
      nullable: true,
    };
  }

  /**
   * 设置列长度
   */
  length(length: number): this {
    this.column.length = length;
    return this;
  }

  /**
   * 设置精度
   */
  precision(precision: number, scale?: number): this {
    this.column.precision = precision;
    if (scale !== undefined) {
      this.column.scale = scale;
    }
    return this;
  }

  /**
   * 设置为不可空
   */
  notNull(): this {
    this.column.nullable = false;
    return this;
  }

  /**
   * 设置为可空
   */
  nullable(): this {
    this.column.nullable = true;
    return this;
  }

  /**
   * 设置默认值
   */
  default(value: any): this {
    this.column.default = value;
    return this;
  }

  /**
   * 设置为自增
   */
  autoIncrement(): this {
    this.column.autoIncrement = true;
    return this;
  }

  /**
   * 设置为主键
   */
  primary(): this {
    this.column.primary = true;
    this.column.nullable = false;
    return this;
  }

  /**
   * 设置为唯一
   */
  unique(): this {
    this.column.unique = true;
    return this;
  }

  /**
   * 添加索引
   */
  index(): this {
    this.column.index = true;
    return this;
  }

  /**
   * 设置注释
   */
  comment(comment: string): this {
    this.column.comment = comment;
    return this;
  }

  /**
   * 设置枚举值
   */
  enumValues(values: string[]): this {
    this.column.enumValues = values;
    return this;
  }

  /**
   * 设置在某列之后
   */
  after(columnName: string): this {
    this.column.after = columnName;
    return this;
  }

  /**
   * 设置为第一列
   */
  first(): this {
    this.column.first = true;
    return this;
  }

  /**
   * 设置更新时的动作
   */
  onUpdate(action: string): this {
    // 这里可以扩展支持 ON UPDATE 子句
    return this;
  }

  /**
   * 完成列定义
   */
  done(): TableBuilder {
    this.tableBuilder.addColumn(this.column);
    return this.tableBuilder;
  }
}

/**
 * 外键构建器
 */
export class ForeignKeyBuilder {
  private tableBuilder: TableBuilder;
  private foreignKey: ForeignKeyDefinition;

  constructor(tableBuilder: TableBuilder, name: string, columns: string[]) {
    this.tableBuilder = tableBuilder;
    this.foreignKey = {
      name,
      columns,
      referencedTable: '',
      referencedColumns: [],
    };
  }

  /**
   * 设置引用表
   */
  references(table: string): this {
    this.foreignKey.referencedTable = table;
    return this;
  }

  /**
   * 设置引用列
   */
  on(columns: string | string[]): this {
    this.foreignKey.referencedColumns = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  /**
   * 设置更新时的动作
   */
  onUpdate(action: 'cascade' | 'set null' | 'restrict' | 'no action'): this {
    this.foreignKey.onUpdate = action;
    return this;
  }

  /**
   * 设置删除时的动作
   */
  onDelete(action: 'cascade' | 'set null' | 'restrict' | 'no action'): this {
    this.foreignKey.onDelete = action;
    return this;
  }

  /**
   * 完成外键定义
   */
  done(): TableBuilder {
    this.tableBuilder.addForeignKey(this.foreignKey);
    return this.tableBuilder;
  }
}

/**
 * 模式构建器
 */
export class SchemaBuilder {
  private connectionManager: DatabaseConnectionManager;
  private queryBuilder: QueryBuilder | null = null;

  constructor() {
    this.connectionManager = DatabaseConnectionManager.getInstance();
  }

  /**
   * 获取查询构建器
   */
  private async getQueryBuilder(): Promise<QueryBuilder> {
    if (!this.queryBuilder) {
      const connection = await this.connectionManager.getConnection('default');
      this.queryBuilder = new QueryBuilder(connection);
    }
    return this.queryBuilder;
  }

  /**
   * 创建表
   */
  async createTable(tableName: string, callback: (table: TableBuilder) => void): Promise<void> {
    const tableBuilder = new TableBuilder(tableName);
    callback(tableBuilder);

    const tableDefinition = tableBuilder.getTableDefinition();
    const sql = this.generateCreateTableSQL(tableDefinition);

    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(sql);
  }

  /**
   * 修改表
   */
  async alterTable(tableName: string, callback: (table: TableBuilder) => void): Promise<void> {
    const tableBuilder = new TableBuilder(tableName, true);
    callback(tableBuilder);

    const modifications = tableBuilder.getModifications();

    for (const modification of modifications) {
      const sql = this.generateAlterTableSQL(tableName, modification);
      const queryBuilder = await this.getQueryBuilder();
      await queryBuilder.raw(sql);
    }
  }

  /**
   * 删除表
   */
  async dropTable(tableName: string): Promise<void> {
    const sql = `DROP TABLE IF EXISTS \`${tableName}\``;
    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(sql);
  }

  /**
   * 重命名表
   */
  async renameTable(from: string, to: string): Promise<void> {
    const sql = `RENAME TABLE \`${from}\` TO \`${to}\``;
    const queryBuilder = await this.getQueryBuilder();
    await queryBuilder.raw(sql);
  }

  /**
   * 检查表是否存在
   */
  async hasTable(tableName: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?
    `;

    const queryBuilder = await this.getQueryBuilder();
    const result = await queryBuilder.raw(sql, [tableName]);
    return result[0].count > 0;
  }

  /**
   * 检查列是否存在
   */
  async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = ? 
      AND column_name = ?
    `;

    const queryBuilder = await this.getQueryBuilder();
    const result = await queryBuilder.raw(sql, [tableName, columnName]);
    return result[0].count > 0;
  }

  /**
   * 生成创建表SQL
   */
  private generateCreateTableSQL(table: TableDefinition): string {
    let sql = `CREATE ${table.temporary ? 'TEMPORARY ' : ''}TABLE \`${table.name}\` (\n`;

    // 添加列定义
    const columnDefinitions = table.columns.map(col => this.generateColumnSQL(col));
    sql += columnDefinitions.join(',\n');

    // 添加主键
    const primaryColumns = table.columns.filter(col => col.primary).map(col => col.name);
    if (primaryColumns.length > 0) {
      sql += `,\n  PRIMARY KEY (\`${primaryColumns.join('\`, \`')}\`)`;
    }

    // 添加唯一键
    table.columns.forEach(col => {
      if (col.unique && !col.primary) {
        sql += `,\n  UNIQUE KEY \`uk_${table.name}_${col.name}\` (\`${col.name}\`)`;
      }
    });

    // 添加索引
    if (table.indexes) {
      table.indexes.forEach(index => {
        sql += `,\n  ${this.generateIndexSQL(index)}`;
      });
    }

    // 添加外键
    if (table.foreignKeys) {
      table.foreignKeys.forEach(fk => {
        sql += `,\n  ${this.generateForeignKeySQL(fk)}`;
      });
    }

    sql += '\n)';

    // 添加表选项
    if (table.engine) {
      sql += ` ENGINE=${table.engine}`;
    }
    if (table.charset) {
      sql += ` DEFAULT CHARSET=${table.charset}`;
    }
    if (table.collation) {
      sql += ` COLLATE=${table.collation}`;
    }
    if (table.comment) {
      sql += ` COMMENT='${table.comment.replace(/'/g, "''")}'`;
    }

    return sql;
  }

  /**
   * 生成列SQL
   */
  private generateColumnSQL(column: ColumnDefinition): string {
    let sql = `  \`${column.name}\` ${this.getColumnTypeSQL(column)}`;

    if (!column.nullable) {
      sql += ' NOT NULL';
    }

    if (column.autoIncrement) {
      sql += ' AUTO_INCREMENT';
    }

    if (column.default !== undefined) {
      if (
        typeof column.default === 'string' &&
        column.default.toUpperCase().includes('CURRENT_TIMESTAMP')
      ) {
        sql += ` DEFAULT ${column.default}`;
      } else {
        sql += ` DEFAULT '${column.default}'`;
      }
    }

    if (column.comment) {
      sql += ` COMMENT '${column.comment.replace(/'/g, "''")}'`;
    }

    return sql;
  }

  /**
   * 获取列类型SQL
   */
  private getColumnTypeSQL(column: ColumnDefinition): string {
    switch (column.type) {
      case 'varchar':
        return `VARCHAR(${column.length || 255})`;
      case 'char':
        return `CHAR(${column.length || 1})`;
      case 'decimal':
        return `DECIMAL(${column.precision || 8},${column.scale || 2})`;
      case 'enum':
        return `ENUM(${column.enumValues?.map(v => `'${v}'`).join(',') || ''})`;
      case 'set':
        return `SET(${column.enumValues?.map(v => `'${v}'`).join(',') || ''})`;
      default:
        return column.type.toUpperCase();
    }
  }

  /**
   * 生成索引SQL
   */
  private generateIndexSQL(index: IndexDefinition): string {
    const type = index.type === 'index' ? 'KEY' : index.type.toUpperCase();
    const columns = index.columns.map(col => `\`${col}\``).join(', ');
    return `${type} \`${index.name}\` (${columns})`;
  }

  /**
   * 生成外键SQL
   */
  private generateForeignKeySQL(fk: ForeignKeyDefinition): string {
    const columns = fk.columns.map(col => `\`${col}\``).join(', ');
    const refColumns = fk.referencedColumns.map(col => `\`${col}\``).join(', ');

    let sql = `CONSTRAINT \`${fk.name}\` FOREIGN KEY (${columns}) REFERENCES \`${fk.referencedTable}\` (${refColumns})`;

    if (fk.onUpdate) {
      sql += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
    }
    if (fk.onDelete) {
      sql += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
    }

    return sql;
  }

  /**
   * 生成修改表SQL
   */
  private generateAlterTableSQL(tableName: string, modification: TableModification): string {
    const baseSQL = `ALTER TABLE \`${tableName}\``;

    switch (modification.type) {
      case 'add_column':
        const column = modification.data as ColumnDefinition;
        let addSQL = `${baseSQL} ADD COLUMN ${this.generateColumnSQL(column).trim()}`;
        if (column.after) {
          addSQL += ` AFTER \`${column.after}\``;
        } else if (column.first) {
          addSQL += ' FIRST';
        }
        return addSQL;

      case 'drop_column':
        return `${baseSQL} DROP COLUMN \`${modification.data.name}\``;

      case 'modify_column':
        const modColumn = modification.data as ColumnDefinition;
        return `${baseSQL} MODIFY COLUMN ${this.generateColumnSQL(modColumn).trim()}`;

      case 'rename_column':
        return `${baseSQL} RENAME COLUMN \`${modification.data.from}\` TO \`${modification.data.to}\``;

      case 'add_index':
        const index = modification.data as IndexDefinition;
        return `${baseSQL} ADD ${this.generateIndexSQL(index)}`;

      case 'drop_index':
        return `${baseSQL} DROP INDEX \`${modification.data.name}\``;

      case 'add_foreign_key':
        const fk = modification.data as ForeignKeyDefinition;
        return `${baseSQL} ADD ${this.generateForeignKeySQL(fk)}`;

      case 'drop_foreign_key':
        return `${baseSQL} DROP FOREIGN KEY \`${modification.data.name}\``;

      default:
        throw new Error(`Unsupported modification type: ${modification.type}`);
    }
  }
}

// 导出单例实例
export const schemaBuilder = new SchemaBuilder();
