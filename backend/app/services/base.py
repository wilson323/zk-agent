#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent服务层基础接口和抽象类

本模块定义了ZK-Agent系统服务层的基础接口和抽象类，
确保所有服务遵循统一的设计模式和架构原则。

核心组件：
- IService: 服务基础接口
- BaseService: 服务抽象基类
- ServiceContext: 服务上下文
- ServiceResult: 服务结果封装
- ServiceError: 服务异常基类

设计模式：
- 策略模式：支持不同的服务实现策略
- 模板方法模式：定义服务执行流程
- 观察者模式：支持服务事件通知
- 装饰器模式：支持服务增强功能

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union, Generic, TypeVar, Callable
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import logging
import time
import uuid
from datetime import datetime
from contextlib import asynccontextmanager

# 类型变量
T = TypeVar('T')
R = TypeVar('R')

# 配置日志
logger = logging.getLogger(__name__)


class ServiceStatus(Enum):
    """服务状态枚举"""
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class ServicePriority(Enum):
    """服务优先级枚举"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class ServiceMetrics:
    """服务指标数据"""
    request_count: int = 0
    success_count: int = 0
    error_count: int = 0
    total_duration: float = 0.0
    avg_duration: float = 0.0
    last_request_time: Optional[datetime] = None
    last_error_time: Optional[datetime] = None
    last_error_message: Optional[str] = None

    def update_success(self, duration: float) -> None:
        """更新成功指标"""
        self.request_count += 1
        self.success_count += 1
        self.total_duration += duration
        self.avg_duration = self.total_duration / self.request_count
        self.last_request_time = datetime.utcnow()

    def update_error(self, error_message: str) -> None:
        """更新错误指标"""
        self.request_count += 1
        self.error_count += 1
        self.last_request_time = datetime.utcnow()
        self.last_error_time = datetime.utcnow()
        self.last_error_message = error_message


@dataclass
class ServiceContext:
    """服务上下文"""
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    trace_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    start_time: datetime = field(default_factory=datetime.utcnow)
    timeout: Optional[float] = None
    priority: ServicePriority = ServicePriority.NORMAL
    retry_count: int = 0
    max_retries: int = 3

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "request_id": self.request_id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "trace_id": self.trace_id,
            "metadata": self.metadata,
            "start_time": self.start_time.isoformat(),
            "timeout": self.timeout,
            "priority": self.priority.value,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries
        }


@dataclass
class ServiceResult(Generic[T]):
    """服务结果封装"""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    duration: Optional[float] = None
    context: Optional[ServiceContext] = None

    @classmethod
    def success_result(cls, data: T, metadata: Optional[Dict[str, Any]] = None, 
                      context: Optional[ServiceContext] = None) -> 'ServiceResult[T]':
        """创建成功结果"""
        return cls(
            success=True,
            data=data,
            metadata=metadata or {},
            context=context
        )

    @classmethod
    def error_result(cls, error: str, error_code: Optional[str] = None,
                    metadata: Optional[Dict[str, Any]] = None,
                    context: Optional[ServiceContext] = None) -> 'ServiceResult[T]':
        """创建错误结果"""
        return cls(
            success=False,
            error=error,
            error_code=error_code,
            metadata=metadata or {},
            context=context
        )

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = {
            "success": self.success,
            "metadata": self.metadata,
            "duration": self.duration
        }
        
        if self.success:
            result["data"] = self.data
        else:
            result["error"] = self.error
            if self.error_code:
                result["error_code"] = self.error_code
                
        if self.context:
            result["context"] = self.context.to_dict()
            
        return result


class ServiceError(Exception):
    """服务异常基类"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, 
                 context: Optional[ServiceContext] = None, 
                 original_error: Optional[Exception] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.context = context
        self.original_error = original_error
        self.timestamp = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = {
            "message": self.message,
            "timestamp": self.timestamp.isoformat()
        }
        
        if self.error_code:
            result["error_code"] = self.error_code
            
        if self.context:
            result["context"] = self.context.to_dict()
            
        if self.original_error:
            result["original_error"] = str(self.original_error)
            
        return result


class ValidationError(ServiceError):
    """验证错误"""
    pass


class BusinessError(ServiceError):
    """业务逻辑错误"""
    pass


class ResourceError(ServiceError):
    """资源错误"""
    pass


class TimeoutError(ServiceError):
    """超时错误"""
    pass


class IService(ABC, Generic[T, R]):
    """服务基础接口"""
    
    @abstractmethod
    async def execute(self, request: T, context: Optional[ServiceContext] = None) -> ServiceResult[R]:
        """执行服务"""
        pass
    
    @abstractmethod
    async def validate(self, request: T, context: Optional[ServiceContext] = None) -> bool:
        """验证请求"""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """健康检查"""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """服务名称"""
        pass
    
    @property
    @abstractmethod
    def version(self) -> str:
        """服务版本"""
        pass


class BaseService(IService[T, R]):
    """服务抽象基类"""
    
    def __init__(self, name: str, version: str = "1.0.0"):
        self._name = name
        self._version = version
        self._status = ServiceStatus.INITIALIZING
        self._metrics = ServiceMetrics()
        self._event_handlers: Dict[str, List[Callable]] = {}
        self._middleware: List[Callable] = []
        self._logger = logging.getLogger(f"{__name__}.{name}")
        
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def version(self) -> str:
        return self._version
    
    @property
    def status(self) -> ServiceStatus:
        return self._status
    
    @property
    def metrics(self) -> ServiceMetrics:
        return self._metrics
    
    async def execute(self, request: T, context: Optional[ServiceContext] = None) -> ServiceResult[R]:
        """执行服务（模板方法）"""
        if context is None:
            context = ServiceContext()
            
        start_time = time.time()
        
        try:
            # 前置处理
            await self._before_execute(request, context)
            
            # 验证请求
            if not await self.validate(request, context):
                raise ValidationError("Request validation failed", context=context)
            
            # 应用中间件
            for middleware in self._middleware:
                request = await middleware(request, context)
            
            # 执行核心逻辑
            result = await self._execute_core(request, context)
            
            # 后置处理
            result = await self._after_execute(result, context)
            
            # 更新指标
            duration = time.time() - start_time
            self._metrics.update_success(duration)
            result.duration = duration
            result.context = context
            
            # 触发成功事件
            await self._emit_event("success", {"result": result, "context": context})
            
            return result
            
        except Exception as e:
            # 更新错误指标
            self._metrics.update_error(str(e))
            
            # 触发错误事件
            await self._emit_event("error", {"error": e, "context": context})
            
            # 包装异常
            if isinstance(e, ServiceError):
                error_result = ServiceResult.error_result(
                    error=e.message,
                    error_code=e.error_code,
                    context=context
                )
            else:
                error_result = ServiceResult.error_result(
                    error=str(e),
                    error_code="INTERNAL_ERROR",
                    context=context
                )
            
            error_result.duration = time.time() - start_time
            return error_result
    
    @abstractmethod
    async def _execute_core(self, request: T, context: ServiceContext) -> ServiceResult[R]:
        """核心执行逻辑（子类实现）"""
        pass
    
    async def _before_execute(self, request: T, context: ServiceContext) -> None:
        """执行前处理（可重写）"""
        self._logger.debug(f"Executing service {self.name} with request_id: {context.request_id}")
    
    async def _after_execute(self, result: ServiceResult[R], context: ServiceContext) -> ServiceResult[R]:
        """执行后处理（可重写）"""
        self._logger.debug(f"Service {self.name} completed with request_id: {context.request_id}")
        return result
    
    async def validate(self, request: T, context: Optional[ServiceContext] = None) -> bool:
        """默认验证实现（可重写）"""
        return request is not None
    
    async def health_check(self) -> bool:
        """默认健康检查实现（可重写）"""
        return self._status in [ServiceStatus.RUNNING, ServiceStatus.PAUSED]
    
    def add_middleware(self, middleware: Callable) -> None:
        """添加中间件"""
        self._middleware.append(middleware)
    
    def add_event_handler(self, event: str, handler: Callable) -> None:
        """添加事件处理器"""
        if event not in self._event_handlers:
            self._event_handlers[event] = []
        self._event_handlers[event].append(handler)
    
    async def _emit_event(self, event: str, data: Dict[str, Any]) -> None:
        """触发事件"""
        if event in self._event_handlers:
            for handler in self._event_handlers[event]:
                try:
                    await handler(data)
                except Exception as e:
                    self._logger.error(f"Event handler error: {e}")
    
    async def start(self) -> None:
        """启动服务"""
        self._status = ServiceStatus.RUNNING
        self._logger.info(f"Service {self.name} started")
        await self._emit_event("started", {"service": self.name})
    
    async def stop(self) -> None:
        """停止服务"""
        self._status = ServiceStatus.STOPPING
        await self._emit_event("stopping", {"service": self.name})
        self._status = ServiceStatus.STOPPED
        self._logger.info(f"Service {self.name} stopped")
        await self._emit_event("stopped", {"service": self.name})
    
    async def pause(self) -> None:
        """暂停服务"""
        self._status = ServiceStatus.PAUSED
        self._logger.info(f"Service {self.name} paused")
        await self._emit_event("paused", {"service": self.name})
    
    async def resume(self) -> None:
        """恢复服务"""
        self._status = ServiceStatus.RUNNING
        self._logger.info(f"Service {self.name} resumed")
        await self._emit_event("resumed", {"service": self.name})
    
    @asynccontextmanager
    async def transaction(self):
        """事务上下文管理器（可重写）"""
        try:
            yield
        except Exception:
            # 子类可以实现回滚逻辑
            raise


# 服务装饰器
def service_method(timeout: Optional[float] = None, retries: int = 0):
    """服务方法装饰器"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            attempt = 0
            while attempt <= retries:
                try:
                    if timeout:
                        return await asyncio.wait_for(func(*args, **kwargs), timeout=timeout)
                    else:
                        return await func(*args, **kwargs)
                except asyncio.TimeoutError:
                    if attempt == retries:
                        raise TimeoutError(f"Service method {func.__name__} timed out after {timeout}s")
                except Exception as e:
                    if attempt == retries:
                        raise
                    attempt += 1
                    await asyncio.sleep(2 ** attempt)  # 指数退避
            
        return wrapper
    return decorator