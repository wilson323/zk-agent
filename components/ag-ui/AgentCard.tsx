// @ts-nocheck
/**
 * @file components/ag-ui/AgentCard.tsx
 * @description 智能体卡片组件，展示智能体基本信息和操作按钮
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 初始创建智能体卡片组件
 */

'use client';

import React from 'react';
import { Agent, AgentType, AgentStatus } from '@/types/agents';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircleIcon, 
  StarIcon, 
  UsersIcon, 
  ActivityIcon,
  ClockIcon,
  TrendingUpIcon 
} from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  showMetrics?: boolean;
  className?: string;
}

// 智能体类型图标映射
const AgentTypeIcons = {
  [AgentType.CHAT]: MessageCircleIcon,
  [AgentType.CAD_ANALYZER]: ActivityIcon,
  [AgentType.POSTER_GENERATOR]: TrendingUpIcon,
  [AgentType.CUSTOM]: UsersIcon,
};

// 状态颜色映射
const StatusColors = {
  [AgentStatus.ACTIVE]: 'bg-green-500',
  [AgentStatus.INACTIVE]: 'bg-gray-500',
  [AgentStatus.MAINTENANCE]: 'bg-yellow-500',
};

// 状态文字映射
const StatusTexts = {
  [AgentStatus.ACTIVE]: '运行中',
  [AgentStatus.INACTIVE]: '离线',
  [AgentStatus.MAINTENANCE]: '维护中',
};

export function AgentCard({ 
  agent, 
  onClick, 
  showMetrics = true, 
  className = '' 
}: AgentCardProps) {
  const TypeIcon = AgentTypeIcons[agent.type] || UsersIcon;

  // 格式化数字显示
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // 格式化响应时间
  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 生成头像fallback
  const getAvatarFallback = () => {
    return agent.name.charAt(0).toUpperCase();
  };

  return (
    <Card 
      className={`group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/50 ${className}`}
      onClick={onClick}
    >
      {/* 卡片头部 */}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* 头像 */}
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={agent.avatar} alt={agent.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getAvatarFallback()}
              </AvatarFallback>
            </Avatar>
            {/* 状态指示器 */}
            <div 
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${StatusColors[agent.status]}`}
              title={StatusTexts[agent.status]}
            />
          </div>

          {/* 基本信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                {agent.name}
              </h3>
              <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {agent.description}
            </p>
          </div>
        </div>
      </CardHeader>

      {/* 卡片内容 */}
      <CardContent className="py-3">
        {/* 标签 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.tags.slice(0, 3).map((tag, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="text-xs px-2 py-0.5 h-auto"
            >
              {tag}
            </Badge>
          ))}
          {agent.tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 h-auto">
              +{agent.tags.length - 3}
            </Badge>
          )}
        </div>

        {/* 指标信息 */}
        {showMetrics && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* 评分 */}
            <div className="flex items-center gap-1">
              <StarIcon className="h-3 w-3 text-yellow-500 fill-current" />
              <span className="font-medium">{agent.metrics.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({formatNumber(agent.metrics.reviewCount)})
              </span>
            </div>

            {/* 用户数 */}
            <div className="flex items-center gap-1">
              <UsersIcon className="h-3 w-3 text-blue-500" />
              <span className="font-medium">
                {formatNumber(agent.metrics.dailyActiveUsers)}
              </span>
              <span className="text-muted-foreground">DAU</span>
            </div>

            {/* 响应时间 */}
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3 text-green-500" />
              <span className="font-medium">
                {formatResponseTime(agent.metrics.averageResponseTime)}
              </span>
            </div>

            {/* 成功率 */}
            <div className="flex items-center gap-1">
              <ActivityIcon className="h-3 w-3 text-purple-500" />
              <span className="font-medium">
                {agent.metrics.totalRequests > 0 
                  ? ((agent.metrics.successfulRequests / agent.metrics.totalRequests) * 100).toFixed(1)
                  : '0'
                }%
              </span>
            </div>
          </div>
        )}
      </CardContent>

      {/* 卡片底部 */}
      <CardFooter className="pt-3">
        <div className="w-full space-y-2">
          {/* 能力标签 */}
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 2).map((capability, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs px-2 py-0.5 h-auto bg-primary/5 border-primary/20"
              >
                {capability}
              </Badge>
            ))}
            {agent.capabilities.length > 2 && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 h-auto text-muted-foreground"
              >
                +{agent.capabilities.length - 2}项能力
              </Badge>
            )}
          </div>

          {/* 操作按钮 */}
          <Button 
            size="sm" 
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            开始对话
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 