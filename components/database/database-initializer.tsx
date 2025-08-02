'use client';

import React, { useState, useEffect } from 'react';
import { InitializationStatusDisplay } from './initialization-status-display';

/**
 * 数据库初始化状态枚举
 */
export enum InitializationStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 数据库初始化 API 响应接口
 */
interface DatabaseInitializationResponse {
  status: InitializationStatus;
  isInitialized: boolean;
  healthDetails?: {
    status: string;
    connection?: any;
    queries?: any;
    optimization?: any;
    error?: string;
  };
  timestamp: string;
  requestId: string;
}

/**
 * 调用数据库初始化状态 API
 * @returns {Promise<DatabaseInitializationResponse>} API 响应
 */
async function fetchDatabaseStatus(): Promise<DatabaseInitializationResponse> {
  const response = await fetch('/api/db/initialization', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'API request failed');
  }

  return result.data;
}

/**
 * 触发数据库初始化 API
 * @param {boolean} force - 是否强制重新初始化
 * @returns {Promise<any>} API 响应
 */
async function triggerDatabaseInitialization(force: boolean = false): Promise<any> {
  const response = await fetch('/api/db/initialization', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'API request failed');
  }

  return result.data;
}

/**
 * 数据库初始化组件属性
 */
interface DatabaseInitializerProps {
  /** 是否显示初始化状态 */
  showStatus?: boolean;
  /** 初始化完成回调 */
  onInitialized?: () => void;
  /** 初始化失败回调 */
  onError?: (error: Error) => void;
}

/**
 * 数据库初始化组件
 *
 * 该组件负责在应用启动时自动初始化数据库性能优化系统。
 * 它会监听初始化状态变化，并在适当时机触发回调函数。
 *
 * 特性：
 * - 自动在组件挂载时启动数据库初始化
 * - 实时监听初始化状态和进度
 * - 支持错误处理和重试机制
 * - 可选的状态显示界面
 * - 优雅的组件卸载处理
 *
 * @param props - 组件属性
 * @returns JSX元素或null
 */
export function DatabaseInitializer({
  showStatus = false,
  onInitialized,
  onError,
}: DatabaseInitializerProps) {
  const [status, setStatus] = useState<InitializationStatus>(InitializationStatus.PENDING);
  const [progress, setProgress] = useState<{ step: string; percentage: number }>({
    step: '准备初始化...',
    percentage: 0,
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    /**
     * 检查数据库初始化状态
     */
    const checkInitializationStatus = async () => {
      try {
        const response = await fetchDatabaseStatus();
        
        if (!mounted) return;

        // 更新状态
        setStatus(response.status);
        setError(null);

        // 根据状态更新进度
        switch (response.status) {
          case InitializationStatus.PENDING:
            setProgress({ step: '准备初始化...', percentage: 0 });
            break;
          case InitializationStatus.INITIALIZING:
            setProgress({ step: '正在初始化数据库...', percentage: 50 });
            break;
          case InitializationStatus.COMPLETED:
            setProgress({ step: '初始化完成', percentage: 100 });
            if (onInitialized) {
              onInitialized();
            }
            break;
          case InitializationStatus.FAILED:
            setProgress({ step: '初始化失败', percentage: 0 });
            const error = new Error(response.healthDetails?.error || 'Database initialization failed');
            setError(error);
            if (onError) {
              onError(error);
            }
            break;
        }

        // 如果还在初始化中，继续轮询
        if (response.status === InitializationStatus.INITIALIZING) {
          pollInterval = setTimeout(checkInitializationStatus, 2000);
        }
      } catch (err) {
        console.error('检查数据库初始化状态失败:', err);
        if (mounted) {
          const error = err as Error;
          setError(error);
          setStatus(InitializationStatus.FAILED);
          setProgress({ step: '状态检查失败', percentage: 0 });
          if (onError) {
            onError(error);
          }
        }
      }
    };

    /**
     * 启动数据库初始化
     */
    const initializeDatabase = async () => {
      try {
        setProgress({ step: '启动初始化...', percentage: 10 });
        await triggerDatabaseInitialization();
        
        // 启动状态轮询
        pollInterval = setTimeout(checkInitializationStatus, 1000);
      } catch (err) {
        console.error('启动数据库初始化失败:', err);
        if (mounted) {
          const error = err as Error;
          setError(error);
          setStatus(InitializationStatus.FAILED);
          setProgress({ step: '启动失败', percentage: 0 });
          if (onError) {
            onError(error);
          }
        }
      }
    };

    // 延迟启动初始化，确保应用完全加载
    const initTimer = setTimeout(() => {
      if (mounted) {
        // 首先检查当前状态
        checkInitializationStatus().then(() => {
          // 如果状态是 PENDING，则启动初始化
          if (mounted) {
            const currentStatus = status;
            if (currentStatus === InitializationStatus.PENDING) {
              initializeDatabase();
            }
          }
        });
      }
    }, 100);

    // 清理函数
    return () => {
      mounted = false;
      clearTimeout(initTimer);
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
    };
  }, [onInitialized, onError, status]);

  // 如果不显示状态，返回null
  if (!showStatus) {
    return null;
  }

  // 渲染状态显示界面
  return <InitializationStatusDisplay status={status} progress={progress} error={error} />;
}

/**
 * 数据库初始化状态钩子
 *
 * 提供数据库初始化状态的响应式访问
 *
 * @returns 初始化状态信息
 */
export function useDatabaseInitialization() {
  const [status, setStatus] = useState<InitializationStatus>(InitializationStatus.PENDING);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const response = await fetchDatabaseStatus();
        if (mounted) {
          setStatus(response.status);
          setIsInitialized(response.isInitialized);
          
          // 如果还在初始化中，继续轮询
          if (response.status === InitializationStatus.INITIALIZING) {
            pollInterval = setTimeout(checkStatus, 2000);
          }
        }
      } catch (err) {
        console.error('获取数据库状态失败:', err);
        if (mounted) {
          setStatus(InitializationStatus.FAILED);
          setIsInitialized(false);
        }
      }
    };

    // 初始检查
    checkStatus();

    return () => {
      mounted = false;
      if (pollInterval) {
        clearTimeout(pollInterval);
      }
    };
  }, []);

  return {
    status,
    isInitialized,
    isInitializing: status === InitializationStatus.INITIALIZING,
    isFailed: status === InitializationStatus.FAILED,
    isPending: status === InitializationStatus.PENDING,
  };
}

export default DatabaseInitializer;
