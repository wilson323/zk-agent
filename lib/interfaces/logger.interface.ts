/**
 * @file 日志接口
 * @description 定义日志服务的接口
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

/**
 * 日志服务接口
 */
export interface ILogger {
  /**
   * 记录信息日志
   * @param message 日志消息
   * @param meta 元数据
   */
  info(message: string, meta?: any): void;

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param meta 元数据
   */
  warn(message: string, meta?: any): void;

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param meta 元数据
   */
  error(message: string, meta?: any): void;

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param meta 元数据
   */
  debug(message: string, meta?: any): void;
}
