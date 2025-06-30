import { InitializationStatusDisplay } from "./initialization-status-display"

/**
 * 数据库初始化组件属性
 */
interface DatabaseInitializerProps {
  /** 是否显示初始化状态 */
  showStatus?: boolean
  /** 初始化完成回调 */
  onInitialized?: () => void
  /** 初始化失败回调 */
  onError?: (error: Error) => void
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
  onError
}: DatabaseInitializerProps) {
  const [status, setStatus] = useState<InitializationStatus>(InitializationStatus.PENDING)
  const [progress, setProgress] = useState<{ step: string; percentage: number }>({ 
    step: '准备初始化...', 
    percentage: 0 
  })
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    // 状态变化监听器
    const handleStatusChange = (newStatus: InitializationStatus) => {
      if (!mounted) return
      setStatus(newStatus)
      
      if (newStatus === InitializationStatus.COMPLETED && onInitialized) {
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
      console.log('数据库系统初始化完成')
    }

    // 注册事件监听器
    databaseInitializer.on('status-change', handleStatusChange)
    databaseInitializer.on('progress', handleProgress)
    databaseInitializer.on('error', handleError)
    databaseInitializer.on('completed', handleCompleted)

    // 启动初始化
    const initializeDatabase = async () => {
      try {
        // 检查是否已经初始化
        if (databaseInitializer.isInitialized()) {
          if (mounted && onInitialized) {
            onInitialized()
          }
          return
        }

        // 开始初始化
        await databaseInitializer.initialize()
      } catch (err) {
        console.error('数据库初始化失败:', err)
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
        initializeDatabase()
      }
    }, 100)

    // 清理函数
    return () => {
      mounted = false
      clearTimeout(initTimer)
      
      // 移除事件监听器
      databaseInitializer.off('status-change', handleStatusChange)
      databaseInitializer.off('progress', handleProgress)
      databaseInitializer.off('error', handleError)
      databaseInitializer.off('completed', handleCompleted)
    }
  }, [onInitialized, onError])

  // 如果不显示状态，返回null
  if (!showStatus) {
    return null
  }

  // 渲染状态显示界面
  return (
    <InitializationStatusDisplay
      status={status}
      progress={progress}
      error={error}
    />
  )
}

/**
 * 数据库初始化状态钩子
 *
 * 提供数据库初始化状态的响应式访问
 *
 * @returns 初始化状态信息
 */
export function useDatabaseInitialization() {
  const [status, setStatus] = useState<InitializationStatus>(
    databaseInitializer.getStatus()
  )
  const [isInitialized, setIsInitialized] = useState(
    databaseInitializer.isInitialized()
  )

  useEffect(() => {
    const handleStatusChange = (newStatus: InitializationStatus) => {
      setStatus(newStatus)
      setIsInitialized(newStatus === InitializationStatus.COMPLETED)
    }

    databaseInitializer.on('status-change', handleStatusChange)

    return () => {
      databaseInitializer.off('status-change', handleStatusChange)
    }
  }, [])

  return {
    status,
    isInitialized,
    isInitializing: status === InitializationStatus.INITIALIZING,
    isFailed: status === InitializationStatus.FAILED,
    isPending: status === InitializationStatus.PENDING
  }
}

export default DatabaseInitializer
