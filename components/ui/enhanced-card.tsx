// @ts-nocheck
/**
 * @file Enhanced Card Component
 * @description 增强卡片组件，包含悬浮动画、渐变背景选项，向后兼容
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const enhancedCardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow transition-all duration-300 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "shadow-lg hover:shadow-xl",
        outlined: "border-2 border-primary/20 hover:border-primary/40",
        ghost: "border-transparent bg-transparent hover:bg-accent/50",
        gradient: "bg-gradient-to-br from-background to-accent/20 border-primary/20"
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-10"
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:shadow-lg",
        scale: "hover:scale-[1.02]",
        glow: "hover:shadow-2xl hover:shadow-primary/10"
      },
      animation: {
        none: "",
        fade: "animate-in fade-in-0 duration-500",
        slide: "animate-in slide-in-from-bottom-4 duration-500",
        zoom: "animate-in zoom-in-95 duration-300"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      hover: "none",
      animation: "none"
    },
  }
)

export interface EnhancedCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof enhancedCardVariants> {
  gradient?: boolean
  shimmer?: boolean
  interactive?: boolean
  loading?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
}

const EnhancedCard = React.forwardRef<HTMLDivElement, EnhancedCardProps>(
  ({ 
    className, 
    variant, 
    size, 
    hover,
    animation,
    gradient = false,
    shimmer = false,
    interactive = false,
    loading = false,
    header,
    footer,
    children,
    ...props 
  }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false)

    const cardVariant = gradient ? "gradient" : variant

    return (
      <motion.div
        ref={ref}
        className={cn(enhancedCardVariants({ variant: cardVariant, size, hover, animation, className }))}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={interactive ? { scale: 1.02, y: -4 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        {...props}
      >
        {/* 渐变背景层 */}
        {gradient && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />
        )}

        {/* 光泽扫过效果 */}
        {shimmer && (
          <div className="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-1000 ease-out" />
        )}

        {/* 悬浮发光效果 */}
        {isHovered && hover === "glow" && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl blur-xl opacity-50 -z-10" />
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
            <motion.div
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        {/* 内容区域 */}
        <div className="relative z-10 h-full flex flex-col">
          {/* 头部 */}
          {header && (
            <div className="mb-4 pb-4 border-b border-border/50">
              {header}
            </div>
          )}

          {/* 主要内容 */}
          <div className="flex-1">
            {children}
          </div>

          {/* 底部 */}
          {footer && (
            <div className="mt-4 pt-4 border-t border-border/50">
              {footer}
            </div>
          )}
        </div>

        {/* 交互指示器 */}
        {interactive && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
        )}
      </motion.div>
    )
  }
)

EnhancedCard.displayName = "EnhancedCard"

// 子组件
const EnhancedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
EnhancedCardHeader.displayName = "EnhancedCardHeader"

const EnhancedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
EnhancedCardTitle.displayName = "EnhancedCardTitle"

const EnhancedCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
EnhancedCardDescription.displayName = "EnhancedCardDescription"

const EnhancedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
EnhancedCardContent.displayName = "EnhancedCardContent"

const EnhancedCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
))
EnhancedCardFooter.displayName = "EnhancedCardFooter"

export {
  EnhancedCard,
  EnhancedCardHeader,
  EnhancedCardFooter,
  EnhancedCardTitle,
  EnhancedCardDescription,
  EnhancedCardContent,
  enhancedCardVariants
}

export default EnhancedCard 