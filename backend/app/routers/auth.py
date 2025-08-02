#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent身份认证路由

本模块定义了ZK-Agent后端服务的身份认证API端点。

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def auth_status():
    """认证状态检查"""
    return {"message": "认证服务正常"}