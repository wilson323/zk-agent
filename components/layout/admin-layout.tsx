// @ts-nocheck
/**
 * @file 管理员端布局组件
 * @description 管理员界面的通用布局，包含侧边栏导航和顶部栏
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Database,
  Users,
  Settings,
  Shield,
  Activity,
  BarChart3,
  Bot,
  MessageSquare,
  Zap,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Search,
  Home,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * 管理员导航菜单项 - 优化后的结构
 */
const adminNavItems = [
  {
    title: '仪表板',
    href: '/admin',
    icon: LayoutDashboard,
    description: '系统概览和关键指标',
  },
  {
    title: '智能体管理',
    href: '/admin/agents',
    icon: Bot,
    description: '管理所有智能体',
    children: [
      {
        title: '所有智能体',
        href: '/admin/agents',
        description: '查看所有智能体',
      },
      {
        title: 'FastGPT智能体',
        href: '/admin/agents/fastgpt',
        description: 'FastGPT智能体列表和更新',
      },
      {
        title: 'CAD分析智能体',
        href: '/admin/agents/cad',
        description: 'CAD分析智能体管理',
      },
      {
        title: '海报生成智能体',
        href: '/admin/agents/poster',
        description: '海报生成智能体管理',
      },
      {
        title: '自研智能体',
        href: '/admin/agents/custom',
        description: '自研智能体管理',
      },
    ],
  },
  {
    title: '对话管理',
    href: '/admin/conversations',
    icon: MessageSquare,
    description: '对话记录和分析',
    children: [
      {
        title: '实时对话',
        href: '/admin/conversations/live',
        description: '监控实时对话',
      },
      {
        title: '对话历史',
        href: '/admin/conversations/history',
        description: '查看对话历史记录',
      },
      {
        title: '对话分析',
        href: '/admin/conversations/analytics',
        description: '分析对话数据',
      },
    ],
  },
  {
    title: '用户管理',
    href: '/admin/users',
    icon: Users,
    description: '用户账户和权限管理',
    children: [
      {
        title: '用户列表',
        href: '/admin/users',
        description: '管理系统用户',
      },
      {
        title: '角色权限',
        href: '/admin/users/roles',
        description: '管理角色和权限',
      },
      {
        title: '访问日志',
        href: '/admin/users/access-logs',
        description: '用户访问日志记录',
      },
    ],
  },
  {
    title: '系统监控',
    href: '/admin/monitoring',
    icon: Activity,
    description: '实时系统状态监控',
    children: [
      {
        title: '数据库性能',
        href: '/admin/database-performance',
        description: '数据库性能监控和优化',
      },
      {
        title: '系统状态',
        href: '/admin/monitoring/status',
        description: '实时系统状态监控',
      },
      {
        title: '性能分析',
        href: '/admin/analytics',
        description: '系统性能和使用分析',
      },
      {
        title: '错误日志',
        href: '/admin/error-monitoring',
        description: '系统错误日志管理',
      },
    ],
  },
  {
    title: '安全中心',
    href: '/admin/security',
    icon: Shield,
    description: '安全策略和访问控制',
    children: [
      {
        title: '安全扫描',
        href: '/admin/security/scan',
        description: '系统安全漏洞扫描',
      },
      {
        title: '访问控制',
        href: '/admin/security/access',
        description: '访问控制策略管理',
      },
      {
        title: '安全审计',
        href: '/admin/security/audit',
        description: '安全审计日志',
      },
      {
        title: '代码审查',
        href: '/admin/security/code-review',
        description: '代码安全审查',
      },
    ],
  },
  {
    title: '系统配置',
    href: '/admin/settings',
    icon: Settings,
    description: '系统配置和参数设置',
    children: [
      {
        title: 'API配置',
        href: '/admin/api-config',
        description: 'API接口配置管理',
      },
      {
        title: '模型管理',
        href: '/admin/ai-models',
        description: 'AI模型配置管理',
      },
      {
        title: '系统参数',
        href: '/admin/settings/system',
        description: '系统核心参数配置',
      },
      {
        title: '备份恢复',
        href: '/admin/settings/backup',
        description: '数据备份和恢复',
      },
    ],
  },
];

/**
 * 侧边栏导航组件
 */
function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href) ? prev.filter(item => item !== href) : [...prev, href]
    );
  };

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 transform bg-white/90 border-r border-gray-200/50 transition-transform duration-300 ease-in-out dark:bg-gray-900/90 dark:border-gray-800/50 backdrop-blur-md',
          'lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg glow-primary animate-pulse">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">管理中心</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">ZK-Agent Admin</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-primary/10 hover:text-primary transition-all duration-300"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 导航菜单 */}
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-2">
            {adminNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.includes(item.href);

              return (
                <div key={item.href} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  {/* 主菜单项 */}
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer hover:scale-105',
                      isActive
                        ? 'bg-gradient-primary text-white shadow-lg glow-primary'
                        : 'text-gray-600 hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20 dark:hover:text-primary-light'
                    )}
                    onClick={() => {
                      if (hasChildren) {
                        toggleExpanded(item.href);
                      }
                    }}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`} />
                    <span className="flex-1">{item.title}</span>
                    {hasChildren && (
                      <div
                        className={cn(
                          'transition-transform duration-200',
                          isExpanded ? 'rotate-90' : ''
                        )}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* 如果没有子菜单，直接链接 */}
                  {!hasChildren && (
                    <Link href={item.href} className="block" onClick={onClose}>
                      <div
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover-lift hover:scale-105',
                          isActive
                            ? 'bg-gradient-primary text-white shadow-lg glow-primary'
                            : 'text-gray-600 hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20 dark:hover:text-primary-light'
                        )}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`} />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  )}

                  {/* 子菜单 */}
                  {hasChildren && isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children?.map(child => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              'block px-3 py-2 rounded-lg text-sm transition-colors',
                              isChildActive
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                            )}
                          >
                            {child.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>

        {/* 侧边栏底部 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors"
          >
            <Home className="h-4 w-4" />
            返回用户端
          </Link>
        </div>
      </aside>
    </>
  );
}

/**
 * 管理员用户菜单
 */
function AdminUserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/admin.png" alt="管理员头像" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">管理员</p>
            <p className="text-xs leading-none text-muted-foreground">admin@zk-agent.com</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            个人资料
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            系统设置
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2 text-red-600">
          <LogOut className="h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 管理员端布局组件
 */
export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 dark:from-gray-900 dark:via-gray-800 dark:to-primary/20">
      <div className="absolute inset-0 particles-bg opacity-10"></div>
      {/* 侧边栏 */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 主要内容区域 */}
      <div className="lg:ml-64">
        {/* 顶部导航栏 */}
        <header className="relative sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50 transition-all duration-300">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            {/* 左侧：菜单按钮和Logo */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover-lift hover:bg-primary/10 hover:text-primary transition-all duration-300"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">打开菜单</span>
              </Button>
              
              <div className="flex items-center gap-2 hover-lift">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center glow-primary animate-pulse shadow-lg">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent animate-fade-in">
                  ZK Agent 管理后台
                </h1>
              </div>
            </div>

            {/* 右侧：搜索和用户菜单 */}
            <div className="flex items-center gap-4">
              {/* 搜索框 */}
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索..."
                    className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* 通知按钮 */}
              <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 hover:text-primary transition-all duration-300 hover:scale-105">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="sr-only">通知</span>
              </Button>

              {/* 用户菜单 */}
              <AdminUserMenu />
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;