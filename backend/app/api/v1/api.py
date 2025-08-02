#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent API v1版本主路由

本模块负责注册和管理ZK-Agent系统的API v1版本的所有路由。

核心功能：
- 路由注册和管理
- API版本控制
- 统一错误处理
- 请求/响应中间件
- API文档配置

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    agents,
    tasks,
    workflows,
    tools,
    memory,
    health
)
from app.api.v1 import multimodal

# 创建API路由器
api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["authentication"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"]
)

api_router.include_router(
    agents.router,
    prefix="/agents",
    tags=["agents"]
)

api_router.include_router(
    tasks.router,
    prefix="/tasks",
    tags=["tasks"]
)

api_router.include_router(
    workflows.router,
    prefix="/workflows",
    tags=["workflows"]
)

api_router.include_router(
    tools.router,
    prefix="/tools",
    tags=["tools"]
)

api_router.include_router(
    memory.router,
    prefix="/memory",
    tags=["memory"]
)

api_router.include_router(
    health.router,
    prefix="/health",
    tags=["health"]
)

api_router.include_router(
    multimodal.router,
    tags=["multimodal"]
)