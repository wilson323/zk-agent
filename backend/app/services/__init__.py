#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent服务层模块初始化

本模块定义了ZK-Agent系统的服务层架构，采用模块化组件化设计，
实现多智能体协作、记忆管理、工具演化等核心功能。

服务层架构：
- AgentService: 智能体管理服务
- TaskService: 任务调度服务
- WorkflowService: 工作流编排服务
- MemoryService: 记忆管理服务
- ToolService: 工具管理服务
- CollaborationService: 协作管理服务
- SecurityService: 安全管理服务
- MonitoringService: 监控管理服务

设计原则：
- 单一职责原则：每个服务专注于特定领域
- 依赖注入：通过接口解耦服务依赖
- 异步优先：支持高并发处理
- 错误隔离：服务间错误不相互影响
- 可观测性：完整的日志和监控

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from typing import Dict, Any, Optional
import logging

# 配置日志
logger = logging.getLogger(__name__)

# 服务注册表
_service_registry: Dict[str, Any] = {}


def register_service(name: str, service: Any) -> None:
    """
    注册服务到服务注册表
    
    Args:
        name: 服务名称
        service: 服务实例
        
    Raises:
        ValueError: 当服务名称已存在时抛出
        
    Examples:
        >>> register_service("agent_service", agent_service_instance)
    """
    if name in _service_registry:
        raise ValueError(f"Service '{name}' already registered")
    
    _service_registry[name] = service
    logger.info(f"Service '{name}' registered successfully")


def get_service(name: str) -> Optional[Any]:
    """
    从服务注册表获取服务实例
    
    Args:
        name: 服务名称
        
    Returns:
        Optional[Any]: 服务实例，如果不存在则返回None
        
    Examples:
        >>> agent_service = get_service("agent_service")
        >>> if agent_service:
        ...     result = agent_service.create_agent(data)
    """
    return _service_registry.get(name)


def unregister_service(name: str) -> bool:
    """
    从服务注册表注销服务
    
    Args:
        name: 服务名称
        
    Returns:
        bool: 注销是否成功
        
    Examples:
        >>> success = unregister_service("agent_service")
        >>> print(f"Unregistration successful: {success}")
    """
    if name in _service_registry:
        del _service_registry[name]
        logger.info(f"Service '{name}' unregistered successfully")
        return True
    return False


def list_services() -> Dict[str, str]:
    """
    列出所有已注册的服务
    
    Returns:
        Dict[str, str]: 服务名称到服务类型的映射
        
    Examples:
        >>> services = list_services()
        >>> for name, service_type in services.items():
        ...     print(f"{name}: {service_type}")
    """
    return {name: type(service).__name__ for name, service in _service_registry.items()}


def clear_services() -> None:
    """
    清空所有已注册的服务
    
    主要用于测试环境的清理工作。
    
    Examples:
        >>> clear_services()
        >>> assert len(list_services()) == 0
    """
    global _service_registry
    _service_registry.clear()
    logger.info("All services cleared from registry")


# 导出主要服务类
__all__ = [
    "register_service",
    "get_service",
    "unregister_service",
    "list_services",
    "clear_services",
]