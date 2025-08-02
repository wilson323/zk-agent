#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent中间件模块

本模块定义了ZK-Agent后端服务的各种中间件，包括CORS、认证、
日志记录、性能监控、错误处理等功能。

主要功能：
- CORS跨域处理
- 请求/响应日志记录
- 性能监控中间件
- 安全头设置
- 请求ID追踪
- 限流中间件

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import time
import uuid
from typing import Callable

import structlog
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings

logger = structlog.get_logger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    请求日志记录中间件
    
    记录所有HTTP请求和响应的详细信息，包括请求时间、
    响应状态、处理时长等。
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        处理请求并记录日志
        
        Args:
            request: HTTP请求对象
            call_next: 下一个中间件或路由处理器
            
        Returns:
            Response: HTTP响应对象
        """
        # 生成请求ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 记录请求开始时间
        start_time = time.time()
        
        # 记录请求信息
        logger.info(
            "HTTP请求开始",
            request_id=request_id,
            method=request.method,
            url=str(request.url),
            client_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        
        try:
            # 处理请求
            response = await call_next(request)
            
            # 计算处理时间
            process_time = time.time() - start_time
            
            # 记录响应信息
            logger.info(
                "HTTP请求完成",
                request_id=request_id,
                method=request.method,
                url=str(request.url),
                status_code=response.status_code,
                process_time=round(process_time, 4),
                process_time_ms=round(process_time * 1000, 2),
            )
            
            # 添加响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = str(round(process_time, 4))
            
            return response
            
        except Exception as exc:
            # 计算处理时间
            process_time = time.time() - start_time
            
            # 记录异常信息
            logger.error(
                "HTTP请求异常",
                request_id=request_id,
                method=request.method,
                url=str(request.url),
                error=str(exc),
                error_type=type(exc).__name__,
                process_time=round(process_time, 4),
                exc_info=True,
            )
            
            # 重新抛出异常
            raise


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    安全头中间件
    
    为所有响应添加安全相关的HTTP头，提高应用安全性。
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        处理请求并添加安全头
        
        Args:
            request: HTTP请求对象
            call_next: 下一个中间件或路由处理器
            
        Returns:
            Response: 包含安全头的HTTP响应对象
        """
        response = await call_next(request)
        
        # 添加安全头
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # 在生产环境中添加HSTS头
        if not settings.is_development:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        
        return response


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    性能监控中间件
    
    监控API端点的性能指标，包括响应时间、内存使用等。
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        处理请求并监控性能
        
        Args:
            request: HTTP请求对象
            call_next: 下一个中间件或路由处理器
            
        Returns:
            Response: HTTP响应对象
        """
        import psutil
        import os
        
        # 获取进程信息
        process = psutil.Process(os.getpid())
        
        # 记录开始状态
        start_time = time.time()
        start_memory = process.memory_info().rss / 1024 / 1024  # MB
        start_cpu = process.cpu_percent()
        
        try:
            # 处理请求
            response = await call_next(request)
            
            # 计算性能指标
            end_time = time.time()
            end_memory = process.memory_info().rss / 1024 / 1024  # MB
            end_cpu = process.cpu_percent()
            
            duration = end_time - start_time
            memory_delta = end_memory - start_memory
            
            # 记录性能指标（仅对慢请求记录详细信息）
            if duration > 1.0:  # 超过1秒的请求
                logger.warning(
                    "慢请求检测",
                    request_id=getattr(request.state, "request_id", None),
                    method=request.method,
                    url=str(request.url),
                    duration=round(duration, 4),
                    memory_start_mb=round(start_memory, 2),
                    memory_end_mb=round(end_memory, 2),
                    memory_delta_mb=round(memory_delta, 2),
                    cpu_start=start_cpu,
                    cpu_end=end_cpu,
                )
            
            return response
            
        except Exception as exc:
            # 记录异常时的性能信息
            end_time = time.time()
            duration = end_time - start_time
            
            logger.error(
                "请求异常性能信息",
                request_id=getattr(request.state, "request_id", None),
                method=request.method,
                url=str(request.url),
                duration=round(duration, 4),
                error=str(exc),
            )
            
            raise


def setup_cors_middleware(app: ASGIApp) -> None:
    """
    设置CORS中间件
    
    Args:
        app: FastAPI应用实例
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time"],
    )


def setup_trusted_host_middleware(app: ASGIApp) -> None:
    """
    设置可信主机中间件
    
    Args:
        app: FastAPI应用实例
    """
    if not settings.is_development:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.ALLOWED_HOSTS,
        )


def setup_custom_middleware(app: ASGIApp) -> None:
    """
    设置自定义中间件
    
    Args:
        app: FastAPI应用实例
    """
    # 添加性能监控中间件
    app.add_middleware(PerformanceMonitoringMiddleware)
    
    # 添加安全头中间件
    app.add_middleware(SecurityHeadersMiddleware)
    
    # 添加请求日志中间件
    app.add_middleware(RequestLoggingMiddleware)


def setup_all_middleware(app: ASGIApp) -> None:
    """
    设置所有中间件
    
    Args:
        app: FastAPI应用实例
    """
    logger.info("设置应用中间件")
    
    # 设置CORS中间件
    setup_cors_middleware(app)
    
    # 设置可信主机中间件
    setup_trusted_host_middleware(app)
    
    # 设置自定义中间件
    setup_custom_middleware(app)
    
    logger.info("中间件设置完成")