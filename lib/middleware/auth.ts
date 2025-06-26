// @ts-nocheck
/**
 * @file 认证中间件
 * @description 处理JWT认证、权限验证等
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '@/config/env';
import { ERROR_CODES } from '@/config/constants';

export interface IUser {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
}

export interface IAuthenticatedRequest extends NextRequest {
  user?: IUser;
}

/**
 * JWT认证中间件
 */
export function withAuth(handler: (req: IAuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: IAuthenticatedRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(req);
      
      if (!token) {
        return NextResponse.json(
          { 
            error: ERROR_CODES.AUTH_INVALID_CREDENTIALS, 
            message: '缺少认证令牌' 
          },
          { status: 401 }
        );
      }

      const decoded = jwt.verify(token, jwtConfig.secret) as any;
      
      // 验证令牌格式
      if (!decoded.id || !decoded.email || !decoded.role) {
        return NextResponse.json(
          { 
            error: ERROR_CODES.AUTH_INVALID_CREDENTIALS, 
            message: '无效的认证令牌' 
          },
          { status: 401 }
        );
      }

      // 设置用户信息
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };

      return await handler(req);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          { 
            error: ERROR_CODES.AUTH_TOKEN_EXPIRED, 
            message: '认证令牌已过期' 
          },
          { status: 401 }
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          { 
            error: ERROR_CODES.AUTH_INVALID_CREDENTIALS, 
            message: '无效的认证令牌' 
          },
          { status: 401 }
        );
      }

      console.error('认证中间件错误:', error);
      return NextResponse.json(
        { 
          error: ERROR_CODES.INTERNAL_SERVER_ERROR, 
          message: '认证服务异常' 
        },
        { status: 500 }
      );
    }
  };
}

/**
 * 管理员权限中间件
 */
export function withAdminAuth(handler: (req: IAuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (req: IAuthenticatedRequest): Promise<NextResponse> => {
    if (!req.user) {
      return NextResponse.json(
        { 
          error: ERROR_CODES.AUTH_INVALID_CREDENTIALS, 
          message: '用户信息缺失' 
        },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      return NextResponse.json(
        { 
          error: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, 
          message: '权限不足，需要管理员权限' 
        },
        { status: 403 }
      );
    }

    return await handler(req);
  });
}

/**
 * 超级管理员权限中间件
 */
export function withSuperAdminAuth(handler: (req: IAuthenticatedRequest) => Promise<NextResponse>) {
  return withAuth(async (req: IAuthenticatedRequest): Promise<NextResponse> => {
    if (!req.user) {
      return NextResponse.json(
        { 
          error: ERROR_CODES.AUTH_INVALID_CREDENTIALS, 
          message: '用户信息缺失' 
        },
        { status: 401 }
      );
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { 
          error: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, 
          message: '权限不足，需要超级管理员权限' 
        },
        { status: 403 }
      );
    }

    return await handler(req);
  });
}

/**
 * 权限检查中间件
 */
export function withPermission(permission: string) {
  return function(handler: (req: IAuthenticatedRequest) => Promise<NextResponse>) {
    return withAuth(async (req: IAuthenticatedRequest): Promise<NextResponse> => {
      if (!req.user) {
        return NextResponse.json(
          { 
            error: ERROR_CODES.AUTH_INVALID_CREDENTIALS, 
            message: '用户信息缺失' 
          },
          { status: 401 }
        );
      }

      if (!req.user.permissions.includes(permission) && req.user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { 
            error: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, 
            message: `权限不足，需要 ${permission} 权限` 
          },
          { status: 403 }
        );
      }

      return await handler(req);
    });
  };
}

/**
 * 可选认证中间件（不强制要求认证）
 */
export function withOptionalAuth(handler: (req: IAuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: IAuthenticatedRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(req);
      
      if (token) {
        const decoded = jwt.verify(token, jwtConfig.secret) as any;
        
        if (decoded.id && decoded.email && decoded.role) {
          req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            permissions: decoded.permissions || [],
          };
        }
      }

      return await handler(req);
    } catch (error) {
      // 可选认证失败时不返回错误，继续处理请求
      console.warn('可选认证失败:', error);
      return await handler(req);
    }
  };
}

/**
 * 从请求中提取JWT令牌
 */
function extractToken(req: NextRequest): string | null {
  // 从 Authorization header 中提取
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 从 Cookie 中提取
  const tokenCookie = req.cookies.get('auth-token');
  if (tokenCookie) {
    return tokenCookie.value;
  }

  // 从查询参数中提取（仅用于特殊场景）
  const tokenQuery = req.nextUrl.searchParams.get('token');
  if (tokenQuery) {
    return tokenQuery;
  }

  return null;
}

/**
 * 生成JWT令牌
 */
export function generateToken(user: Omit<IUser, 'permissions'> & { permissions?: string[] }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.expiresIn,
      issuer: 'zk-agent',
      audience: 'zk-agent-users',
    }
  );
}

/**
 * 生成刷新令牌
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.refreshExpiresIn,
      issuer: 'zk-agent',
      audience: 'zk-agent-refresh',
    }
  );
}

/**
 * 验证刷新令牌
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, jwtConfig.secret) as any;
    
    if (decoded.type !== 'refresh' || !decoded.userId) {
      return null;
    }

    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
} 