/**
 * @file admin\system-monitor\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, ApiResponseWrapper } from '@/lib/api/route-factory';
import { performanceMonitor } from '@/lib/middleware/performance-monitor';
import { unifiedAIAdapter } from '@/lib/ai/unified-ai-adapter';
import { enhancedDatabaseManager } from '@/lib/database/enhanced-database-manager';
import { ErrorCode } from '@/types/core';

export const GET = createApiRoute({
  handler: async ({ searchParams }) => {
    try {
      const type = searchParams?.type || 'overview';
    
      switch (type) {
        case 'overview':
          return ApiResponseWrapper.success(await getSystemOverview());
        
        case 'performance':
          return ApiResponseWrapper.success(await getPerformanceMetrics());
        
        case 'health':
          return ApiResponseWrapper.success(await getHealthStatus());
        
        case 'database':
          return ApiResponseWrapper.success(await getDatabaseMetrics());
        
        case 'ai':
          return ApiResponseWrapper.success(await getAIServiceMetrics());
        
        case 'resources':
          return ApiResponseWrapper.success(await getResourceUsage());
        
        default:
          return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Invalid monitor type', null);
      }
    } catch (error) {
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to get system monitor data', null);
    }
  }
});

// Helper functions for system monitoring
async function getSystemOverview() {
  return {
    status: 'operational',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
}

async function getPerformanceMetrics() {
  return performanceMonitor.getPerformanceStats();
}

async function getHealthStatus() {
  return {
    database: await enhancedDatabaseManager.healthCheck(),
    ai: await unifiedAIAdapter.getHealthStatus(),
    system: 'healthy'
  };
}

async function getDatabaseMetrics() {
  return enhancedDatabaseManager.getQueryAnalytics();
}

async function getAIServiceMetrics() {
  return unifiedAIAdapter.getHealthStatus();
}

async function getResourceUsage() {
  return {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString()
  };
}

