/* eslint-disable */
// @ts-nocheck
/**
 * @file 速率限制中间件
 * @description 实现API速率限制，防止滥用
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { redisConfig, securityConfig } from '@/config/env';
import { ERROR_CODES } from '@/config/constants';
import Redis from 'ioredis';

// Redis 客户端
let redisClient: Redis | null = null;

try {
  redisClient = new Redis({
    host: redisConfig.url.replace('redis://', '').split(':')[0],
    port: parseInt(redisConfig.url.replace('redis://', '').split(':')[1] || '6379'),
    password: redisConfig.password,
    db: redisConfig.db,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });
} catch (error) {
  console.warn('Redis连接失败，使用内存限流器:', error);
}

// 速率限制器配置
const rateLimiterOptions: any = {
  keyPrefix: 'zk_agent_rl',
  points: securityConfig.rateLimit.maxRequests, // 请求次数
  duration: Math.floor(securityConfig.rateLimit.windowMs / 1000), // 时间窗口（秒）
  blockDuration: 60, // 阻塞时间（秒）
};

// 创建速率限制器
const rateLimiter: any = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      ...rateLimiterOptions,
    })
  : new RateLimiterMemory(rateLimiterOptions);

// 不同类型的速率限制器
const authRateLimiter: any = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'zk_agent_auth_rl',
      points: 5, // 认证请求限制更严格
      duration: 900, // 15分钟
      blockDuration: 900, // 阻塞15分钟
    })
  : new RateLimiterMemory({
      keyPrefix: 'zk_agent_auth_rl',
      points: 5,
      duration: 900,
      blockDuration: 900,
    });

const uploadRateLimiter: any = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'zk_agent_upload_rl',
      points: 10, // 上传请求限制
      duration: 60, // 1分钟
      blockDuration: 300, // 阻塞5分钟
    })
  : new RateLimiterMemory({
      keyPrefix: 'zk_agent_upload_rl',
      points: 10,
      duration: 60,
      blockDuration: 300,
    });

const aiRateLimiter: any = redisClient
  ? new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'zk_agent_ai_rl',
      points: 20, // AI请求限制
      duration: 60, // 1分钟
      blockDuration: 60, // 阻塞1分钟
    })
  : new RateLimiterMemory({
      keyPrefix: 'zk_agent_ai_rl',
      points: 20,
      duration: 60,
      blockDuration: 60,
    });

/**
 * 速率限制类型
 */
export enum RateLimitType {
  API = 'api',
  AUTH = 'auth',
  UPLOAD = 'upload',
  AI = 'ai',
}

/**
 * 通用速率限制中间件
 */
export function withRateLimit(
  type: RateLimitType = RateLimitType.API,
  customOptions?: {
    points?: number;
    duration?: number;
    blockDuration?: number;
    keyGenerator?: (req: NextRequest) => string;
  }
) {
  return function (handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest): Promise<NextResponse> => {
      if (!securityConfig.rateLimit.enabled) {
        return await handler(req);
      }

      try {
        // 选择对应的限流器
        let limiter: any = rateLimiter;
        switch (type) {
          case RateLimitType.AUTH:
            limiter = authRateLimiter;
            break;
          case RateLimitType.UPLOAD:
            limiter = uploadRateLimiter;
            break;
          case RateLimitType.AI:
            limiter = aiRateLimiter;
            break;
        }

        // 生成限流键
        const key: any = customOptions?.keyGenerator
          ? customOptions.keyGenerator(req)
          : generateRateLimitKey(req, type);

        // 检查速率限制
        const result: any = await limiter.consume(key);

        // 设置响应头
        const response: any = await handler(req);
        response.headers.set('X-RateLimit-Limit', limiter.points.toString());
        response.headers.set('X-RateLimit-Remaining', result.remainingPoints?.toString() || '0');
        response.headers.set('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());

        return response;
      } catch (rateLimiterRes) {
        // 速率限制触发
        if (rateLimiterRes instanceof Error) {
          console.error('速率限制器错误:', rateLimiterRes);
          // 限流器错误时允许请求通过
          return await handler(req);
        }

        const secs: any = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
        
        return NextResponse.json(
          {
            error: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message: `请求过于频繁，请在 ${secs} 秒后重试`,
            retryAfter: secs,
          },
          {
            status: 429,
            headers: {
              'Retry-After': secs.toString(),
              'X-RateLimit-Limit': rateLimiterRes.totalHits?.toString() || '0',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString(),
            },
          }
        );
      }
    };
  };
}

/**
 * API速率限制中间件
 */
export const withApiRateLimit: any = withRateLimit(RateLimitType.API);

/**
 * 认证速率限制中间件
 */
export const withAuthRateLimit: any = withRateLimit(RateLimitType.AUTH);

/**
 * 上传速率限制中间件
 */
export const withUploadRateLimit: any = withRateLimit(RateLimitType.UPLOAD);

/**
 * AI请求速率限制中间件
 */
export const withAiRateLimit: any = withRateLimit(RateLimitType.AI);

/**
 * 基于用户的速率限制
 */
export function withUserRateLimit(
  points: number = 100,
  duration: number = 3600 // 1小时
) {
  return withRateLimit(RateLimitType.API, {
    points,
    duration,
    keyGenerator: (req: NextRequest) => {
      // 从认证信息中获取用户ID
      const authHeader: any = req.headers.get('authorization');
      if (authHeader) {
        try {
          const token: any = authHeader.replace('Bearer ', '');
          const payload: any = JSON.parse(atob(token.split('.')[1]));
          return `user:${payload.id}`;
        } catch (error) {
          // 解析失败时使用IP
        }
      }
      return getClientIP(req);
    },
  });
}

/**
 * 基于IP的速率限制
 */
export function withIpRateLimit(
  points: number = 50,
  duration: number = 3600 // 1小时
) {
  return withRateLimit(RateLimitType.API, {
    points,
    duration,
    keyGenerator: (req: NextRequest) => getClientIP(req),
  });
}

/**
 * 生成速率限制键
 */
function generateRateLimitKey(req: NextRequest, type: RateLimitType): string {
  const ip: any = getClientIP(req);
  const userAgent: any = req.headers.get('user-agent') || 'unknown';
  const userAgentHash: any = hashString(userAgent);
  
  return `${type}:${ip}:${userAgentHash}`;
}

/**
 * 获取客户端IP地址
 */
function getClientIP(req: NextRequest): string {
  // 检查各种可能的IP头
  const forwarded: any = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp: any = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp: any = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // 从URL中获取（Next.js开发环境）
  const url: any = new URL(req.url);
  return url.hostname || '127.0.0.1';
}

/**
 * 简单字符串哈希函数
 */
function hashString(str: string): string {
  let hash: any = 0;
  for (let i: any = 0; i < str.length; i++) {
    const char: any = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
}

/**
 * 重置用户速率限制
 */
export async function resetUserRateLimit(userId: string): Promise<void> {
  try {
    await rateLimiter.delete(`user:${userId}`);
    await authRateLimiter.delete(`user:${userId}`);
    await uploadRateLimiter.delete(`user:${userId}`);
    await aiRateLimiter.delete(`user:${userId}`);
  } catch (error) {
    console.error('重置用户速率限制失败:', error);
  }
}

/**
 * 重置IP速率限制
 */
export async function resetIpRateLimit(ip: string): Promise<void> {
  try {
    await rateLimiter.delete(ip);
    await authRateLimiter.delete(ip);
    await uploadRateLimiter.delete(ip);
    await aiRateLimiter.delete(ip);
  } catch (error) {
    console.error('重置IP速率限制失败:', error);
  }
}

/**
 * 获取速率限制状态
 */
export async function getRateLimitStatus(key: string, type: RateLimitType = RateLimitType.API): Promise<{
  totalHits: number;
  remainingPoints: number;
  msBeforeNext: number;
} | null> {
  try {
    let limiter: any = rateLimiter;
    switch (type) {
      case RateLimitType.AUTH:
        limiter = authRateLimiter;
        break;
      case RateLimitType.UPLOAD:
        limiter = uploadRateLimiter;
        break;
      case RateLimitType.AI:
        limiter = aiRateLimiter;
        break;
    }

    const result: any = await limiter.get(key);
    return result;
  } catch (error) {
    console.error('获取速率限制状态失败:', error);
    return null;
  }
} 