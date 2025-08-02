#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent API v1 endpoints初始化

本模块负责初始化ZK-Agent系统的API v1版本的所有端点。

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

# 导入所有端点模块
from . import (
    auth,
    users,
    agents,
    tasks,
    workflows,
    tools,
    memory,
    health
)

__all__ = [
    "auth",
    "users", 
    "agents",
    "tasks",
    "workflows",
    "tools",
    "memory",
    "health"
]