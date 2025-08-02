#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent日志配置模块

本模块负责配置ZK-Agent后端服务的日志系统。使用structlog提供
结构化日志记录，支持JSON格式输出，便于日志分析和监控。

主要功能：
- 结构化日志配置
- 多种日志输出格式
- 日志级别管理
- 日志文件轮转
- 性能监控日志

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import logging
import logging.handlers
import sys
from pathlib import Path
from typing import Any, Dict

import structlog
from structlog.typing import EventDict

from app.core.config import settings


def add_timestamp(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """
    添加时间戳到日志事件
    
    Args:
        logger: 日志记录器实例
        method_name: 日志方法名
        event_dict: 事件字典
        
    Returns:
        EventDict: 包含时间戳的事件字典
    """
    import datetime
    event_dict["timestamp"] = datetime.datetime.utcnow().isoformat()
    return event_dict


def add_log_level(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """
    添加日志级别到日志事件
    
    Args:
        logger: 日志记录器实例
        method_name: 日志方法名
        event_dict: 事件字典
        
    Returns:
        EventDict: 包含日志级别的事件字典
    """
    event_dict["level"] = method_name.upper()
    return event_dict


def add_logger_name(logger: Any, method_name: str, event_dict: EventDict) -> EventDict:
    """
    添加日志记录器名称到日志事件
    
    Args:
        logger: 日志记录器实例
        method_name: 日志方法名
        event_dict: 事件字典
        
    Returns:
        EventDict: 包含记录器名称的事件字典
    """
    if hasattr(logger, "name"):
        event_dict["logger"] = logger.name
    return event_dict


def setup_logging() -> None:
    """
    设置日志系统配置
    
    配置structlog和标准库logging，支持开发和生产环境的不同需求。
    开发环境使用彩色控制台输出，生产环境使用JSON格式。
    """
    # 配置标准库logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    )
    
    # 配置文件日志处理器（如果指定了日志文件）
    if settings.LOG_FILE:
        log_file_path = Path(settings.LOG_FILE)
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            filename=settings.LOG_FILE,
            maxBytes=settings.LOG_MAX_SIZE,
            backupCount=settings.LOG_BACKUP_COUNT,
            encoding="utf-8"
        )
        file_handler.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
        
        # 为文件输出配置JSON格式
        file_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", '
            '"logger": "%(name)s", "message": "%(message)s"}'
        )
        file_handler.setFormatter(file_formatter)
        
        # 添加到根日志记录器
        root_logger = logging.getLogger()
        root_logger.addHandler(file_handler)
    
    # 配置structlog处理器链
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        add_timestamp,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]
    
    # 根据环境选择输出格式
    if settings.is_development:
        # 开发环境：彩色控制台输出
        processors.append(
            structlog.dev.ConsoleRenderer(
                colors=True,
                exception_formatter=structlog.dev.plain_traceback
            )
        )
    else:
        # 生产环境：JSON格式输出
        processors.append(structlog.processors.JSONRenderer())
    
    # 配置structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        context_class=dict,
        cache_logger_on_first_use=True,
    )
    
    # 设置第三方库的日志级别
    _configure_third_party_loggers()


def _configure_third_party_loggers() -> None:
    """
    配置第三方库的日志级别
    
    降低一些第三方库的日志级别，避免过多的调试信息。
    """
    # SQLAlchemy日志配置
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.dialects").setLevel(logging.WARNING)
    
    # HTTP客户端日志配置
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # Redis日志配置
    logging.getLogger("redis").setLevel(logging.WARNING)
    
    # Uvicorn日志配置
    if not settings.is_development:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    
    # FastAPI日志配置
    logging.getLogger("fastapi").setLevel(logging.INFO)


def get_logger(name: str) -> structlog.BoundLogger:
    """
    获取结构化日志记录器
    
    Args:
        name: 日志记录器名称
        
    Returns:
        structlog.BoundLogger: 结构化日志记录器实例
    """
    return structlog.get_logger(name)


class LoggerMixin:
    """
    日志记录器混入类
    
    为类提供便捷的日志记录功能。
    """
    
    @property
    def logger(self) -> structlog.BoundLogger:
        """
        获取当前类的日志记录器
        
        Returns:
            structlog.BoundLogger: 绑定到当前类的日志记录器
        """
        if not hasattr(self, "_logger"):
            self._logger = get_logger(self.__class__.__module__ + "." + self.__class__.__name__)
        return self._logger


def log_function_call(func_name: str, **kwargs: Any) -> None:
    """
    记录函数调用日志
    
    Args:
        func_name: 函数名称
        **kwargs: 函数参数
    """
    logger = get_logger("function_call")
    logger.info(f"调用函数: {func_name}", **kwargs)


def log_performance(operation: str, duration: float, **kwargs: Any) -> None:
    """
    记录性能日志
    
    Args:
        operation: 操作名称
        duration: 执行时间（秒）
        **kwargs: 额外信息
    """
    logger = get_logger("performance")
    logger.info(
        f"性能监控: {operation}",
        duration=duration,
        duration_ms=round(duration * 1000, 2),
        **kwargs
    )


def log_error(error: Exception, context: Dict[str, Any] = None) -> None:
    """
    记录错误日志
    
    Args:
        error: 异常实例
        context: 错误上下文信息
    """
    logger = get_logger("error")
    context = context or {}
    logger.error(
        f"发生错误: {type(error).__name__}: {str(error)}",
        error_type=type(error).__name__,
        error_message=str(error),
        **context,
        exc_info=True
    )