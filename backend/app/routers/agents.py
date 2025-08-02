#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent智能体管理路由

本模块定义了ZK-Agent后端服务的智能体管理API端点。

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_agents():
    """获取智能体列表"""
    return {"message": "智能体管理服务正常", "agents": []}