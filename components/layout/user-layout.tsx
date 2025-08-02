// @ts-nocheck
/**
 * @file 用户端布局组件
 * @description 用户端界面的通用布局，包含导航和侧边栏
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  MessageSquare,
  Store,
  User,
  Settings,
  LogOut,
  Menu,
  Sparkles,
  Home,
  Search,
} from 'lucide-react';

interface UserLayoutProps {
  children: React.ReactNode;
}

/**
 * 用户端导航菜单项
 */
const userNavItems = [
  {
    title: '首页',
    href: '/',
    icon: Home,
    description: '返回主页',
  },
  {
    title: '智能体对话',
    href: '/chat',
    icon: MessageSquare,
    description: '与AI智能体对话',
  },
  {
    title: '智能体广场',
    href: '/agents',
    icon: Store,
    description: '浏览和发现智能体',
  },
  {
    title: '搜索',
    href: '/search',
    icon: Search,
    description: '搜索智能体和内容',
  },
];

/**
 * 移动端导航菜单
 */
function MobileNavigation() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden hover-lift">
          <Menu className="h-5 w-5" />
          <span className="sr-only">打开菜单</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-4 py-6 border-b">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg glow-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              ZK-Agent
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4">
            <ul className="space-y-2">
              {userNavItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover-lift',
                          isActive
                            ? 'bg-gradient-primary text-white shadow-lg glow-primary'
                            : 'text-gray-600 hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20 dark:hover:text-primary-light'
                        )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * 用户菜单
 */
function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full hover-lift">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/avatars/user.png" alt="用户头像" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">用户名</p>
            <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            个人资料
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            设置
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
 * 用户端布局组件
 */
export function UserLayout({ children }: UserLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80 dark:border-gray-800 transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo 和移动端菜单 */}
            <div className="flex items-center gap-4">
              <MobileNavigation />
              <Link href="/" className="flex items-center gap-2 hover-lift">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg glow-primary">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                  ZK-Agent
                </span>
              </Link>
            </div>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center space-x-6">
              {userNavItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover-lift',
                      isActive
                        ? 'bg-gradient-primary text-white shadow-lg glow-primary'
                        : 'text-gray-600 hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-primary/20 dark:hover:text-primary-light'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>

            {/* 用户菜单 */}
            <div className="flex items-center gap-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 底部信息 */}
      <footer className="border-t bg-white/50 backdrop-blur-sm dark:bg-gray-900/50 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Sparkles className="h-4 w-4" />
              <span>© 2024 ZK-Agent. 智能体宇宙平台</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/about" className="hover:text-gray-900 dark:hover:text-gray-100">
                关于我们
              </Link>
              <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-gray-100">
                隐私政策
              </Link>
              <Link href="/terms" className="hover:text-gray-900 dark:hover:text-gray-100">
                服务条款
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default UserLayout;