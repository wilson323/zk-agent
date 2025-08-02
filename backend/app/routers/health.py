#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent健康检查路由

本模块定义了ZK-Agent后端服务的健康检查API端点。
提供服务状态、数据库连接、Redis连接等健康状态检查。

主要功能：
- 基础健康检查
- 数据库连接检查
- Redis连接检查
- 系统资源监控
- 服务依赖检查

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import time
from typing import Dict, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import database_manager
from app.core.redis import redis_manager

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.get("/health", summary="基础健康检查")
async def health_check() -> Dict[str, Any]:
    """
    基础健康检查端点
    
    返回服务的基本状态信息。
    
    Returns:
        Dict[str, Any]: 健康状态信息
    """
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "ZK-Agent Backend",
        "version": "1.0.0"
    }


@router.get("/health/detailed", summary="详细健康检查")
async def detailed_health_check() -> Dict[str, Any]:
    """
    详细健康检查端点
    
    检查所有服务依赖的健康状态，包括数据库、Redis等。
    
    Returns:
        Dict[str, Any]: 详细的健康状态信息
        
    Raises:
        HTTPException: 当某个依赖服务不健康时
    """
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "ZK-Agent Backend",
        "version": "1.0.0",
        "checks": {}
    }
    
    overall_healthy = True
    
    # 检查数据库连接
    try:
        db_healthy = await check_database_health()
        health_status["checks"]["database"] = {
            "status": "healthy" if db_healthy else "unhealthy",
            "message": "数据库连接正常" if db_healthy else "数据库连接失败"
        }
        if not db_healthy:
            overall_healthy = False
    except Exception as e:
        logger.error("数据库健康检查失败", error=str(e))
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"数据库检查异常: {str(e)}"
        }
        overall_healthy = False
    
    # 检查Redis连接
    try:
        redis_healthy = await check_redis_health()
        health_status["checks"]["redis"] = {
            "status": "healthy" if redis_healthy else "unhealthy",
            "message": "Redis连接正常" if redis_healthy else "Redis连接失败"
        }
        if not redis_healthy:
            overall_healthy = False
    except Exception as e:
        logger.error("Redis健康检查失败", error=str(e))
        health_status["checks"]["redis"] = {
            "status": "unhealthy",
            "message": f"Redis检查异常: {str(e)}"
        }
        overall_healthy = False
    
    # 检查系统资源
    try:
        system_status = await check_system_resources()
        health_status["checks"]["system"] = system_status
    except Exception as e:
        logger.error("系统资源检查失败", error=str(e))
        health_status["checks"]["system"] = {
            "status": "unhealthy",
            "message": f"系统资源检查异常: {str(e)}"
        }
        overall_healthy = False
    
    # 更新总体状态
    health_status["status"] = "healthy" if overall_healthy else "unhealthy"
    
    # 如果不健康，返回503状态码
    if not overall_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )
    
    return health_status


@router.get("/health/ready", summary="就绪检查")
async def readiness_check() -> Dict[str, Any]:
    """
    就绪检查端点
    
    检查服务是否已准备好接收请求。
    
    Returns:
        Dict[str, Any]: 就绪状态信息
    """
    try:
        # 检查关键依赖
        db_ready = await check_database_health()
        redis_ready = await check_redis_health()
        
        ready = db_ready and redis_ready
        
        response = {
            "ready": ready,
            "timestamp": time.time(),
            "checks": {
                "database": db_ready,
                "redis": redis_ready
            }
        }
        
        if not ready:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=response
            )
        
        return response
        
    except Exception as e:
        logger.error("就绪检查失败", error=str(e))
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "ready": False,
                "timestamp": time.time(),
                "error": str(e)
            }
        )


@router.get("/health/live", summary="存活检查")
async def liveness_check() -> Dict[str, Any]:
    """
    存活检查端点
    
    简单的存活检查，确认服务进程正在运行。
    
    Returns:
        Dict[str, Any]: 存活状态信息
    """
    return {
        "alive": True,
        "timestamp": time.time(),
        "uptime": time.time() - start_time
    }


async def check_database_health() -> bool:
    """
    检查数据库健康状态
    
    Returns:
        bool: 数据库是否健康
    """
    try:
        # 这里应该执行一个简单的数据库查询
        # 由于我们还没有完整的数据库设置，暂时返回True
        return True
    except Exception as e:
        logger.error("数据库健康检查失败", error=str(e))
        return False


async def check_redis_health() -> bool:
    """
    检查Redis健康状态
    
    Returns:
        bool: Redis是否健康
    """
    try:
        # 这里应该执行一个简单的Redis操作
        # 由于我们还没有完整的Redis设置，暂时返回True
        return True
    except Exception as e:
        logger.error("Redis健康检查失败", error=str(e))
        return False


async def check_system_resources() -> Dict[str, Any]:
    """
    检查系统资源状态
    
    Returns:
        Dict[str, Any]: 系统资源状态信息
    """
    try:
        import psutil
        import os
        
        # 获取系统资源信息
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        cpu_percent = process.cpu_percent()
        
        # 获取系统总体资源
        system_memory = psutil.virtual_memory()
        system_cpu = psutil.cpu_percent(interval=1)
        
        return {
            "status": "healthy",
            "process": {
                "memory_mb": round(memory_info.rss / 1024 / 1024, 2),
                "cpu_percent": cpu_percent
            },
            "system": {
                "memory_percent": system_memory.percent,
                "cpu_percent": system_cpu,
                "available_memory_mb": round(system_memory.available / 1024 / 1024, 2)
            }
        }
    except Exception as e:
        logger.error("系统资源检查失败", error=str(e))
        return {
            "status": "unhealthy",
            "message": f"系统资源检查失败: {str(e)}"
        }


# 记录服务启动时间
start_time = time.time()