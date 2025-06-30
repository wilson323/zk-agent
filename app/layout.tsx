// @ts-nocheck
import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { SessionManager } from "@/components/auth/session-manager"
import { DatabaseInitializer } from "@/components/database/database-initializer"
import { DIInitializer } from "@/components/di/di-initializer"

// 导入reflect-metadata以支持装饰器元数据
import 'reflect-metadata'

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SessionManager />
        <DatabaseInitializer 
          showStatus={process.env.NODE_ENV === 'development'}
          onInitialized={() => {
            console.log('数据库系统初始化完成')
          }}
          onError={(error) => {
            console.error('数据库初始化失败:', error)
          }}
        />
        <DIInitializer 
          showStatus={process.env.NODE_ENV === 'development'}
          onInitialized={() => {
            console.log('依赖注入系统初始化完成')
          }}
          onError={(error) => {
            console.error('依赖注入初始化失败:', error)
          }}
        />
      </body>
    </html>
  )
}
