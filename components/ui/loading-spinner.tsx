/**
 * @file loading-spinner.tsx
 * @description 加载动画组件
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 加载动画组件
 * @param className - 自定义样式类名
 * @param size - 尺寸大小
 * @returns JSX.Element
 */
export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  );
}

export default LoadingSpinner;