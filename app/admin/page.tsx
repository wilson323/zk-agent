// @ts-nocheck
import Link from 'next/link'
import { 
  Database, 
  Activity, 
  Users, 
  Shield, 
  ArrowRight 
} from 'lucide-react'
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function AdminPage() {
  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">管理员仪表板</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          系统概览和关键指标监控
        </p>
      </div>

      {/* 快速导航卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {/* 数据库性能卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">正常</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            数据库性能
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            监控数据库性能指标和优化状态
          </p>
          <Link 
            href="/admin/database-performance"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            查看详情
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {/* 系统监控卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">运行中</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            系统监控
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            实时监控系统状态和性能指标
          </p>
          <Link 
            href="/admin/monitoring"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            查看详情
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {/* 用户管理卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">1,234</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            用户管理
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            管理用户账户和权限设置
          </p>
          <Link 
            href="/admin/users"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            查看详情
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {/* 安全中心卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">注意</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            安全中心
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            安全策略和访问控制管理
          </p>
          <Link 
            href="/admin/security"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            查看详情
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 系统指标 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            系统指标
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">CPU 使用率</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">45%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">内存使用率</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">62%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">磁盘使用率</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">78%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            最近活动
          </h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">数据库性能优化完成</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">2分钟前</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">新用户注册</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">5分钟前</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">系统备份开始</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">10分钟前</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">安全扫描完成</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">15分钟前</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
