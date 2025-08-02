// @ts-nocheck
/**
 * @file 公司吉祥物动画组件
 * @description 展示公司卡通形象的动画组件，增加界面亲和力和品牌识别度
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MascotAnimationProps {
  /** 动画类型 */
  animation?: 'idle' | 'wave' | 'thinking' | 'typing' | 'celebrate' | 'welcome';
  /** 尺寸大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 是否显示对话气泡 */
  showBubble?: boolean;
  /** 对话内容 */
  bubbleText?: string;
  /** 自定义样式类名 */
  className?: string;
  /** 点击事件处理 */
  onClick?: () => void;
}

/**
 * 公司吉祥物动画组件
 * 提供多种动画状态和交互效果，增强用户体验
 */
export const MascotAnimation: React.FC<MascotAnimationProps> = ({
  animation = 'idle',
  size = 'md',
  showBubble = false,
  bubbleText = '你好！我是ZK智能助手',
  className,
  onClick
}) => {
  const [currentAnimation, setCurrentAnimation] = useState(animation);
  const [isHovered, setIsHovered] = useState(false);

  // 自动切换动画状态
  useEffect(() => {
    if (animation === 'idle') {
      const animations = ['idle', 'wave', 'thinking'];
      const interval = setInterval(() => {
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        setCurrentAnimation(randomAnimation as any);
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setCurrentAnimation(animation);
    }
  }, [animation]);

  // 尺寸映射
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  // 动画类名映射
  const animationClasses = {
    idle: 'animate-bounce',
    wave: 'animate-pulse',
    thinking: 'animate-spin',
    typing: 'animate-ping',
    celebrate: 'animate-bounce',
    welcome: 'animate-pulse'
  };

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      {/* 对话气泡 */}
      {showBubble && (
        <div className="mb-2 relative">
          <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-2 shadow-lg border border-primary/20 max-w-xs">
            <p className="text-sm text-gray-700 dark:text-gray-300">{bubbleText}</p>
            {/* 气泡尾巴 */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800"></div>
            </div>
          </div>
        </div>
      )}

      {/* 吉祥物主体 */}
      <div
        className={cn(
          'relative cursor-pointer transition-all duration-300',
          sizeClasses[size],
          animationClasses[currentAnimation],
          isHovered && 'scale-110',
          'hover:drop-shadow-lg'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* 吉祥物SVG */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 渐变定义 */}
          <defs>
            <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6cb33f" />
              <stop offset="100%" stopColor="#5a9933" />
            </linearGradient>
            <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#90dc70" />
              <stop offset="100%" stopColor="#70d248" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          </defs>

          {/* 身体 */}
          <ellipse
            cx="100"
            cy="120"
            rx="60"
            ry="50"
            fill="url(#bodyGradient)"
            filter="url(#glow)"
          />

          {/* 头部 */}
          <circle
            cx="100"
            cy="80"
            r="45"
            fill="url(#bodyGradient)"
            filter="url(#glow)"
          />

          {/* 眼睛 */}
          <circle cx="85" cy="75" r="8" fill="white" />
          <circle cx="115" cy="75" r="8" fill="white" />
          <circle cx="87" cy="73" r="4" fill="#333" className={currentAnimation === 'thinking' ? 'animate-pulse' : ''} />
          <circle cx="117" cy="73" r="4" fill="#333" className={currentAnimation === 'thinking' ? 'animate-pulse' : ''} />

          {/* 嘴巴 */}
          <path
            d="M 90 90 Q 100 100 110 90"
            stroke="#333"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* 腮红 */}
          <circle cx="70" cy="85" r="6" fill="#ff9999" opacity="0.6" />
          <circle cx="130" cy="85" r="6" fill="#ff9999" opacity="0.6" />

          {/* 手臂 */}
          <ellipse
            cx="60"
            cy="110"
            rx="15"
            ry="25"
            fill="url(#accentGradient)"
            className={currentAnimation === 'wave' ? 'animate-bounce' : ''}
          />
          <ellipse
            cx="140"
            cy="110"
            rx="15"
            ry="25"
            fill="url(#accentGradient)"
            className={currentAnimation === 'wave' ? 'animate-bounce' : ''}
          />

          {/* 装饰元素 - 科技感光点 */}
          <circle cx="50" cy="50" r="2" fill="#6cb33f" opacity="0.8" className="animate-ping" />
          <circle cx="150" cy="60" r="1.5" fill="#90dc70" opacity="0.6" className="animate-pulse" />
          <circle cx="30" cy="100" r="1" fill="#70d248" opacity="0.4" className="animate-bounce" />
          <circle cx="170" cy="120" r="2.5" fill="#6cb33f" opacity="0.7" className="animate-ping" />

          {/* 打字动画时的键盘效果 */}
          {currentAnimation === 'typing' && (
            <g>
              <rect x="80" y="140" width="40" height="20" rx="5" fill="#333" opacity="0.8" />
              <rect x="85" y="145" width="6" height="6" rx="1" fill="#6cb33f" className="animate-pulse" />
              <rect x="95" y="145" width="6" height="6" rx="1" fill="#6cb33f" className="animate-pulse" style={{animationDelay: '0.2s'}} />
              <rect x="105" y="145" width="6" height="6" rx="1" fill="#6cb33f" className="animate-pulse" style={{animationDelay: '0.4s'}} />
            </g>
          )}

          {/* 庆祝动画时的星星效果 */}
          {currentAnimation === 'celebrate' && (
            <g>
              <polygon points="100,30 105,45 120,45 108,55 113,70 100,60 87,70 92,55 80,45 95,45" fill="#ffd700" className="animate-spin" />
              <polygon points="60,40 63,48 72,48 65,53 68,61 60,56 52,61 55,53 48,48 57,48" fill="#ffd700" className="animate-bounce" />
              <polygon points="140,35 143,43 152,43 145,48 148,56 140,51 132,56 135,48 128,43 137,43" fill="#ffd700" className="animate-pulse" />
            </g>
          )}
        </svg>

        {/* 悬浮光效 */}
        {isHovered && (
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
        )}
      </div>

      {/* 底部装饰 */}
      <div className="mt-2 flex space-x-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
    </div>
  );
};

export default MascotAnimation;