/**
 * @file Database Connection Export
 * @description 统一的数据库连接导出模块
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { enhancedDb } from './database/enhanced-connection';

/**
 * 导出数据库连接实例
 * 提供统一的数据库访问接口
 */
export const db = enhancedDb;

/**
 * 默认导出数据库连接
 */
export default enhancedDb;

/**
 * 重新导出数据库相关类型和接口
 */
export type { ConnectionState } from './database/enhanced-connection';
export { EnhancedDatabaseConnection } from './database/enhanced-connection';