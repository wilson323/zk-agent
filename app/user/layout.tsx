/**
 * @file 用户端布局
 * @description 用户端页面的统一布局
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import { UserLayout } from '@/components/layout/user-layout';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: UserLayoutProps) {
  return (
    <UserLayout>
      {children}
    </UserLayout>
  );
}