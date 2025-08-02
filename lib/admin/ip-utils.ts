/**
 * @file ip-utils.ts
 * @description IP 地址相关工具函数
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * 获取趋势图标
 * @param trend - 趋势类型
 * @returns 对应的图标组件
 */
export function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  switch (trend) {
    case 'up':
      return TrendingUp;
    case 'down':
      return TrendingDown;
    case 'stable':
    default:
      return Minus;
  }
}

/**
 * 获取热力图颜色
 * @param percentage - 百分比值
 * @returns 对应的颜色类名
 */
export function getHeatColor(percentage: number): string {
  if (percentage >= 80) {
    return 'bg-red-500';
  } else if (percentage >= 60) {
    return 'bg-orange-500';
  } else if (percentage >= 40) {
    return 'bg-yellow-500';
  } else if (percentage >= 20) {
    return 'bg-green-400';
  } else {
    return 'bg-blue-400';
  }
}

/**
 * 格式化 IP 地址
 * @param ip - IP 地址字符串
 * @returns 格式化后的 IP 地址
 */
export function formatIPAddress(ip: string): string {
  // 简单的 IP 地址验证和格式化
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipRegex.test(ip)) {
    return ip;
  }
  return '未知 IP';
}

/**
 * 获取地理位置显示名称
 * @param province - 省份
 * @param city - 城市
 * @returns 格式化的地理位置名称
 */
export function getLocationDisplayName(province: string, city: string): string {
  if (province === city) {
    return province;
  }
  return `${province} ${city}`;
}