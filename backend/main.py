#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent Python后端主应用入口

本文件是ZK-Agent多智能体系统的Python后端主入口，基于FastAPI框架构建。
实现了高性能的RESTful API服务，支持多智能体协作、任务编排和流式输出。

主要功能：
- FastAPI应用初始化和配置
- 中间件配置（CORS、安全、日志等）
- 路由注册和API文档生成
- 数据库连接和健康检查
- 异常处理和错误响应
- 性能监控和指标收集

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from app.core.config import get_settings
from app.core.database import database_manager
from app.core.exceptions import (
    AgentException,
    ValidationException,
    global_exception_handler,
    validation_exception_handler,
)
from app.core.logging import setup_logging
from app.core.middleware import (
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
    PerformanceMonitoringMiddleware,
    setup_all_middleware,
)
from app.core.redis import redis_manager
from app.routers import (
    agents,
    auth,
    health,
    tasks,
    tools,
    workflows,
    langgraph_multi_agent,
)

# 配置结构化日志
setup_logging()
logger = structlog.get_logger(__name__)

# 获取应用配置
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理
    
    处理应用启动和关闭时的资源初始化和清理工作。
    包括数据库连接、Redis连接、后台任务等。
    """
    logger.info("🚀 ZK-Agent后端服务启动中...")
    
    try:
        # 初始化数据库连接
        await database_manager.connect()
        logger.info("✅ 数据库连接已建立")
        
        # 初始化Redis连接
        await redis_manager.initialize()
        logger.info("✅ Redis连接已建立")
        
        # 运行数据库迁移 (暂时注释掉，SQLite不需要迁移)
        # await database_manager.run_migrations()
        # logger.info("✅ 数据库迁移完成")
        
        logger.info("🎉 ZK-Agent后端服务启动完成")
        
        yield
        
    except Exception as e:
        logger.error("❌ 服务启动失败", error=str(e), exc_info=True)
        raise
    finally:
        # 清理资源
        logger.info("🔄 正在关闭ZK-Agent后端服务...")
        
        await redis_manager.disconnect()
        logger.info("✅ Redis连接已关闭")
        
        await database_manager.disconnect()
        logger.info("✅ 数据库连接已关闭")
        
        logger.info("👋 ZK-Agent后端服务已关闭")


def create_app() -> FastAPI:
    """
    创建FastAPI应用实例
    
    配置应用的基本信息、中间件、路由和异常处理器。
    
    Returns:
        FastAPI: 配置完成的FastAPI应用实例
    """
    # 创建FastAPI应用
    app = FastAPI(
        title="ZK-Agent API",
        description="AI多智能体宇宙平台后端API服务",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )
    
    # 配置CORS中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 配置安全中间件
    if settings.ENVIRONMENT == "production":
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=settings.ALLOWED_HOSTS,
        )
    
    # 配置压缩中间件
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # 配置自定义中间件
    setup_all_middleware(app)
    
    # 注册异常处理器
    app.add_exception_handler(AgentException, global_exception_handler)
    app.add_exception_handler(ValidationException, validation_exception_handler)
    
    # 注册路由
    app.include_router(health.router, prefix="/api/v1", tags=["健康检查"])
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["身份认证"])
    app.include_router(agents.router, prefix="/api/v1/agents", tags=["智能体管理"])
    app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["任务管理"])
    app.include_router(workflows.router, prefix="/api/v1/workflows", tags=["工作流"])
    app.include_router(tools.router, prefix="/api/v1/tools", tags=["工具管理"])
    app.include_router(langgraph_multi_agent.router, tags=["LangGraph多智能体"])
    
    # 添加Prometheus指标端点
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)
    
    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        """根路径健康检查"""
        return {
            "message": "ZK-Agent API服务运行正常",
            "version": "1.0.0",
            "status": "healthy",
            "docs": "/docs" if settings.DEBUG else "文档已禁用",
        }
    
    return app


# 创建应用实例
app = create_app()


if __name__ == "__main__":
    """
    直接运行时的入口点
    
    用于开发环境的快速启动，生产环境建议使用uvicorn命令行工具。
    """
    try:
        # 配置uvicorn服务器
        config = uvicorn.Config(
            app="main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level="info" if settings.DEBUG else "warning",
            access_log=settings.DEBUG,
            workers=1 if settings.DEBUG else settings.WORKERS,
        )
        
        server = uvicorn.Server(config)
        
        # 启动服务器
        logger.info(
            "🚀 启动ZK-Agent后端服务",
            host=settings.HOST,
            port=settings.PORT,
            debug=settings.DEBUG,
            workers=config.workers,
        )
        
        asyncio.run(server.serve())
        
    except KeyboardInterrupt:
        logger.info("👋 收到中断信号，正在关闭服务...")
    except Exception as e:
        logger.error("❌ 服务启动失败", error=str(e), exc_info=True)
        sys.exit(1)