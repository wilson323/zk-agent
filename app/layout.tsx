// @ts-nocheck
import type React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SessionManager } from '@/components/auth/session-manager';
import { DatabaseInitializer } from '@/components/database/database-initializer';
import { DIInitializer } from '@/components/di/di-initializer';

// 导入reflect-metadata以支持装饰器元数据
import 'reflect-metadata';

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body>
        <AuthProvider>
          {children}
          <SessionManager />
          <DatabaseInitializer
            showStatus={process.env.NODE_ENV === 'development'}
          />
          <DIInitializer
            showStatus={process.env.NODE_ENV === 'development'}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
