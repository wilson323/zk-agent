/**
 * @file 管理员页面布局
 * @description 管理员界面的通用布局，包含导航菜单
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { 
  LayoutDashboard, 
  Database, 
  AlertTriangle, 
  Settings, 
  Users, 
  BarChart3,
  Shield,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 管理员导航菜单项
 */
const adminNavItems = [
  {
    title: '仪表板',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    description: '系统概览和关键指标'
  },
  {
    title: '数据库性能',
    href: '/admin/database-performance',
    icon: Database,
    description: '数据库性能监控和优化'
  },
  {
    title: '错误监控',
    href: '/admin/error-monitoring',
    icon: AlertTriangle,
    description: '系统错误和异常监控'
  },
  {
    title: '用户管理',
    href: '/admin/users',
    icon: Users,
    description: '用户账户和权限管理'
  },
  {
    title: '系统设置',
    href: '/admin/settings',
    icon: Settings,
    description: '系统配置和参数设置'
  },
  {
    title: '安全中心',
    href: '/admin/security',
    icon: Shield,
    description: '安全策略和访问控制'
  },
  {
    title: '性能分析',
    href: '/admin/analytics',
    icon: BarChart3,
    description: '系统性能和使用分析'
  },
  {
    title: '系统监控',
    href: '/admin/monitoring',
    icon: Activity,
    description: '实时系统状态监控'
  }
]

/**
 * 管理员导航组件
 */
function AdminNavigation() {
  const pathname = usePathname()

  return (
    <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto">
      {/* 导航标题 */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">管理中心</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">系统管理和监控</p>
      </div>

      {/* 导航菜单 */}
      <div className="p-4">
        <ul className="space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center p-3 rounded-lg transition-colors group',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 mr-3',
                    isActive
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                  )} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 快速状态指示器 */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              系统运行正常
            </span>
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            所有服务正常运行
          </p>
        </div>
      </div>
    </nav>
  )
}

/**
 * 管理员页面布局组件
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex h-screen">
          {/* 侧边导航 */}
          <AdminNavigation />
          
          {/* 主内容区域 */}
          <main className="flex-1 overflow-y-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
