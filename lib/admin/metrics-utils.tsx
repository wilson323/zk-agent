/**
 * @file metrics-utils.tsx
 * @description 系统监控指标相关工具函数（已废弃，请使用metrics-utils.ts）
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

// 此文件已废弃，请使用 metrics-utils.ts
// 保留此文件是为了向后兼容，新代码应使用 metrics-utils.ts

import { getStatusBadgeConfig } from './metrics-utils';
import { Badge } from '../components/ui/badge';
import React from 'react';

/**
 * 获取状态颜色（已废弃）
 * @deprecated 请使用 metrics-utils.ts 中的 getStatusColor
 */
export const getStatusColor = (percentage: number): string => {
  if (percentage < 50) {
    return 'text-green-600';
  }
  if (percentage < 80) {
    return 'text-yellow-600';
  }
  return 'text-red-600';
};

/**
 * 获取状态徽章（已废弃）
 * @deprecated 请使用 metrics-utils.ts 中的 getStatusBadgeConfig
 */
export const getStatusBadge = (percentage: number): React.ReactElement => {
  const badgeConfig = getStatusBadgeConfig(percentage, { warning: 50, danger: 80 }, '使用率');
  return (
    <Badge variant={badgeConfig.variant} className='whitespace-nowrap'>
      {badgeConfig.value}
    </Badge>
  );
};
