#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent数据库连接管理模块

本模块负责管理ZK-Agent后端服务的数据库连接，包括异步数据库连接池、
会话管理、事务处理等。使用SQLAlchemy 2.0的异步特性提供高性能的
数据库操作能力。

主要功能：
- 异步数据库连接池管理
- 数据库会话生命周期管理
- 事务处理和回滚机制
- 数据库健康检查
- 连接池监控
- 数据库迁移支持

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy import event, pool, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import QueuePool

from app.core.config import settings

# 配置日志
logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """
    SQLAlchemy声明式基类
    
    所有数据库模型都应该继承此基类。提供了通用的表结构和方法。
    """
    pass


class DatabaseManager:
    """
    数据库管理器
    
    负责管理数据库连接、会话创建、事务处理等核心功能。
    使用单例模式确保全局只有一个数据库管理器实例。
    """
    
    def __init__(self):
        """初始化数据库管理器"""
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker[AsyncSession]] = None
        self._is_initialized = False
    
    async def initialize(self) -> None:
        """
        初始化数据库连接
        
        创建异步数据库引擎和会话工厂，配置连接池参数。
        """
        if self._is_initialized:
            logger.warning("数据库管理器已经初始化")
            return
        
        try:
            # 根据数据库类型配置不同的连接参数
            database_url = str(settings.DATABASE_URL)
            is_sqlite = database_url.startswith("sqlite")
            
            if is_sqlite:
                # SQLite配置
                self._engine = create_async_engine(
                    database_url,
                    echo=settings.DEBUG,
                    future=True,
                    connect_args={"check_same_thread": False}
                )
            else:
                # PostgreSQL配置
                self._engine = create_async_engine(
                    database_url,
                    # 连接池配置
                    poolclass=QueuePool,
                    pool_size=settings.DB_POOL_SIZE,
                    max_overflow=settings.DB_MAX_OVERFLOW,
                    pool_timeout=settings.DB_POOL_TIMEOUT,
                    pool_recycle=settings.DB_POOL_RECYCLE,
                    pool_pre_ping=True,  # 连接前检查
                    # 引擎配置
                    echo=settings.DEBUG,  # 开发环境下打印SQL
                    echo_pool=settings.DEBUG,  # 开发环境下打印连接池信息
                    future=True,
                    # 连接参数
                     connect_args={
                         "server_settings": {
                             "application_name": settings.PROJECT_NAME,
                             "jit": "off",  # 关闭JIT以提高连接速度
                         },
                         "command_timeout": 60,
                     }
                 )
            
            # 创建会话工厂
            self._session_factory = async_sessionmaker(
                bind=self._engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False,
            )
            
            # 注册事件监听器
            self._register_event_listeners()
            
            # 测试数据库连接
            await self._test_connection()
            
            self._is_initialized = True
            logger.info("数据库连接初始化成功")
            
        except Exception as e:
            logger.error(f"数据库连接初始化失败: {e}")
            raise
    
    async def connect(self) -> None:
        """
        连接数据库（initialize方法的别名）
        
        为了保持与main.py中调用的一致性。
        """
        await self.initialize()
    
    async def close(self) -> None:
        """
        关闭数据库连接
        
        清理数据库连接池和相关资源。
        """
        if self._engine:
            await self._engine.dispose()
            logger.info("数据库连接已关闭")
        
        self._engine = None
        self._session_factory = None
        self._is_initialized = False
    
    async def disconnect(self) -> None:
        """
        断开数据库连接（close方法的别名）
        
        为了保持与main.py中调用的一致性。
        """
        await self.close()
    
    @property
    def engine(self) -> AsyncEngine:
        """
        获取数据库引擎
        
        Returns:
            AsyncEngine: 异步数据库引擎
            
        Raises:
            RuntimeError: 如果数据库未初始化
        """
        if not self._engine:
            raise RuntimeError("数据库未初始化，请先调用initialize()方法")
        return self._engine
    
    @property
    def session_factory(self) -> async_sessionmaker[AsyncSession]:
        """
        获取会话工厂
        
        Returns:
            async_sessionmaker: 异步会话工厂
            
        Raises:
            RuntimeError: 如果数据库未初始化
        """
        if not self._session_factory:
            raise RuntimeError("数据库未初始化，请先调用initialize()方法")
        return self._session_factory
    
    async def get_session(self) -> AsyncSession:
        """
        获取数据库会话
        
        Returns:
            AsyncSession: 异步数据库会话
        """
        return self.session_factory()
    
    @asynccontextmanager
    async def session_scope(self) -> AsyncGenerator[AsyncSession, None]:
        """
        数据库会话上下文管理器
        
        自动管理会话的生命周期，包括提交和回滚。
        
        Yields:
            AsyncSession: 数据库会话
        """
        session = await self.get_session()
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
    
    @asynccontextmanager
    async def transaction_scope(self) -> AsyncGenerator[AsyncSession, None]:
        """
        事务上下文管理器
        
        提供事务级别的数据库操作，确保数据一致性。
        
        Yields:
            AsyncSession: 数据库会话
        """
        async with self.session_scope() as session:
            async with session.begin():
                yield session
    
    async def health_check(self) -> bool:
        """
        数据库健康检查
        
        检查数据库连接是否正常。
        
        Returns:
            bool: 数据库是否健康
        """
        try:
            async with self.session_scope() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception as e:
            logger.error(f"数据库健康检查失败: {e}")
            return False
    
    async def get_pool_status(self) -> dict:
        """
        获取连接池状态
        
        Returns:
            dict: 连接池状态信息
        """
        if not self._engine:
            return {"status": "未初始化"}
        
        pool = self._engine.pool
        return {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid(),
        }
    
    def _register_event_listeners(self) -> None:
        """
        注册数据库事件监听器
        
        监听连接事件，用于日志记录和性能监控。
        """
        if not self._engine:
            return
        
        @event.listens_for(self._engine.sync_engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            """连接建立时的回调"""
            logger.debug("数据库连接已建立")
        
        @event.listens_for(self._engine.sync_engine, "checkout")
        def on_checkout(dbapi_connection, connection_record, connection_proxy):
            """连接检出时的回调"""
            logger.debug("数据库连接已检出")
        
        @event.listens_for(self._engine.sync_engine, "checkin")
        def on_checkin(dbapi_connection, connection_record):
            """连接检入时的回调"""
            logger.debug("数据库连接已检入")
        
        @event.listens_for(self._engine.sync_engine, "close")
        def on_close(dbapi_connection, connection_record):
            """连接关闭时的回调"""
            logger.debug("数据库连接已关闭")
    
    async def _test_connection(self) -> None:
        """
        测试数据库连接
        
        在初始化时测试数据库连接是否正常。
        
        Raises:
            Exception: 如果连接测试失败
        """
        try:
            async with self.session_scope() as session:
                # 根据数据库类型使用不同的版本查询
                if "sqlite" in settings.DATABASE_URL.lower():
                    result = await session.execute(text("SELECT sqlite_version()"))
                    version = result.scalar()
                    logger.info(f"SQLite数据库连接测试成功，版本: {version}")
                else:
                    result = await session.execute(text("SELECT version()"))
                    version = result.scalar()
                    logger.info(f"PostgreSQL数据库连接测试成功，版本: {version}")
        except Exception as e:
            logger.error(f"数据库连接测试失败: {e}")
            raise


# 全局数据库管理器实例
# 创建全局数据库管理器实例
database_manager = DatabaseManager()

# 为了向后兼容，保留db_manager别名
db_manager = database_manager


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI依赖注入函数
    
    用于在API端点中注入数据库会话。
    
    Yields:
        AsyncSession: 数据库会话
    """
    async with db_manager.session_scope() as session:
        yield session


async def get_db_transaction() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI依赖注入函数（事务版本）
    
    用于在API端点中注入事务级别的数据库会话。
    
    Yields:
        AsyncSession: 数据库会话（事务模式）
    """
    async with db_manager.transaction_scope() as session:
        yield session


async def init_db() -> None:
    """
    初始化数据库
    
    在应用启动时调用，初始化数据库连接。
    """
    await db_manager.initialize()


async def close_db() -> None:
    """
    关闭数据库连接
    
    在应用关闭时调用，清理数据库资源。
    """
    await db_manager.close()


async def create_tables() -> None:
    """
    创建数据库表
    
    根据模型定义创建数据库表结构。
    注意：生产环境建议使用Alembic进行数据库迁移。
    """
    async with db_manager.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("数据库表创建完成")


async def drop_tables() -> None:
    """
    删除数据库表
    
    删除所有数据库表。谨慎使用！
    """
    async with db_manager.engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("数据库表已删除")


# 数据库健康检查函数
async def check_database_health() -> dict:
    """
    检查数据库健康状态
    
    Returns:
        dict: 数据库健康状态信息
    """
    try:
        is_healthy = await db_manager.health_check()
        pool_status = await db_manager.get_pool_status()
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "database": "connected" if is_healthy else "disconnected",
            "pool": pool_status,
            "timestamp": asyncio.get_event_loop().time(),
        }
    except Exception as e:
        logger.error(f"数据库健康检查异常: {e}")
        return {
            "status": "error",
            "database": "error",
            "error": str(e),
            "timestamp": asyncio.get_event_loop().time(),
        }