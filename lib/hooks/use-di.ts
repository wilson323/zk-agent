/**
 * @file 依赖注入钩子
 * @description 提供在React组件中使用依赖注入的钩子
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import { useState, useEffect } from 'react';
import { getService, ServiceIdentifier } from '../di/container';
import { isDIInitialized, getDIInitializationStatus } from '../di/initialization';
import { DIInitializationStatus } from '../di/initialization';

/**
 * 使用依赖注入服务的钩子返回类型
 */
export type UseDIServiceResult<T> = {
  service: T | null;        // 服务实例，如果DI未初始化则为null
  isInitialized: boolean;   // DI系统是否已初始化
  status: DIInitializationStatus; // DI系统初始化状态
  error: Error | null;      // 获取服务时的错误
};

/**
 * 使用依赖注入服务的钩子
 * @param serviceId 服务标识符
 * @returns 包含服务实例和状态的对象
 * 
 * @example
 * // 在组件中使用
 * const { service: logger, isInitialized } = useDIService<ILogger>(TYPES.Logger);
 * 
 * // 使用服务（确保检查是否已初始化）
 * useEffect(() => {
 *   if (isInitialized && logger) {
 *     logger.info('组件已挂载');
 *   }
 * }, [isInitialized, logger]);
 */
export function useDIService<T>(serviceId: ServiceIdentifier): UseDIServiceResult<T> {
  const [result, setResult] = useState<UseDIServiceResult<T>>({
    service: null,
    isInitialized: isDIInitialized(),
    status: getDIInitializationStatus(),
    error: null
  });

  useEffect(() => {
    // 检查DI系统状态的函数
    const checkAndGetService = () => {
      const initialized = isDIInitialized();
      const status = getDIInitializationStatus();
      
      if (initialized) {
        try {
          // 尝试获取服务
          const serviceInstance = getService<T>(serviceId);
          setResult({
            service: serviceInstance,
            isInitialized: true,
            status,
            error: null
          });
        } catch (err) {
          // 处理获取服务时的错误
          setResult({
            service: null,
            isInitialized: true,
            status,
            error: err instanceof Error ? err : new Error('获取服务失败')
          });
        }
      } else {
        // DI系统尚未初始化
        setResult({
          service: null,
          isInitialized: false,
          status,
          error: null
        });
      }
    };

    // 立即检查一次
    checkAndGetService();
    
    // 如果DI系统尚未初始化，设置轮询检查
    if (!result.isInitialized) {
      const interval = setInterval(() => {
        const currentStatus = getDIInitializationStatus();
        
        // 如果状态已更改，重新检查服务
        if (currentStatus !== result.status) {
          checkAndGetService();
        }
        
        // 如果已初始化，停止轮询
        if (isDIInitialized()) {
          clearInterval(interval);
          checkAndGetService();
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [serviceId, result.status, result.isInitialized]);

  return result;
}

/**
 * 等待DI系统初始化的钩子
 * @returns DI系统的初始化状态
 * 
 * @example
 * // 在组件中使用
 * const { isInitialized, status } = useDIInitialization();
 * 
 * if (!isInitialized) {
 *   return <div>正在初始化依赖注入系统...</div>;
 * }
 */
export function useDIInitialization() {
  const [state, setState] = useState({
    isInitialized: isDIInitialized(),
    status: getDIInitializationStatus()
  });

  useEffect(() => {
    // 如果已初始化，不需要设置轮询
    if (state.isInitialized) return;

    // 检查状态的函数
    const checkStatus = () => {
      const currentInitialized = isDIInitialized();
      const currentStatus = getDIInitializationStatus();
      
      if (currentInitialized !== state.isInitialized || currentStatus !== state.status) {
        setState({
          isInitialized: currentInitialized,
          status: currentStatus
        });
      }
      
      return currentInitialized;
    };

    // 设置轮询检查
    const interval = setInterval(() => {
      if (checkStatus()) {
        clearInterval(interval);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [state.isInitialized, state.status]);

  return state;
}
