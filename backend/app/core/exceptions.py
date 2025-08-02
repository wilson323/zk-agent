#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent异常处理模块

本模块定义了ZK-Agent后端服务的自定义异常类和全局异常处理器。
提供统一的错误处理机制，确保API响应的一致性和可读性。

主要功能：
- 自定义异常类定义
- 全局异常处理器
- 错误响应格式化
- 异常日志记录

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


class ZKAgentException(Exception):
    """
    ZK-Agent基础异常类
    
    所有自定义异常都应该继承此基类。
    
    Args:
        message: 异常消息
        code: 错误代码
        details: 详细信息
    """
    
    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code or "UNKNOWN_ERROR"
        self.details = details or {}
        super().__init__(self.message)


class AgentException(ZKAgentException):
    """
    智能体相关异常
    
    用于处理智能体创建、配置、执行等相关错误。
    """
    pass


class ValidationException(ZKAgentException):
    """
    数据验证异常
    
    用于处理输入数据验证失败的情况。
    """
    pass


class DatabaseException(ZKAgentException):
    """
    数据库操作异常
    
    用于处理数据库连接、查询、事务等相关错误。
    """
    pass


class AuthenticationException(ZKAgentException):
    """
    身份认证异常
    
    用于处理用户认证失败的情况。
    """
    pass


class AuthorizationException(ZKAgentException):
    """
    权限授权异常
    
    用于处理用户权限不足的情况。
    """
    pass


class WorkflowException(ZKAgentException):
    """
    工作流异常
    
    用于处理工作流执行、配置等相关错误。
    """
    pass


class ExternalServiceException(ZKAgentException):
    """
    外部服务异常
    
    用于处理调用外部API或服务时的错误。
    """
    pass


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    全局异常处理器
    
    处理所有未被捕获的异常，返回统一格式的错误响应。
    
    Args:
        request: FastAPI请求对象
        exc: 异常实例
        
    Returns:
        JSONResponse: 格式化的错误响应
    """
    logger.error(
        f"全局异常处理: {type(exc).__name__}: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "client": request.client.host if request.client else None,
        },
        exc_info=True
    )
    
    if isinstance(exc, ZKAgentException):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "type": type(exc).__name__
                }
            }
        )
    
    elif isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "type": "HTTPException"
                }
            }
        )
    
    else:
        # 未知异常，返回通用错误信息
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "服务器内部错误，请稍后重试",
                    "type": "InternalServerError"
                }
            }
        )


async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """
    Pydantic验证异常处理器
    
    处理Pydantic模型验证失败的异常。
    
    Args:
        request: FastAPI请求对象
        exc: Pydantic验证异常
        
    Returns:
        JSONResponse: 格式化的验证错误响应
    """
    logger.warning(
        f"数据验证失败: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "errors": exc.errors(),
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "输入数据验证失败",
                "details": exc.errors(),
                "type": "ValidationError"
            }
        }
    )