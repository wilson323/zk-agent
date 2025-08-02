"""ZK-Agent后端日志记录工具

该模块提供统一的日志记录功能，支持结构化日志记录和多种输出格式。

Functions:
    get_logger: 获取配置好的日志记录器
    setup_logging: 设置全局日志配置
    
Author: ZK-Agent Team
Version: 1.0.0
Date: 2024-01-24
"""

import logging
import sys
from typing import Optional
from pathlib import Path

# 全局日志配置
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# 日志级别映射
LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def get_logger(name: Optional[str] = None, level: str = "INFO") -> logging.Logger:
    """获取配置好的日志记录器
    
    该函数创建并返回一个配置好的日志记录器实例。
    
    Args:
        name: 日志记录器名称，默认为调用模块名
        level: 日志级别，默认为INFO
        
    Returns:
        logging.Logger: 配置好的日志记录器实例
        
    Examples:
        >>> logger = get_logger(__name__)
        >>> logger.info("这是一条信息日志")
        >>> logger.error("这是一条错误日志")
    """
    if name is None:
        name = __name__
    
    logger = logging.getLogger(name)
    
    # 避免重复添加处理器
    if not logger.handlers:
        # 设置日志级别
        log_level = LOG_LEVELS.get(level.upper(), logging.INFO)
        logger.setLevel(log_level)
        
        # 创建控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        
        # 创建格式化器
        formatter = logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT)
        console_handler.setFormatter(formatter)
        
        # 添加处理器到日志记录器
        logger.addHandler(console_handler)
        
        # 防止日志向上传播
        logger.propagate = False
    
    return logger


def setup_logging(
    level: str = "INFO",
    log_file: Optional[str] = None,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
) -> None:
    """设置全局日志配置
    
    该函数配置全局日志设置，包括日志级别、输出文件等。
    
    Args:
        level: 全局日志级别
        log_file: 日志文件路径，如果为None则只输出到控制台
        max_bytes: 日志文件最大大小（字节）
        backup_count: 备份文件数量
        
    Examples:
        >>> setup_logging("DEBUG", "app.log")
        >>> logger = get_logger(__name__)
        >>> logger.debug("调试信息")
    """
    # 设置根日志记录器级别
    log_level = LOG_LEVELS.get(level.upper(), logging.INFO)
    logging.basicConfig(
        level=log_level,
        format=LOG_FORMAT,
        datefmt=LOG_DATE_FORMAT
    )
    
    # 如果指定了日志文件，添加文件处理器
    if log_file:
        from logging.handlers import RotatingFileHandler
        
        # 确保日志目录存在
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 创建轮转文件处理器
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(log_level)
        
        # 创建格式化器
        formatter = logging.Formatter(LOG_FORMAT, LOG_DATE_FORMAT)
        file_handler.setFormatter(formatter)
        
        # 添加到根日志记录器
        logging.getLogger().addHandler(file_handler)


def get_structured_logger(name: Optional[str] = None) -> logging.Logger:
    """获取结构化日志记录器
    
    该函数返回一个支持结构化日志记录的日志记录器。
    
    Args:
        name: 日志记录器名称
        
    Returns:
        logging.Logger: 结构化日志记录器
        
    Examples:
        >>> logger = get_structured_logger(__name__)
        >>> logger.info("用户登录", extra={"user_id": 123, "ip": "192.168.1.1"})
    """
    return get_logger(name)


# 默认日志记录器
default_logger = get_logger("zk-agent")