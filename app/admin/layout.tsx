/**
 * @file 管理员页面布局
 * @description 管理员界面的通用布局，包含导航菜单
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Toaster } from '@/components/ui/toaster';

interface AdminLayoutPageProps {
  children: React.ReactNode;
}

export default function AdminLayoutPage({ children }: AdminLayoutPageProps) {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminLayout>
        {children}
        <Toaster />
      </AdminLayout>
    </ProtectedRoute>
  );
}
