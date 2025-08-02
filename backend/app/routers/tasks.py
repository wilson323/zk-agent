#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent任务管理路由

本模块定义了ZK-Agent后端服务的任务管理API端点。

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_tasks():
    """获取任务列表"""
    return {"message": "任务管理服务正常", "tasks": []}