import type React from "react"

export function BackgroundDecorations() {
  return (
    <>
      {/* 网格背景 */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25" />
      
      {/* 渐变光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-3xl" />
      
      {/* 浮动装饰元素 */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-blue-500/30 rounded-full animate-pulse" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-purple-500/30 rounded-full animate-pulse delay-1000" />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-green-500/30 rounded-full animate-pulse delay-2000" />
    </>
  )
}
