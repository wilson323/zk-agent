// @ts-nocheck
/**
 * @file components/ag-ui/AgentListContainer.tsx
 * @description 智能体列表容器组件，提供搜索、筛选、分页等功能
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 初始创建智能体列表容器组件
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { Agent, AgentType, AgentStatus } from '@/types/agents';
import { ApiResponse } from '@/types/core';
import { AgentCard } from './AgentCard';
import { AgentSearchBar } from './AgentSearchBar';
import { AgentFilters } from './AgentFilters';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlusIcon, RefreshCwIcon } from 'lucide-react';

interface AgentListContainerProps {
  showCreateButton?: boolean;
  onCreateAgent?: () => void;
  onAgentClick?: (agent: Agent) => void;
  initialFilters?: {
    type?: AgentType;
    status?: AgentStatus;
    tags?: string[];
    isPublic?: boolean;
  };
}

interface ApiFilters {
  search?: string;
  type?: AgentType;
  status?: AgentStatus;
  tags?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const fetcher = async (url: string): Promise<ApiResponse<Agent[]>> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch agents');
  }
  return response.json();
};

export function AgentListContainer({
  showCreateButton = false,
  onCreateAgent,
  onAgentClick,
  initialFilters = {}
}: AgentListContainerProps) {
  // 状态管理
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ApiFilters>({
    type: initialFilters.type,
    status: initialFilters.status,
    tags: initialFilters.tags?.join(','),
    isPublic: initialFilters.isPublic,
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // 构建API URL
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    
    if (search) {params.set('search', search);}
    if (filters.type) {params.set('type', filters.type);}
    if (filters.status) {params.set('status', filters.status);}
    if (filters.tags) {params.set('tags', filters.tags);}
    if (filters.isPublic !== undefined) {params.set('isPublic', filters.isPublic.toString());}
    if (filters.page) {params.set('page', filters.page.toString());}
    if (filters.limit) {params.set('limit', filters.limit.toString());}
    if (filters.sortBy) {params.set('sortBy', filters.sortBy);}
    if (filters.sortOrder) {params.set('sortOrder', filters.sortOrder);}

    return `/api/v1/agents?${params.toString()}`;
  }, [search, filters]);

  // 数据获取
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Agent[]>>(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000
    }
  );

  // 事件处理
  const handleSearchChange = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setFilters(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: Partial<ApiFilters>) => {
    setFilters(prev => ({ 
      ...prev, 
      ...newFilters, 
      page: 1 // 重置页码
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const handleSortChange = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ 
      ...prev, 
      sortBy, 
      sortOrder, 
      page: 1 
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  // 渲染加载状态
  const renderLoading = () => (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    </div>
  );

  // 渲染错误状态
  const renderError = () => (
    <Alert variant="destructive">
      <AlertDescription>
        加载智能体列表失败。请检查网络连接后重试。
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="ml-2"
        >
          重试
        </Button>
      </AlertDescription>
    </Alert>
  );

  // 渲染空状态
  const renderEmpty = () => (
    <div className="text-center py-12">
      <div className="text-gray-500 mb-4">
        {search || Object.values(filters).some(v => v) ? 
          '没有找到符合条件的智能体' : 
          '暂无智能体'
        }
      </div>
      {showCreateButton && (
        <Button onClick={onCreateAgent}>
          <PlusIcon className="w-4 h-4 mr-2" />
          创建智能体
        </Button>
      )}
    </div>
  );

  // 主渲染
  if (isLoading) {return renderLoading();}
  if (error) {return renderError();}

  const agents = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <AgentSearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="搜索智能体名称、描述或能力..."
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCwIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          {showCreateButton && (
            <Button onClick={onCreateAgent}>
              <PlusIcon className="w-4 h-4 mr-2" />
              创建智能体
            </Button>
          )}
        </div>
      </div>

      {/* 筛选器 */}
      <AgentFilters
        filters={filters}
        onChange={handleFiltersChange}
        onSortChange={handleSortChange}
      />

      {/* 智能体列表 */}
      {agents.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {agents.map((_agent) => (
              <AgentCard
                key={_agent.id}
                agent={_agent}
                onClick={() => onAgentClick?.(_agent)}
              />
            ))}
          </div>

          {/* 分页 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                showQuickJumper
                showSizeChanger={false}
              />
            </div>
          )}

          {/* 统计信息 */}
          {pagination && (
            <div className="text-sm text-gray-500 text-center">
              显示 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 
              条，共 {pagination.total} 条结果
            </div>
          )}
        </>
      )}
    </div>
  );
} 