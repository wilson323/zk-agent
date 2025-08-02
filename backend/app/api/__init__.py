#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent API路由模块初始化

本模块负责初始化ZK-Agent系统的API路由层，提供RESTful API接口
用于与前端和外部系统进行交互。

核心功能：
- API路由注册和管理
- 请求/响应处理
- 认证和授权
- 错误处理
- API文档生成
- 版本管理
- 限流和监控

API设计原则：
- RESTful设计
- 统一响应格式
- 版本化管理
- 安全认证
- 性能优化
- 可观测性

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from fastapi import APIRouter
from app.api.v1 import api as api_v1

# 创建主API路由器
api_router = APIRouter()

# 注册v1版本的API路由
api_router.include_router(api_v1.api_router, prefix="/v1")

# 可以在这里添加其他版本的API路由
# api_router.include_router(api_v2.api_router, prefix="/v2")

__all__ = ["api_router"]