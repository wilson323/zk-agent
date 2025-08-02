# 跨多端自适应设计完整方案

## 🌍 设计理念

### 核心原则

1. **移动优先**：从最小屏幕开始设计，逐步增强
2. **内容优先**：确保核心功能在所有设备上都可访问
3. **渐进增强**：根据设备能力提供不同体验层次
4. **性能至上**：针对不同设备优化性能表现
5. **无障碍包容**：确保所有用户都能正常使用

## 📱 设备矩阵定义

### 完整断点体系

```typescript
// 详细断点定义
export const BREAKPOINTS = {
  // 移动端
  xs: 320, // 小屏手机 (iPhone SE)
  sm: 375, // 标准手机 (iPhone 12)
  md: 414, // 大屏手机 (iPhone 12 Pro Max)
  lg: 768, // 平板竖屏 (iPad)
  xl: 1024, // 平板横屏 / 小笔记本
  '2xl': 1280, // 标准桌面
  '3xl': 1440, // 大屏桌面
  '4xl': 1920, // 全高清
  '5xl': 2560, // 2K显示器
  '6xl': 3840, // 4K显示器
} as const;

// 设备类型检测
export const DEVICE_TYPES = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  touch: '(hover: none) and (pointer: coarse)',
  mouse: '(hover: hover) and (pointer: fine)',
  highDPI: '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  landscape: '(orientation: landscape)',
  portrait: '(orientation: portrait)',
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
  prefersDarkMode: '(prefers-color-scheme: dark)',
  prefersHighContrast: '(prefers-contrast: high)',
} as const;
```

### 设备特性适配

```typescript
// 智能设备检测Hook
export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    hasTouch: false,
    pixelRatio: 1,
    orientation: 'landscape',
    connectionSpeed: '4g',
    batteryLevel: 1,
    memoryInfo: null,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo({
        type: getDeviceType(),
        hasTouch: 'ontouchstart' in window,
        pixelRatio: window.devicePixelRatio || 1,
        orientation: screen.orientation?.type || 'landscape-primary',
        connectionSpeed: (navigator as any).connection?.effectiveType || '4g',
        batteryLevel: (navigator as any).battery?.level || 1,
        memoryInfo: (performance as any).memory || null,
      });
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};
```

## 🎨 响应式UI组件系统

### 智能体卡片自适应

```tsx
// 响应式智能体卡片
const ResponsiveAgentCard = ({ agent, index }) => {
  const deviceInfo = useDeviceDetection();
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });

  // 根据设备类型调整动画复杂度
  const animationComplexity = useMemo(() => {
    if (
      deviceInfo.connectionSpeed === 'slow-2g' ||
      deviceInfo.memoryInfo?.usedJSHeapSize > 50000000
    ) {
      return 'minimal';
    }
    if (deviceInfo.type === 'mobile') return 'medium';
    return 'full';
  }, [deviceInfo]);

  return (
    <motion.div
      className={cn(
        'group relative cursor-pointer',
        // 基础尺寸
        'w-full',
        // 移动端优化
        'mobile:p-4 mobile:rounded-2xl',
        // 平板端优化
        'tablet:p-6 tablet:rounded-3xl',
        // 桌面端优化
        'desktop:p-8 desktop:rounded-3xl',
        // 触摸设备优化
        'touch:min-h-[200px]',
        // 鼠标设备优化
        'mouse:hover:scale-105'
      )}
      initial={{
        y: deviceInfo.type === 'mobile' ? 50 : 100,
        opacity: 0,
        rotateY: deviceInfo.type === 'mobile' ? 0 : -15,
      }}
      animate={{
        y: 0,
        opacity: 1,
        rotateY: 0,
      }}
      transition={{
        delay: 1.2 + index * (deviceInfo.type === 'mobile' ? 0.1 : 0.2),
        duration: deviceInfo.type === 'mobile' ? 0.5 : 0.8,
        type: 'spring',
        stiffness: deviceInfo.type === 'mobile' ? 200 : 100,
      }}
      whileHover={
        deviceInfo.hasTouch
          ? {}
          : {
              y: -15,
              scale: 1.05,
              rotateY: 8,
              transition: { duration: 0.3 },
            }
      }
      whileTap={{ scale: 0.98 }}
    >
      {/* 卡片内容根据设备类型动态调整 */}
      <AdaptiveCardContent
        agent={agent}
        deviceInfo={deviceInfo}
        animationComplexity={animationComplexity}
      />
    </motion.div>
  );
};

// 自适应卡片内容
const AdaptiveCardContent = ({ agent, deviceInfo, animationComplexity }) => {
  return (
    <div
      className={cn(
        'relative backdrop-blur-xl border rounded-3xl shadow-lg transition-all duration-500 overflow-hidden',
        // 移动端样式
        'mobile:bg-white/90 mobile:border-gray-200/50 mobile:p-4',
        // 平板端样式
        'tablet:bg-white/95 tablet:border-gray-200/30 tablet:p-6',
        // 桌面端样式
        'desktop:bg-white/95 desktop:border-gray-200/20 desktop:p-8',
        // 暗色模式
        'dark:mobile:bg-gray-800/90 dark:tablet:bg-gray-800/95 dark:desktop:bg-gray-800/95',
        'dark:border-gray-700/50'
      )}
    >
      {/* 响应式图标区域 */}
      <div
        className={cn('relative mb-4 text-center', 'mobile:mb-3', 'tablet:mb-4', 'desktop:mb-6')}
      >
        <motion.div
          className={cn(
            'mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-xl relative overflow-hidden',
            // 移动端尺寸
            'mobile:w-16 mobile:h-16 mobile:text-3xl',
            // 平板端尺寸
            'tablet:w-20 tablet:h-20 tablet:text-4xl',
            // 桌面端尺寸
            'desktop:w-24 desktop:h-24 desktop:text-5xl',
            agent.gradient
          )}
          animate={
            animationComplexity === 'full'
              ? {
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }
              : {}
          }
          transition={
            animationComplexity === 'full'
              ? {
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : {}
          }
        >
          <span className='relative z-10'>{agent.icon}</span>

          {/* 光效仅在高性能设备上显示 */}
          {animationComplexity === 'full' && (
            <motion.div
              className='absolute inset-0 bg-white rounded-2xl'
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* 热度指示器 */}
        <div className={cn('flex items-center justify-center space-x-2 mt-2', 'mobile:space-x-1')}>
          <div className='flex space-x-1'>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 1.5 + index * 0.2 + i * 0.05,
                  type: 'spring',
                }}
                className={cn(
                  'rounded-full',
                  'mobile:w-1 mobile:h-1',
                  'tablet:w-1.5 tablet:h-1.5',
                  'desktop:w-1.5 desktop:h-1.5',
                  i < Math.floor(agent.popularity / 20)
                    ? `bg-gradient-to-r ${agent.gradient}`
                    : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            ))}
          </div>
          <span
            className={cn(
              'text-gray-500 dark:text-gray-400 font-medium',
              'mobile:text-xs',
              'tablet:text-xs',
              'desktop:text-xs'
            )}
          >
            热度 {agent.popularity}%
          </span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className='relative z-10 text-center'>
        <motion.h3
          className={cn(
            'font-bold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 transition-colors duration-300',
            'mobile:text-lg mobile:mb-2',
            'tablet:text-xl tablet:mb-3',
            'desktop:text-2xl desktop:mb-3'
          )}
        >
          {agent.name}
        </motion.h3>

        <p
          className={cn(
            'text-gray-600 dark:text-gray-300 leading-relaxed mb-4',
            'mobile:text-sm mobile:mb-3 mobile:line-clamp-2',
            'tablet:text-sm tablet:mb-4 tablet:line-clamp-3',
            'desktop:text-sm desktop:mb-6'
          )}
        >
          {agent.description}
        </p>

        {/* 特性标签 - 根据设备显示数量 */}
        <div
          className={cn(
            'flex flex-wrap gap-2 justify-center mb-4',
            'mobile:gap-1 mobile:mb-3',
            'tablet:gap-2 tablet:mb-4',
            'desktop:gap-2 desktop:mb-6'
          )}
        >
          {agent.features
            .slice(0, deviceInfo.type === 'mobile' ? 2 : deviceInfo.type === 'tablet' ? 3 : 4)
            .map((feature, idx) => (
              <motion.span
                key={idx}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 1.5 + index * 0.2 + idx * 0.1,
                  type: 'spring',
                  stiffness: 200,
                }}
                className={cn(
                  'bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 rounded-full backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50',
                  'mobile:px-2 mobile:py-1 mobile:text-xs',
                  'tablet:px-3 tablet:py-1 tablet:text-xs',
                  'desktop:px-3 desktop:py-1 desktop:text-xs'
                )}
              >
                {feature}
              </motion.span>
            ))}
        </div>

        {/* 行动按钮 */}
        <motion.button
          whileHover={deviceInfo.hasTouch ? {} : { scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'w-full rounded-xl bg-gradient-to-r text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden',
            'mobile:py-2.5 mobile:text-sm',
            'tablet:py-3 tablet:text-base',
            'desktop:py-3 desktop:text-base',
            agent.gradient
          )}
          onClick={() => (window.location.href = agent.route)}
        >
          <span className='relative z-10 flex items-center justify-center'>
            立即体验
            <motion.span
              className='ml-2'
              animate={deviceInfo.hasTouch ? {} : { x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              →
            </motion.span>
          </span>

          {/* 按钮光效仅在高性能设备显示 */}
          {animationComplexity === 'full' && (
            <motion.div
              className='absolute inset-0 bg-white/20 rounded-xl'
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
            />
          )}
        </motion.button>
      </div>

      {/* 装饰元素根据性能调整 */}
      {animationComplexity !== 'minimal' && (
        <>
          <div className='absolute top-4 right-4 w-2 h-2 bg-primary-400 rounded-full opacity-50 group-hover:opacity-100 transition-opacity' />
          <motion.div
            className={cn(
              'absolute bottom-0 left-0 h-1 bg-gradient-to-r rounded-b-3xl',
              agent.gradient
            )}
            initial={{ width: '0%' }}
            animate={{ width: '30%' }}
            whileHover={{ width: '100%' }}
            transition={{ duration: 0.3 }}
          />
        </>
      )}
    </div>
  );
};
```

## 🎭 中央吉祥物跨端适配

### 智能动画系统

```tsx
// 自适应吉祥物组件
const AdaptiveCentralMascot = () => {
  const deviceInfo = useDeviceDetection();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // 根据设备性能调整动画复杂度
  const animationLevel = useMemo(() => {
    if (prefersReducedMotion) return 'none';
    if (deviceInfo.memoryInfo?.usedJSHeapSize > 100000000) return 'minimal';
    if (deviceInfo.type === 'mobile' && deviceInfo.batteryLevel < 0.2) return 'minimal';
    if (deviceInfo.connectionSpeed === 'slow-2g') return 'minimal';
    return deviceInfo.type === 'mobile' ? 'medium' : 'full';
  }, [deviceInfo, prefersReducedMotion]);

  // 响应式尺寸
  const mascotSize = {
    mobile: { width: 200, height: 200, iconSize: '4xl', orbitRadius: 80 },
    tablet: { width: 280, height: 280, iconSize: '6xl', orbitRadius: 120 },
    desktop: { width: 320, height: 320, iconSize: '8xl', orbitRadius: 150 },
  }[deviceInfo.type] || { width: 320, height: 320, iconSize: '8xl', orbitRadius: 150 };

  return (
    <div
      className='relative mx-auto group'
      style={{
        width: mascotSize.width,
        height: mascotSize.height,
        willChange: animationLevel !== 'none' ? 'transform' : 'auto',
      }}
    >
      {/* 主体机器人 */}
      <motion.div
        className='relative w-full h-full'
        animate={
          animationLevel === 'full'
            ? {
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }
            : animationLevel === 'medium'
              ? {
                  y: [0, -10, 0],
                }
              : {}
        }
        transition={
          animationLevel !== 'none'
            ? {
                duration: deviceInfo.type === 'mobile' ? 4 : 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : {}
        }
      >
        {/* 机器人主体 */}
        <div
          className={cn(
            'relative w-full h-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-2xl',
            `text-${mascotSize.iconSize}`
          )}
        >
          🤖
          {/* 发光效果根据性能调整 */}
          {animationLevel === 'full' && (
            <div className='absolute inset-0 rounded-full bg-gradient-to-r from-primary-400 to-primary-600 blur-xl opacity-30 animate-pulse' />
          )}
          {/* 简化的内部光效 */}
          {animationLevel !== 'none' && (
            <div className='absolute inset-4 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-50' />
          )}
        </div>

        {/* 脉冲环 - 根据性能显示 */}
        {animationLevel === 'full' && <AdaptivePulseRings deviceInfo={deviceInfo} />}

        {/* 环绕图标 - 根据性能调整 */}
        {animationLevel !== 'none' && (
          <AdaptiveOrbitingIcons
            deviceInfo={deviceInfo}
            radius={mascotSize.orbitRadius}
            animationLevel={animationLevel}
          />
        )}
      </motion.div>

      {/* 触摸提示仅在触摸设备显示 */}
      {deviceInfo.hasTouch && (
        <motion.div
          className='absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400'
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          轻触体验
        </motion.div>
      )}
    </div>
  );
};

// 自适应脉冲环
const AdaptivePulseRings = ({ deviceInfo }) => {
  const ringCount = deviceInfo.type === 'mobile' ? 2 : 3;

  return (
    <>
      {[...Array(ringCount)].map((_, ring) => (
        <motion.div
          key={ring}
          className='absolute inset-0 rounded-full border-2 border-primary-400/30'
          animate={{
            scale: [1, 1.5 + ring * 0.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 3,
            delay: ring * 0.6,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          style={{
            width: `${100 + ring * 15}%`,
            height: `${100 + ring * 15}%`,
            top: `${-ring * 7.5}%`,
            left: `${-ring * 7.5}%`,
          }}
        />
      ))}
    </>
  );
};

// 自适应环绕图标
const AdaptiveOrbitingIcons = ({ deviceInfo, radius, animationLevel }) => {
  const icons = [
    { emoji: '💬', color: 'text-green-500' },
    { emoji: '📐', color: 'text-blue-500' },
    { emoji: '🎨', color: 'text-purple-500' },
    ...(deviceInfo.type !== 'mobile'
      ? [
          { emoji: '⚡', color: 'text-yellow-500' },
          { emoji: '🚀', color: 'text-red-500' },
          { emoji: '✨', color: 'text-pink-500' },
        ]
      : []),
  ];

  const iconSize =
    {
      mobile: 'text-2xl',
      tablet: 'text-3xl',
      desktop: 'text-4xl',
    }[deviceInfo.type] || 'text-4xl';

  return (
    <>
      {icons.map((icon, index) => (
        <motion.div
          key={index}
          className={cn('absolute drop-shadow-lg filter', iconSize, icon.color)}
          animate={
            animationLevel === 'full'
              ? {
                  rotate: 360,
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }
              : {
                  rotate: 360,
                }
          }
          transition={{
            duration: deviceInfo.type === 'mobile' ? 15 : 20,
            repeat: Infinity,
            ease: 'linear',
            delay: index * 0.8,
          }}
          style={{
            top: '50%',
            left: '50%',
            transformOrigin: `${radius}px 0px`,
          }}
        >
          <motion.span
            animate={{ rotate: -360 }}
            transition={{
              duration: deviceInfo.type === 'mobile' ? 15 : 20,
              repeat: Infinity,
              ease: 'linear',
              delay: index * 0.8,
            }}
          >
            {icon.emoji}
          </motion.span>
        </motion.div>
      ))}
    </>
  );
};
```

## 🌐 全局响应式布局系统

### CSS Grid/Flexbox 混合策略

```scss
// 智能网格系统
.responsive-grid {
  display: grid;
  gap: var(--grid-gap);

  // 基础移动端布局
  grid-template-columns: 1fr;
  --grid-gap: 1rem;

  // 小屏手机优化
  @media (min-width: 375px) {
    --grid-gap: 1.25rem;
  }

  // 大屏手机
  @media (min-width: 414px) {
    --grid-gap: 1.5rem;
  }

  // 平板竖屏
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    --grid-gap: 1.75rem;
  }

  // 平板横屏/小笔记本
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    --grid-gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  // 标准桌面
  @media (min-width: 1280px) {
    --grid-gap: 2.25rem;
    max-width: 1400px;
  }

  // 大屏桌面
  @media (min-width: 1440px) {
    --grid-gap: 2.5rem;
    max-width: 1600px;
  }

  // 超宽屏
  @media (min-width: 1920px) {
    grid-template-columns: repeat(4, 1fr);
    --grid-gap: 3rem;
    max-width: 1800px;
  }

  // 4K显示器
  @media (min-width: 2560px) {
    grid-template-columns: repeat(5, 1fr);
    --grid-gap: 3.5rem;
    max-width: 2400px;
  }
}

// 容器查询支持
@container (min-width: 768px) {
  .agent-card {
    grid-column: span 1;
  }
}

@container (min-width: 1024px) {
  .agent-card {
    grid-column: span 1;
  }
}
```

### 智能间距系统

```scss
// 响应式间距系统
:root {
  // 基础间距(移动端)
  --space-xs: 0.25rem; // 4px
  --space-sm: 0.5rem; // 8px
  --space-md: 1rem; // 16px
  --space-lg: 1.5rem; // 24px
  --space-xl: 2rem; // 32px
  --space-2xl: 2.5rem; // 40px
  --space-3xl: 3rem; // 48px

  // 语义化间距
  --section-padding: var(--space-lg);
  --card-padding: var(--space-md);
  --element-gap: var(--space-sm);
}

// 平板端间距调整
@media (min-width: 768px) {
  :root {
    --space-lg: 2rem; // 32px
    --space-xl: 2.5rem; // 40px
    --space-2xl: 3rem; // 48px
    --space-3xl: 4rem; // 64px

    --section-padding: var(--space-xl);
    --card-padding: var(--space-lg);
    --element-gap: var(--space-md);
  }
}

// 桌面端间距调整
@media (min-width: 1024px) {
  :root {
    --space-xl: 3rem; // 48px
    --space-2xl: 4rem; // 64px
    --space-3xl: 5rem; // 80px

    --section-padding: var(--space-2xl);
    --card-padding: var(--space-xl);
  }
}

// 大屏桌面间距调整
@media (min-width: 1440px) {
  :root {
    --space-2xl: 5rem; // 80px
    --space-3xl: 6rem; // 96px

    --section-padding: var(--space-3xl);
  }
}
```

## 🖼️ 响应式图像系统

### 智能图像加载

```typescript
// 响应式图像组件
const ResponsiveImage = ({
  src,
  alt,
  className,
  priority = false,
  quality = 80,
  placeholder = 'blur'
}) => {
  const deviceInfo = useDeviceDetection();

  // 根据设备和网络生成最优图像URL
  const getOptimalImageSrc = useCallback((width: number) => {
    const qualityMap = {
      'slow-2g': 60,
      '2g': 70,
      '3g': 80,
      '4g': quality,
    };

    const optimalQuality = qualityMap[deviceInfo.connectionSpeed] || quality;
    const dprAdjustedWidth = Math.ceil(width * Math.min(deviceInfo.pixelRatio, 2));

    return `${src}?w=${dprAdjustedWidth}&q=${optimalQuality}&f=webp`;
  }, [src, quality, deviceInfo]);

  // 生成srcSet
  const srcSet = useMemo(() => {
    const widths = [320, 640, 768, 1024, 1280, 1536, 1920];
    return widths
      .map(width => `${getOptimalImageSrc(width)} ${width}w`)
      .join(', ');
  }, [getOptimalImageSrc]);

  // 生成sizes
  const sizes = useMemo(() => {
    return [
      '(max-width: 640px) 100vw',
      '(max-width: 768px) 90vw',
      '(max-width: 1024px) 80vw',
      '(max-width: 1280px) 70vw',
      '60vw'
    ].join(', ');
  }, []);

  return (
    <Image
      src={getOptimalImageSrc(1200)}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      priority={priority}
      placeholder={placeholder}
      loading={priority ? 'eager' : 'lazy'}
      quality={quality}
      onLoad={(e) => {
        // 图像加载完成后的性能监控
        if (typeof window !== 'undefined' && 'performance' in window) {
          const img = e.target as HTMLImageElement;
          console.log(`Image loaded: ${img.src}, size: ${img.naturalWidth}x${img.naturalHeight}`);
        }
      }}
    />
  );
};
```

## 🎮 交互适配系统

### 触摸与鼠标双重适配

```typescript
// 智能交互处理
const useAdaptiveInteraction = () => {
  const [interactionMode, setInteractionMode] = useState<'touch' | 'mouse'>('mouse');

  useEffect(() => {
    const detectInteractionMode = () => {
      // 检测实际交互方式而非仅依赖设备类型
      if ('ontouchstart' in window) {
        setInteractionMode('touch');
      } else {
        setInteractionMode('mouse');
      }
    };

    // 监听第一次触摸事件
    const handleFirstTouch = () => {
      setInteractionMode('touch');
      document.removeEventListener('touchstart', handleFirstTouch);
    };

    // 监听第一次鼠标移动
    const handleFirstMouse = () => {
      setInteractionMode('mouse');
      document.removeEventListener('mousemove', handleFirstMouse);
    };

    detectInteractionMode();
    document.addEventListener('touchstart', handleFirstTouch, { passive: true });
    document.addEventListener('mousemove', handleFirstMouse);

    return () => {
      document.removeEventListener('touchstart', handleFirstTouch);
      document.removeEventListener('mousemove', handleFirstMouse);
    };
  }, []);

  return {
    interactionMode,
    isTouchDevice: interactionMode === 'touch',
    isMouseDevice: interactionMode === 'mouse',
  };
};

// 自适应悬浮效果
const useAdaptiveHover = (hoverStyles: any, touchStyles: any = {}) => {
  const { interactionMode } = useAdaptiveInteraction();

  return interactionMode === 'touch' ? touchStyles : hoverStyles;
};
```

### 手势识别系统

```typescript
// 手势识别Hook
const useGestureRecognition = () => {
  const [gestures, setGestures] = useState({
    swipeLeft: false,
    swipeRight: false,
    pinchZoom: false,
    longPress: false,
  });

  const handleGesture = useCallback((gestureType: string, data?: any) => {
    setGestures(prev => ({ ...prev, [gestureType]: true }));

    // 自动重置手势状态
    setTimeout(() => {
      setGestures(prev => ({ ...prev, [gestureType]: false }));
    }, 100);
  }, []);

  return { gestures, handleGesture };
};

// 智能体卡片手势支持
const GestureEnabledAgentCard = ({ agent, onSwipeLeft, onSwipeRight }) => {
  const { gestures, handleGesture } = useGestureRecognition();

  return (
    <motion.div
      drag={window.innerWidth <= 768 ? "x" : false}
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.2}
      onDragEnd={(event, info) => {
        if (info.offset.x > 100) {
          onSwipeRight?.(agent);
        } else if (info.offset.x < -100) {
          onSwipeLeft?.(agent);
        }
      }}
      whileDrag={{
        scale: 0.95,
        rotate: info => info.offset.x / 10,
      }}
    >
      {/* 卡片内容 */}
    </motion.div>
  );
};
```

## 🚀 性能优化矩阵

### 设备性能自适应

```typescript
// 性能监控和自适应
const usePerformanceOptimization = () => {
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    const measurePerformance = () => {
      const memoryInfo = (performance as any).memory;
      const connection = (navigator as any).connection;

      let score = 100;

      // 内存评分
      if (memoryInfo) {
        const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;
        if (memoryUsage > 0.8) score -= 30;
        else if (memoryUsage > 0.6) score -= 15;
      }

      // 网络评分
      if (connection) {
        const speedMap = { 'slow-2g': -40, '2g': -30, '3g': -15, '4g': 0 };
        score += speedMap[connection.effectiveType] || 0;
      }

      // 设备评分
      const pixelRatio = window.devicePixelRatio || 1;
      if (pixelRatio > 2) score -= 10;

      // 硬件并发评分
      const cores = navigator.hardwareConcurrency || 2;
      if (cores < 4) score -= 20;

      // 设置性能等级
      if (score >= 80) setPerformanceLevel('high');
      else if (score >= 50) setPerformanceLevel('medium');
      else setPerformanceLevel('low');
    };

    measurePerformance();

    // 定期重新评估性能
    const interval = setInterval(measurePerformance, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    performanceLevel,
    shouldReduceAnimations: performanceLevel === 'low',
    shouldLimitParticles: performanceLevel !== 'high',
    shouldUseWebP: true, // 现代浏览器都支持
  };
};

// 自适应渲染配置
const getAdaptiveRenderConfig = (performanceLevel: string) => {
  return {
    high: {
      particleCount: 30,
      animationComplexity: 'full',
      shadowQuality: 'high',
      blurEffects: true,
      gradientAnimations: true,
    },
    medium: {
      particleCount: 15,
      animationComplexity: 'medium',
      shadowQuality: 'medium',
      blurEffects: true,
      gradientAnimations: false,
    },
    low: {
      particleCount: 5,
      animationComplexity: 'minimal',
      shadowQuality: 'low',
      blurEffects: false,
      gradientAnimations: false,
    },
  }[performanceLevel];
};
```

## 🌍 国际化与本地化

### 多语言响应式布局

```typescript
// 多语言布局适配
const useInternationalization = () => {
  const [locale, setLocale] = useState('zh-CN');
  const [textDirection, setTextDirection] = useState<'ltr' | 'rtl'>('ltr');

  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  const longTextLanguages = ['de', 'ru', 'fi']; // 需要更多空间的语言

  useEffect(() => {
    const detectedLocale = navigator.language || 'zh-CN';
    setLocale(detectedLocale);

    const lang = detectedLocale.split('-')[0];
    setTextDirection(rtlLanguages.includes(lang) ? 'rtl' : 'ltr');
  }, []);

  const getResponsiveTextConfig = (baseSize: string) => {
    const lang = locale.split('-')[0];

    // 为长文本语言提供更大空间
    if (longTextLanguages.includes(lang)) {
      return {
        mobile: `text-${baseSize}`,
        tablet: `text-lg`,
        desktop: `text-xl`,
        lineHeight: 'leading-relaxed',
      };
    }

    return {
      mobile: `text-${baseSize}`,
      tablet: `text-${baseSize}`,
      desktop: `text-lg`,
      lineHeight: 'leading-normal',
    };
  };

  return {
    locale,
    textDirection,
    getResponsiveTextConfig,
    isRTL: textDirection === 'rtl',
  };
};
```

## ♿ 无障碍访问增强

### 全面可访问性支持

```typescript
// 无障碍功能增强
const useAccessibilityEnhancements = () => {
  const [a11ySettings, setA11ySettings] = useState({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
  });

  useEffect(() => {
    // 检测用户偏好
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const largeText = window.matchMedia('(prefers-reduced-data: reduce)').matches;

    // 检测屏幕阅读器
    const screenReader = window.speechSynthesis ||
                        document.getElementById('nvda') ||
                        document.getElementById('jaws') ||
                        navigator.userAgent.includes('NVDA') ||
                        navigator.userAgent.includes('JAWS');

    setA11ySettings({
      reduceMotion,
      highContrast,
      largeText,
      screenReader: !!screenReader,
    });
  }, []);

  return a11ySettings;
};

// 无障碍智能体卡片
const AccessibleAgentCard = ({ agent, index }) => {
  const a11y = useAccessibilityEnhancements();

  return (
    <motion.div
      // 减少动画如果用户偏好
      animate={!a11y.reduceMotion ? {
        y: 0,
        opacity: 1,
      } : { opacity: 1 }}
      transition={!a11y.reduceMotion ? {
        delay: index * 0.1,
        duration: 0.5,
      } : { duration: 0.1 }}
      // 无障碍属性
      role="button"
      tabIndex={0}
      aria-label={`${agent.name}: ${agent.description}`}
      aria-describedby={`agent-features-${agent.id}`}
      // 键盘导航
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = agent.route;
        }
      }}
      // 焦点管理
      className={cn(
        "focus:outline-none focus:ring-4 focus:ring-primary-500/50 focus:ring-offset-2",
        a11y.highContrast && "border-2 border-current",
      )}
    >
      <div className={cn(
        "relative backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300",
        a11y.highContrast ? "bg-white border-black dark:bg-black dark:border-white" : "bg-white/95 border-gray-200/30",
        a11y.largeText && "p-8"
      )}>
        {/* 可访问的图标 */}
        <div
          className="text-center mb-4"
          aria-hidden="true" // 装饰性图标对屏幕阅读器隐藏
        >
          <div className={cn(
            "mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            a11y.largeText ? "w-28 h-28 text-6xl" : "w-20 h-20 text-4xl",
            agent.gradient
          )}>
            {agent.icon}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="text-center">
          <h3 className={cn(
            "font-bold text-gray-900 dark:text-white mb-2",
            a11y.largeText ? "text-2xl" : "text-xl"
          )}>
            {agent.name}
          </h3>

          <p className={cn(
            "text-gray-600 dark:text-gray-300 mb-4 leading-relaxed",
            a11y.largeText ? "text-lg" : "text-sm"
          )}>
            {agent.description}
          </p>

          {/* 功能列表 - 对屏幕阅读器友好 */}
          <div
            id={`agent-features-${agent.id}`}
            className="mb-4"
            aria-label="功能特性"
          >
            <ul className="flex flex-wrap gap-2 justify-center list-none">
              {agent.features.map((feature, idx) => (
                <li
                  key={idx}
                  className={cn(
                    "px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full text-xs",
                    a11y.largeText && "text-sm px-4 py-2"
                  )}
                >
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* 可访问的按钮 */}
          <button
            className={cn(
              "w-full py-3 rounded-xl bg-gradient-to-r text-white font-semibold shadow-lg hover:shadow-xl focus:shadow-xl transition-all duration-300",
              "focus:outline-none focus:ring-4 focus:ring-white/50",
              a11y.largeText && "py-4 text-lg",
              agent.gradient
            )}
            onClick={() => window.location.href = agent.route}
            aria-label={`立即体验${agent.name}`}
          >
            立即体验
          </button>
        </div>

        {/* 屏幕阅读器专用信息 */}
        <div className="sr-only">
          热度评分: {agent.popularity}%
          可用功能: {agent.features.join(', ')}
        </div>
      </div>
    </motion.div>
  );
};
```

## 📊 实时性能监控

### 性能指标追踪

```typescript
// 性能监控系统
const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    FCP: 0, // First Contentful Paint
    LCP: 0, // Largest Contentful Paint
    FID: 0, // First Input Delay
    CLS: 0, // Cumulative Layout Shift
    TTFB: 0, // Time to First Byte
  });

  useEffect(() => {
    // 监控 Core Web Vitals
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, FCP: entry.startTime }));
            }
            break;
          case 'largest-contentful-paint':
            setMetrics(prev => ({ ...prev, LCP: entry.startTime }));
            break;
          case 'first-input':
            setMetrics(prev => ({ ...prev, FID: entry.processingStart - entry.startTime }));
            break;
          case 'layout-shift':
            if (!entry.hadRecentInput) {
              setMetrics(prev => ({ ...prev, CLS: prev.CLS + entry.value }));
            }
            break;
        }
      }
    });

    observer.observe({
      entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'],
    });

    return () => observer.disconnect();
  }, []);

  // 自动报告性能问题
  useEffect(() => {
    if (metrics.LCP > 4000 || metrics.FID > 300 || metrics.CLS > 0.25) {
      console.warn('Performance issue detected:', metrics);
      // 可以发送到监控服务
    }
  }, [metrics]);

  return metrics;
};
```

## 🔄 Progressive Web App 支持

### PWA 增强功能

```typescript
// PWA 功能配置
const usePWAFeatures = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // 监听安装提示
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    // 监听网络状态
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    const prompt = (window as any).deferredPrompt;
    if (prompt) {
      prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsInstallable(false);
      }
    }
  };

  return {
    isInstallable,
    isOffline,
    installApp,
  };
};

// 离线提示组件
const OfflineNotification = () => {
  const { isOffline } = usePWAFeatures();

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white p-3 text-center"
    >
      <div className="flex items-center justify-center space-x-2">
        <AlertTriangle className="w-5 h-5" />
        <span>当前处于离线模式，部分功能可能不可用</span>
      </div>
    </motion.div>
  );
};
```

## 📋 实施优先级清单

### 第一阶段：核心响应式功能 (2周)

- [ ] 基础断点系统实现
- [ ] 智能体卡片响应式适配
- [ ] 中央吉祥物多端适配
- [ ] 触摸设备交互优化
- [ ] 基础性能监控

### 第二阶段：交互与动画优化 (2周)

- [ ] 手势识别系统
- [ ] 性能自适应动画
- [ ] 图像响应式加载
- [ ] 键盘导航支持
- [ ] 屏幕阅读器优化

### 第三阶段：高级功能 (2周)

- [ ] PWA功能集成
- [ ] 离线功能支持
- [ ] 国际化布局适配
- [ ] 高级无障碍功能
- [ ] 实时性能优化

### 第四阶段：世界级体验 (1周)

- [ ] 极致性能调优
- [ ] 全面测试覆盖
- [ ] 跨浏览器兼容性
- [ ] 边缘案例处理
- [ ] 最终用户体验优化

---

此方案确保了系统在所有设备和场景下都能提供世界级的用户体验，同时保持了高性能和可访问性。
