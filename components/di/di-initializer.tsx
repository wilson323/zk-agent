import { InitializationStatusDisplay } from "@/components/database/initialization-status-display"
import { useState, useEffect } from 'react'
import { DIInitializationStatus, diInitializer } from '@/lib/di/initialization'
import { InitializationStatus } from '@/lib/database/initialization'

/**
 * 依赖注入初始化组件属性
 */
interface DIInitializerProps {
  /** 是否显示初始化状态 */
  showStatus?: boolean
  /** 初始化完成回调 */
  onInitialized?: () => void
  /** 初始化失败回调 */
  onError?: (error: Error) => void
}

/**
 * 依赖注入初始化组件
 *
 * 该组件负责在应用启动时自动初始化依赖注入系统。
 * 它会监听初始化状态变化，并在适当时机触发回调函数。
 *
 * 特性：
 * - 自动在组件挂载时启动依赖注入初始化
 * - 实时监听初始化状态和进度
 * - 支持错误处理
 * - 可选的状态显示界面
 * - 优雅的组件卸载处理
 *
 * @param props - 组件属性
 * @returns JSX元素或null
 */
export function DIInitializer({
  showStatus = false,
  onInitialized,
  onError
}: DIInitializerProps) {
  const [status, setStatus] = useState<DIInitializationStatus>(DIInitializationStatus.PENDING)
  const [progress, setProgress] = useState<{ step: string; percentage: number }>({ 
    step: '准备初始化...', 
    percentage: 0 
  })
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    // 状态变化监听器
    const handleStatusChange = (newStatus: DIInitializationStatus) => {
      if (!mounted) return
      setStatus(newStatus)
      
      if (newStatus === DIInitializationStatus.COMPLETED && onInitialized) {
        onInitialized()
      }
    }

    // 进度更新监听器
    const handleProgress = (step: string, percentage: number) => {
      if (!mounted) return
      setProgress({ step, percentage })
    }

    // 错误处理监听器
    const handleError = (err: Error) => {
      if (!mounted) return
      setError(err)
      if (onError) {
        onError(err)
      }
    }

    // 初始化完成监听器
    const handleCompleted = () => {
      if (!mounted) return
      console.log('依赖注入系统初始化完成')
    }

    // 注册事件监听器
    diInitializer.on('status-change', handleStatusChange)
    diInitializer.on('progress', handleProgress)
    diInitializer.on('error', handleError)
    diInitializer.on('completed', handleCompleted)

    // 启动初始化
    const initializeDI = async () => {
      try {
        // 检查是否已经初始化
        if (diInitializer.isInitialized()) {
          if (mounted && onInitialized) {
            onInitialized()
          }
          return
        }

        // 开始初始化
        await diInitializer.initialize()
      } catch (err) {
        console.error('依赖注入初始化失败:', err)
        if (mounted) {
          setError(err as Error)
          if (onError) {
            onError(err as Error)
          }
        }
      }
    }

    // 延迟启动初始化，确保应用完全加载
    const initTimer = setTimeout(() => {
      if (mounted) {
        initializeDI()
      }
    }, 100)

    // 清理函数
    return () => {
      mounted = false
      clearTimeout(initTimer)
      
      // 移除事件监听器
      diInitializer.off('status-change', handleStatusChange)
      diInitializer.off('progress', handleProgress)
      diInitializer.off('error', handleError)
      diInitializer.off('completed', handleCompleted)
    }
  }, [onInitialized, onError])

  // 如果不显示状态，返回null
  if (!showStatus) {
    return null
  }

  // 将 DIInitializationStatus 映射到 InitializationStatus
  const mapStatus = (diStatus: DIInitializationStatus): InitializationStatus => {
    switch (diStatus) {
      case DIInitializationStatus.PENDING:
        return InitializationStatus.PENDING
      case DIInitializationStatus.INITIALIZING:
        return InitializationStatus.INITIALIZING
      case DIInitializationStatus.COMPLETED:
        return InitializationStatus.COMPLETED
      case DIInitializationStatus.FAILED:
        return InitializationStatus.FAILED
      default:
        return InitializationStatus.PENDING
    }
  }

  // 渲染状态显示界面
  return (
    <InitializationStatusDisplay
      status={mapStatus(status)}
      progress={progress}
      error={error}
    />
  )
}

/**
 * 依赖注入初始化状态钩子
 *
 * 提供依赖注入初始化状态的响应式访问
 *
 * @returns 初始化状态信息
 */
export function useDIInitialization() {
  const [status, setStatus] = useState<DIInitializationStatus>(
    diInitializer.getStatus()
  )
  const [isInitialized, setIsInitialized] = useState(
    diInitializer.isInitialized()
  )

  useEffect(() => {
    const handleStatusChange = (newStatus: DIInitializationStatus) => {
      setStatus(newStatus)
      setIsInitialized(newStatus === DIInitializationStatus.COMPLETED)
    }

    diInitializer.on('status-change', handleStatusChange)

    return () => {
      diInitializer.off('status-change', handleStatusChange)
    }
  }, [])

  return {
    status,
    isInitialized,
    isInitializing: status === DIInitializationStatus.INITIALIZING,
    isFailed: status === DIInitializationStatus.FAILED,
    isPending: status === DIInitializationStatus.PENDING
  }
}

export default DIInitializer