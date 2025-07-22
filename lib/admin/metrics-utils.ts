/**
 * @file metrics-utils.ts
 * @description 系统监控指标相关工具函数
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

// 不再需要 React 和 Badge 组件的导入

/**
 * 获取状态颜色
 * @param status - 状态值
 * @param threshold - 阈值配置
 * @returns 对应的颜色类名
 */
export function getStatusColor(
  status: number,
  threshold: { warning: number; danger: number }
): string {
  if (status >= threshold.danger) {
    return 'text-red-500';
  } else if (status >= threshold.warning) {
    return 'text-yellow-500';
  } else {
    return 'text-green-500';
  }
}

/**
 * 获取状态徽章组件
 * @param status - 状态值
 * @param threshold - 阈值配置
 * @param label - 显示标签
 * @returns Badge 组件
 */
/**
 * 获取状态徽章配置
 * @param status - 状态值
 * @param threshold - 阈值配置
 * @param label - 显示标签
 * @returns 徽章配置对象
 */
export function getStatusBadgeConfig(
  status: number,
  threshold: { warning: number; danger: number },
  label: string
): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; value: string } {
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  
  if (status >= threshold.danger) {
    variant = 'destructive';
  } else if (status >= threshold.warning) {
    variant = 'outline';
  } else {
    variant = 'secondary';
  }

  return {
    variant,
    label,
    value: `${label}: ${status.toFixed(1)}%`
  };
}

/**
 * 格式化字节大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化网络速度
 * @param bytesPerSecond - 每秒字节数
 * @returns 格式化后的速度字符串
 */
export function formatNetworkSpeed(bytesPerSecond: number): string {
  return formatBytes(bytesPerSecond) + '/s';
}

/**
 * 获取性能等级
 * @param percentage - 使用百分比
 * @returns 性能等级描述
 */
export function getPerformanceLevel(percentage: number): string {
  if (percentage >= 90) {
    return '危险';
  } else if (percentage >= 75) {
    return '警告';
  } else if (percentage >= 50) {
    return '正常';
  } else {
    return '优秀';
  }
}

/**
 * 计算平均值
 * @param values - 数值数组
 * @returns 平均值
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}