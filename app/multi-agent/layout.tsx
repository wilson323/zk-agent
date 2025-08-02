'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  Settings,
  Zap,
  BarChart3,
} from 'lucide-react';

const navigationItems = [
  {
    title: '控制中心',
    href: '/multi-agent',
    icon: BarChart3,
    description: '多智能体系统概览',
  },
  {
    title: '团队管理',
    href: '/multi-agent/management',
    icon: Users,
    description: '智能体团队管理',
  },
  {
    title: 'LangChain演示',
    href: '/multi-agent/langchain-demo',
    icon: Zap,
    description: 'LangChain工作流演示',
  },
];

export default function MultiAgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800'>
      <div className='container mx-auto px-4 py-6'>
        {/* 导航栏 */}
        <Card className='mb-6 p-4'>
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              多智能体系统
            </h1>
          </div>
          
          <nav className='flex gap-2'>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className='flex items-center gap-2'
                  >
                    <Icon className='h-4 w-4' />
                    {item.title}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </Card>
        
        {/* 页面内容 */}
        {children}
      </div>
    </div>
  );
}
