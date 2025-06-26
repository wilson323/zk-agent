// @ts-nocheck
/**
 * @file Optimized Image Component
 * @description 智能图片优化组件，支持WebP/AVIF格式、智能占位符和错误处理，保持完全相同的视觉效果
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import * as React from "react"
import Image, { ImageProps } from "next/image"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface OptimizedImageProps extends Omit<ImageProps, 'placeholder'> {
  fallbackSrc?: string
  showPlaceholder?: boolean
  placeholderClassName?: string
  errorClassName?: string
  loadingClassName?: string
  enableLazyLoading?: boolean
  enableBlurPlaceholder?: boolean
  enableProgressiveLoading?: boolean
  quality?: number
  formats?: ('webp' | 'avif' | 'jpeg' | 'png')[]
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onError?: (error: Error) => void
}

interface ImageState {
  isLoading: boolean
  isError: boolean
  isLoaded: boolean
  loadProgress: number
  currentSrc: string
}

const OptimizedImage = React.forwardRef<HTMLImageElement, OptimizedImageProps>(
  ({
    src,
    alt,
    className,
    fallbackSrc,
    showPlaceholder = true,
    placeholderClassName,
    errorClassName,
    loadingClassName,
    enableLazyLoading = true,
    enableBlurPlaceholder = true,
    enableProgressiveLoading = true,
    quality = 85,
    formats = ['avif', 'webp', 'jpeg'],
    onLoadStart,
    onLoadComplete,
    onError,
    ...props
  }, ref) => {
    const [state, setState] = React.useState<ImageState>({
      isLoading: true,
      isError: false,
      isLoaded: false,
      loadProgress: 0,
      currentSrc: typeof src === 'string' ? src : ''
    })

    const [supportedFormats, setSupportedFormats] = React.useState<Set<string>>(new Set())
    const imageRef = React.useRef<HTMLImageElement>(null)
    const observerRef = React.useRef<IntersectionObserver | null>(null)
    const [isInView, setIsInView] = React.useState(!enableLazyLoading)

    // 合并refs
    React.useImperativeHandle(ref, () => imageRef.current!)

    // 检测浏览器支持的图片格式
    React.useEffect(() => {
      const checkFormatSupport = async () => {
        const supported = new Set<string>()

        // 检测WebP支持
        const webpSupport = await checkImageFormatSupport('webp')
        if (webpSupport) {supported.add('webp')}

        // 检测AVIF支持
        const avifSupport = await checkImageFormatSupport('avif')
        if (avifSupport) {supported.add('avif')}

        // JPEG和PNG默认支持
        supported.add('jpeg')
        supported.add('png')

        setSupportedFormats(supported)
      }

      checkFormatSupport()
    }, [])

    // 检测图片格式支持
    const checkImageFormatSupport = (format: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const testImages = {
          webp: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',
          avif: 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
        }

        const img = new Image()
        img.onload = () => resolve(img.width === 1 && img.height === 1)
        img.onerror = () => resolve(false)
        img.src = testImages[format as keyof typeof testImages] || ''
      })
    }

    // 获取最优图片源
    const getOptimizedSrc = React.useCallback((originalSrc: string): string => {
      if (typeof originalSrc !== 'string') {return originalSrc}

      // 如果是外部链接，直接返回
      if (originalSrc.startsWith('http') || originalSrc.startsWith('//')) {
        return originalSrc
      }

      // 选择最佳格式
      const bestFormat = formats.find(format => supportedFormats.has(format)) || 'jpeg'
      
      // 构建优化后的URL（假设使用Next.js Image Optimization）
      const params = new URLSearchParams({
        url: originalSrc,
        w: props.width?.toString() || '1920',
        q: quality.toString(),
        f: bestFormat
      })

      return `/_next/image?${params.toString()}`
    }, [supportedFormats, formats, quality, props.width])

    // 懒加载观察器
    React.useEffect(() => {
      if (!enableLazyLoading || !imageRef.current) {return}

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observerRef.current?.disconnect()
          }
        },
        {
          rootMargin: '50px' // 提前50px开始加载
        }
      )

      observerRef.current.observe(imageRef.current)

      return () => {
        observerRef.current?.disconnect()
      }
    }, [enableLazyLoading])

    // 处理图片加载
    const handleImageLoad = React.useCallback(() => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isLoaded: true,
        loadProgress: 100
      }))
      onLoadComplete?.()
    }, [onLoadComplete])

    // 处理图片错误
    const handleImageError = React.useCallback((error: React.SyntheticEvent<HTMLImageElement>) => {
      const errorObj = new Error(`Failed to load image: ${state.currentSrc}`)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true
      }))

      // 尝试使用fallback图片
      if (fallbackSrc && state.currentSrc !== fallbackSrc) {
        setState(prev => ({
          ...prev,
          currentSrc: fallbackSrc,
          isError: false,
          isLoading: true
        }))
      }

      onError?.(errorObj)
    }, [fallbackSrc, state.currentSrc, onError])

    // 处理加载开始
    const handleLoadStart = React.useCallback(() => {
      setState(prev => ({
        ...prev,
        isLoading: true,
        isError: false,
        loadProgress: 0
      }))
      onLoadStart?.()
    }, [onLoadStart])

    // 模拟加载进度（用于渐进式加载）
    React.useEffect(() => {
      if (!state.isLoading || !enableProgressiveLoading) {return}

      const interval = setInterval(() => {
        setState(prev => {
          if (prev.loadProgress >= 90) {
            clearInterval(interval)
            return prev
          }
          return {
            ...prev,
            loadProgress: Math.min(prev.loadProgress + Math.random() * 20, 90)
          }
        })
      }, 200)

      return () => clearInterval(interval)
    }, [state.isLoading, enableProgressiveLoading])

    // 更新图片源
    React.useEffect(() => {
      if (typeof src === 'string' && supportedFormats.size > 0) {
        const optimizedSrc = getOptimizedSrc(src)
        setState(prev => ({
          ...prev,
          currentSrc: optimizedSrc
        }))
      }
    }, [src, supportedFormats, getOptimizedSrc])

    // 生成占位符
    const generatePlaceholder = React.useCallback((width: number, height: number): string => {
      // 生成简单的SVG占位符
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="sans-serif" font-size="14">
            ${alt || 'Loading...'}
          </text>
        </svg>
      `
      return `data:image/svg+xml;base64,${btoa(svg)}`
    }, [alt])

    // 如果不在视图中且启用了懒加载，显示占位符
    if (!isInView && enableLazyLoading) {
      return (
        <div
          ref={imageRef}
          className={cn(
            "bg-muted animate-pulse flex items-center justify-center",
            className,
            placeholderClassName
          )}
          style={{
            width: props.width,
            height: props.height,
            aspectRatio: props.width && props.height ? `${props.width}/${props.height}` : undefined
          }}
        >
          {showPlaceholder && (
            <span className="text-muted-foreground text-sm">
              {alt || 'Loading...'}
            </span>
          )}
        </div>
      )
    }

    return (
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          {state.isLoading && showPlaceholder && (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute inset-0 bg-muted flex items-center justify-center",
                placeholderClassName,
                loadingClassName
              )}
            >
              {enableProgressiveLoading && (
                <div className="absolute bottom-0 left-0 h-1 bg-primary transition-all duration-300"
                     style={{ width: `${state.loadProgress}%` }} />
              )}
              <span className="text-muted-foreground text-sm">
                {alt || 'Loading...'}
              </span>
            </motion.div>
          )}

          {state.isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                "absolute inset-0 bg-destructive/10 flex items-center justify-center",
                errorClassName
              )}
            >
              <span className="text-destructive text-sm">
                Failed to load image
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <Image
          ref={imageRef}
          src={state.currentSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            state.isLoaded ? "opacity-100" : "opacity-0",
            className
          )}
          placeholder={enableBlurPlaceholder ? "blur" : "empty"}
          blurDataURL={enableBlurPlaceholder ? generatePlaceholder(20, 20) : undefined}
          quality={quality}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onLoadStart={handleLoadStart}
          {...props}
        />
      </div>
    )
  }
)

OptimizedImage.displayName = "OptimizedImage"

export { OptimizedImage }
export default OptimizedImage
