#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent应用配置管理模块

本模块负责管理ZK-Agent后端服务的所有配置项，包括数据库连接、
Redis配置、安全设置、AI模型配置等。使用Pydantic Settings进行
类型安全的配置管理和环境变量验证。

主要功能：
- 环境变量读取和验证
- 数据库连接配置
- Redis缓存配置
- JWT认证配置
- AI模型配置
- 安全设置
- 性能优化配置

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import secrets
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union

from pydantic import (
    AnyHttpUrl,
    EmailStr,
    Field,
    PostgresDsn,
    RedisDsn,
    validator,
)
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    """
    应用配置类
    
    使用Pydantic BaseSettings进行配置管理，支持从环境变量、
    .env文件等多种来源读取配置。所有配置项都有类型注解和验证。
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # ==================== 基础配置 ====================
    
    PROJECT_NAME: str = Field(default="ZK-Agent", description="项目名称")
    VERSION: str = Field(default="1.0.0", description="版本号")
    DESCRIPTION: str = Field(
        default="AI多智能体宇宙平台后端API服务",
        description="项目描述"
    )
    
    # 环境配置
    ENVIRONMENT: str = Field(default="development", description="运行环境")
    DEBUG: bool = Field(default=True, description="调试模式")
    
    # 服务器配置
    HOST: str = Field(default="0.0.0.0", description="服务器主机")
    PORT: int = Field(default=8000, description="服务器端口")
    WORKERS: int = Field(default=1, description="工作进程数")
    
    # 允许的主机
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1", "0.0.0.0"],
        description="允许的主机列表"
    )
    
    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        """解析CORS允许的源"""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # ==================== 数据库配置 ====================
    
    # PostgreSQL配置
    POSTGRES_SERVER: str = Field(default="localhost", description="PostgreSQL服务器")
    POSTGRES_USER: str = Field(default="zkagent", description="PostgreSQL用户名")
    POSTGRES_PASSWORD: str = Field(default="zkagent123", description="PostgreSQL密码")
    POSTGRES_DB: str = Field(default="zkagent", description="PostgreSQL数据库名")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL端口")
    
    DATABASE_URL: Optional[str] = None
    
    @validator("DATABASE_URL", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        """组装数据库连接URL"""
        if isinstance(v, str):
            return v
        # 如果没有设置DATABASE_URL，使用PostgreSQL默认配置
        return f"postgresql+asyncpg://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@{values.get('POSTGRES_SERVER')}:{values.get('POSTGRES_PORT')}/{values.get('POSTGRES_DB')}"
    
    # 数据库连接池配置
    DB_POOL_SIZE: int = Field(default=10, description="数据库连接池大小")
    DB_MAX_OVERFLOW: int = Field(default=20, description="数据库连接池最大溢出")
    DB_POOL_TIMEOUT: int = Field(default=30, description="数据库连接超时时间")
    DB_POOL_RECYCLE: int = Field(default=3600, description="数据库连接回收时间")
    
    # ==================== Redis配置 ====================
    
    REDIS_HOST: str = Field(default="localhost", description="Redis主机")
    REDIS_PORT: int = Field(default=6379, description="Redis端口")
    REDIS_PASSWORD: Optional[str] = Field(default=None, description="Redis密码")
    REDIS_DB: int = Field(default=0, description="Redis数据库")
    
    REDIS_URL: Optional[RedisDsn] = None
    
    @validator("REDIS_URL", pre=True)
    def assemble_redis_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        """组装Redis连接URL"""
        if isinstance(v, str):
            return v
        
        password = values.get("REDIS_PASSWORD")
        auth_part = f":{password}@" if password else ""
        
        return f"redis://{auth_part}{values.get('REDIS_HOST')}:{values.get('REDIS_PORT')}/{values.get('REDIS_DB')}"
    
    # Redis连接池配置
    REDIS_POOL_SIZE: int = Field(default=10, description="Redis连接池大小")
    REDIS_TIMEOUT: int = Field(default=5, description="Redis连接超时时间")
    
    # ==================== 安全配置 ====================
    
    # JWT配置
    SECRET_KEY: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        description="JWT密钥"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT算法")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="访问令牌过期时间（分钟）"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="刷新令牌过期时间（天）"
    )
    
    # 密码配置
    PASSWORD_MIN_LENGTH: int = Field(default=8, description="密码最小长度")
    PASSWORD_REQUIRE_UPPERCASE: bool = Field(default=True, description="密码需要大写字母")
    PASSWORD_REQUIRE_LOWERCASE: bool = Field(default=True, description="密码需要小写字母")
    PASSWORD_REQUIRE_NUMBERS: bool = Field(default=True, description="密码需要数字")
    PASSWORD_REQUIRE_SPECIAL: bool = Field(default=True, description="密码需要特殊字符")
    
    # 安全头配置
    SECURITY_HEADERS: bool = Field(default=True, description="启用安全头")
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="启用速率限制")
    RATE_LIMIT_REQUESTS: int = Field(default=100, description="速率限制请求数")
    RATE_LIMIT_WINDOW: int = Field(default=60, description="速率限制时间窗口（秒）")
    
    # ==================== AI模型配置 ====================
    
    # OpenAI配置
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API密钥")
    OPENAI_API_BASE: Optional[str] = Field(
        default="https://api.openai.com/v1",
        description="OpenAI API基础URL"
    )
    OPENAI_MODEL: str = Field(default="gpt-4", description="默认OpenAI模型")
    OPENAI_MAX_TOKENS: int = Field(default=4000, description="最大令牌数")
    OPENAI_TEMPERATURE: float = Field(default=0.7, description="温度参数")
    
    # 模型配置
    MODEL_TIMEOUT: int = Field(default=60, description="模型请求超时时间")
    MODEL_RETRY_ATTEMPTS: int = Field(default=3, description="模型请求重试次数")
    MODEL_RETRY_DELAY: float = Field(default=1.0, description="模型请求重试延迟")
    
    # ==================== 任务队列配置 ====================
    
    # Celery配置
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None
    
    @validator("CELERY_BROKER_URL", pre=True)
    def assemble_celery_broker(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """组装Celery代理URL"""
        if isinstance(v, str):
            return v
        redis_url = values.get("REDIS_URL")
        if redis_url:
            return str(redis_url)
        return "redis://localhost:6379/1"

    @validator("CELERY_RESULT_BACKEND", pre=True)
    def assemble_celery_backend(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """组装Celery结果后端URL"""
        if isinstance(v, str):
            return v
        redis_url = values.get("REDIS_URL")
        if redis_url:
            return str(redis_url)
        return "redis://localhost:6379/2"
    
    # 任务配置
    TASK_TIMEOUT: int = Field(default=300, description="任务超时时间")
    TASK_RETRY_ATTEMPTS: int = Field(default=3, description="任务重试次数")
    TASK_RETRY_DELAY: float = Field(default=5.0, description="任务重试延迟")
    
    # ==================== 文件存储配置 ====================
    
    # 文件上传配置
    UPLOAD_DIR: str = Field(default="uploads", description="上传目录")
    MAX_FILE_SIZE: int = Field(default=10 * 1024 * 1024, description="最大文件大小（字节）")
    ALLOWED_FILE_TYPES: List[str] = Field(
        default=[".txt", ".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg"],
        description="允许的文件类型"
    )
    
    # 静态文件配置
    STATIC_DIR: str = Field(default="static", description="静态文件目录")
    MEDIA_DIR: str = Field(default="media", description="媒体文件目录")
    
    # ==================== 日志配置 ====================
    
    # 日志级别
    LOG_LEVEL: str = Field(default="INFO", description="日志级别")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="日志格式"
    )
    
    # 日志文件配置
    LOG_FILE: Optional[str] = Field(default=None, description="日志文件路径")
    LOG_MAX_SIZE: int = Field(default=10 * 1024 * 1024, description="日志文件最大大小")
    LOG_BACKUP_COUNT: int = Field(default=5, description="日志文件备份数量")
    
    # ==================== 监控配置 ====================
    
    # Prometheus配置
    METRICS_ENABLED: bool = Field(default=True, description="启用指标收集")
    METRICS_PATH: str = Field(default="/metrics", description="指标路径")
    
    # 健康检查配置
    HEALTH_CHECK_ENABLED: bool = Field(default=True, description="启用健康检查")
    HEALTH_CHECK_PATH: str = Field(default="/health", description="健康检查路径")
    
    # ==================== 缓存配置 ====================
    
    # 缓存配置
    CACHE_ENABLED: bool = Field(default=True, description="启用缓存")
    CACHE_TTL: int = Field(default=3600, description="缓存TTL（秒）")
    CACHE_PREFIX: str = Field(default="zkagent:", description="缓存键前缀")
    
    # ==================== 邮件配置 ====================
    
    # SMTP配置
    SMTP_TLS: bool = Field(default=True, description="SMTP TLS")
    SMTP_PORT: Optional[int] = Field(default=None, description="SMTP端口")
    SMTP_HOST: Optional[str] = Field(default=None, description="SMTP主机")
    SMTP_USER: Optional[str] = Field(default=None, description="SMTP用户")
    SMTP_PASSWORD: Optional[str] = Field(default=None, description="SMTP密码")
    
    # 邮件配置
    EMAILS_FROM_EMAIL: Optional[EmailStr] = Field(default=None, description="发件人邮箱")
    EMAILS_FROM_NAME: Optional[str] = Field(default=None, description="发件人姓名")
    
    @validator("EMAILS_FROM_NAME")
    def get_project_name(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """获取项目名称作为默认发件人姓名"""
        if not v:
            return values["PROJECT_NAME"]
        return v
    
    # ==================== 开发配置 ====================
    
    # 开发模式配置
    RELOAD: bool = Field(default=False, description="热重载")
    AUTO_RELOAD: bool = Field(default=False, description="自动重载")
    
    # 测试配置
    TESTING: bool = Field(default=False, description="测试模式")
    TEST_DATABASE_URL: Optional[str] = Field(default=None, description="测试数据库URL")
    
    # ==================== 验证方法 ====================
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v: str) -> str:
        """验证环境配置"""
        allowed_envs = ["development", "staging", "production", "testing"]
        if v not in allowed_envs:
            raise ValueError(f"环境必须是以下之一: {allowed_envs}")
        return v
    
    @validator("LOG_LEVEL")
    def validate_log_level(cls, v: str) -> str:
        """验证日志级别"""
        allowed_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed_levels:
            raise ValueError(f"日志级别必须是以下之一: {allowed_levels}")
        return v.upper()
    
    # ==================== 属性方法 ====================
    
    @property
    def is_development(self) -> bool:
        """是否为开发环境"""
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        """是否为生产环境"""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_testing(self) -> bool:
        """是否为测试环境"""
        return self.ENVIRONMENT == "testing" or self.TESTING
    
    @property
    def database_url_sync(self) -> str:
        """同步数据库URL"""
        if self.DATABASE_URL:
            return str(self.DATABASE_URL).replace("+asyncpg", "")
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


@lru_cache()
def get_settings() -> Settings:
    """
    获取应用配置实例
    
    使用LRU缓存确保配置只被加载一次，提高性能。
    
    Returns:
        Settings: 配置实例
    """
    return Settings()


# 导出配置实例
settings = get_settings()