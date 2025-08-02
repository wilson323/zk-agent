#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent Redis缓存管理模块

本模块负责管理ZK-Agent后端服务的Redis缓存连接和操作，包括连接池管理、
缓存操作、分布式锁、发布订阅等功能。提供高性能的缓存服务和数据存储能力。

主要功能：
- Redis连接池管理
- 缓存CRUD操作
- 分布式锁实现
- 发布订阅机制
- 缓存统计和监控
- 序列化和反序列化
- 缓存策略管理

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

import asyncio
import json
import logging
import pickle
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, Union

import redis.asyncio as redis
from redis.asyncio import ConnectionPool, Redis
from redis.exceptions import ConnectionError, RedisError, TimeoutError

from app.core.config import settings

# 配置日志
logger = logging.getLogger(__name__)


class RedisManager:
    """
    Redis管理器
    
    负责管理Redis连接、缓存操作、分布式锁等功能。
    使用单例模式确保全局只有一个Redis管理器实例。
    """
    
    def __init__(self):
        """初始化Redis管理器"""
        self._pool: Optional[ConnectionPool] = None
        self._redis: Optional[Redis] = None
        self._is_initialized = False
        self._lock_prefix = f"{settings.CACHE_PREFIX}lock:"
        self._stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0,
        }
    
    async def initialize(self) -> None:
        """
        初始化Redis连接
        
        创建Redis连接池和客户端实例。
        """
        if self._is_initialized:
            logger.warning("Redis管理器已经初始化")
            return
        
        try:
            # 创建连接池
            self._pool = ConnectionPool.from_url(
                str(settings.REDIS_URL),
                max_connections=settings.REDIS_POOL_SIZE,
                socket_timeout=settings.REDIS_TIMEOUT,
                socket_connect_timeout=settings.REDIS_TIMEOUT,
                health_check_interval=30,
                retry_on_timeout=True,
                decode_responses=False,  # 保持二进制数据
            )
            
            # 创建Redis客户端
            self._redis = Redis(connection_pool=self._pool)
            
            # 测试连接
            await self._test_connection()
            
            self._is_initialized = True
            logger.info("Redis连接初始化成功")
            
        except Exception as e:
            logger.error(f"Redis连接初始化失败: {e}")
            raise
    
    async def close(self) -> None:
        """
        关闭Redis连接
        
        清理Redis连接池和相关资源。
        """
        if self._redis:
            await self._redis.close()
            logger.info("Redis连接已关闭")
        
        if self._pool:
            await self._pool.disconnect()
        
        self._redis = None
        self._pool = None
        self._is_initialized = False
    
    async def disconnect(self) -> None:
        """
        断开Redis连接（close方法的别名）
        
        为了保持与main.py中调用的一致性。
        """
        await self.close()
    
    @property
    def redis(self) -> Redis:
        """
        获取Redis客户端
        
        Returns:
            Redis: Redis客户端实例
            
        Raises:
            RuntimeError: 如果Redis未初始化
        """
        if not self._redis:
            raise RuntimeError("Redis未初始化，请先调用initialize()方法")
        return self._redis
    
    def _get_key(self, key: str) -> str:
        """
        获取带前缀的缓存键
        
        Args:
            key: 原始键名
            
        Returns:
            str: 带前缀的键名
        """
        return f"{settings.CACHE_PREFIX}{key}"
    
    def _serialize(self, value: Any) -> bytes:
        """
        序列化数据
        
        Args:
            value: 要序列化的数据
            
        Returns:
            bytes: 序列化后的数据
        """
        try:
            if isinstance(value, (str, int, float, bool)):
                return json.dumps(value).encode('utf-8')
            else:
                return pickle.dumps(value)
        except Exception as e:
            logger.error(f"数据序列化失败: {e}")
            raise
    
    def _deserialize(self, data: bytes) -> Any:
        """
        反序列化数据
        
        Args:
            data: 要反序列化的数据
            
        Returns:
            Any: 反序列化后的数据
        """
        try:
            # 尝试JSON反序列化
            try:
                return json.loads(data.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError):
                # 如果JSON失败，尝试pickle
                return pickle.loads(data)
        except Exception as e:
            logger.error(f"数据反序列化失败: {e}")
            raise
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        获取缓存值
        
        Args:
            key: 缓存键
            default: 默认值
            
        Returns:
            Any: 缓存值或默认值
        """
        try:
            cache_key = self._get_key(key)
            data = await self.redis.get(cache_key)
            
            if data is None:
                self._stats["misses"] += 1
                return default
            
            self._stats["hits"] += 1
            return self._deserialize(data)
            
        except Exception as e:
            logger.error(f"获取缓存失败 {key}: {e}")
            self._stats["errors"] += 1
            return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
        nx: bool = False,
        xx: bool = False
    ) -> bool:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒）
            nx: 仅当键不存在时设置
            xx: 仅当键存在时设置
            
        Returns:
            bool: 是否设置成功
        """
        try:
            cache_key = self._get_key(key)
            data = self._serialize(value)
            
            result = await self.redis.set(
                cache_key,
                data,
                ex=ttl or settings.CACHE_TTL,
                nx=nx,
                xx=xx
            )
            
            if result:
                self._stats["sets"] += 1
            
            return bool(result)
            
        except Exception as e:
            logger.error(f"设置缓存失败 {key}: {e}")
            self._stats["errors"] += 1
            return False
    
    async def delete(self, *keys: str) -> int:
        """
        删除缓存键
        
        Args:
            *keys: 要删除的键列表
            
        Returns:
            int: 删除的键数量
        """
        try:
            cache_keys = [self._get_key(key) for key in keys]
            result = await self.redis.delete(*cache_keys)
            self._stats["deletes"] += result
            return result
            
        except Exception as e:
            logger.error(f"删除缓存失败 {keys}: {e}")
            self._stats["errors"] += 1
            return 0
    
    async def exists(self, *keys: str) -> int:
        """
        检查键是否存在
        
        Args:
            *keys: 要检查的键列表
            
        Returns:
            int: 存在的键数量
        """
        try:
            cache_keys = [self._get_key(key) for key in keys]
            return await self.redis.exists(*cache_keys)
            
        except Exception as e:
            logger.error(f"检查键存在性失败 {keys}: {e}")
            self._stats["errors"] += 1
            return 0
    
    async def expire(self, key: str, ttl: int) -> bool:
        """
        设置键的过期时间
        
        Args:
            key: 缓存键
            ttl: 过期时间（秒）
            
        Returns:
            bool: 是否设置成功
        """
        try:
            cache_key = self._get_key(key)
            return await self.redis.expire(cache_key, ttl)
            
        except Exception as e:
            logger.error(f"设置过期时间失败 {key}: {e}")
            self._stats["errors"] += 1
            return False
    
    async def ttl(self, key: str) -> int:
        """
        获取键的剩余过期时间
        
        Args:
            key: 缓存键
            
        Returns:
            int: 剩余过期时间（秒），-1表示永不过期，-2表示键不存在
        """
        try:
            cache_key = self._get_key(key)
            return await self.redis.ttl(cache_key)
            
        except Exception as e:
            logger.error(f"获取过期时间失败 {key}: {e}")
            self._stats["errors"] += 1
            return -2
    
    async def keys(self, pattern: str = "*") -> List[str]:
        """
        获取匹配模式的键列表
        
        Args:
            pattern: 匹配模式
            
        Returns:
            List[str]: 键列表
        """
        try:
            cache_pattern = self._get_key(pattern)
            keys = await self.redis.keys(cache_pattern)
            # 移除前缀
            prefix_len = len(settings.CACHE_PREFIX)
            return [key.decode('utf-8')[prefix_len:] for key in keys]
            
        except Exception as e:
            logger.error(f"获取键列表失败 {pattern}: {e}")
            self._stats["errors"] += 1
            return []
    
    async def clear(self, pattern: str = "*") -> int:
        """
        清除匹配模式的所有键
        
        Args:
            pattern: 匹配模式
            
        Returns:
            int: 删除的键数量
        """
        try:
            cache_pattern = self._get_key(pattern)
            keys = await self.redis.keys(cache_pattern)
            
            if keys:
                result = await self.redis.delete(*keys)
                self._stats["deletes"] += result
                return result
            
            return 0
            
        except Exception as e:
            logger.error(f"清除缓存失败 {pattern}: {e}")
            self._stats["errors"] += 1
            return 0
    
    @asynccontextmanager
    async def lock(
        self,
        name: str,
        timeout: float = 10.0,
        blocking_timeout: Optional[float] = None
    ):
        """
        分布式锁上下文管理器
        
        Args:
            name: 锁名称
            timeout: 锁超时时间
            blocking_timeout: 阻塞超时时间
            
        Yields:
            bool: 是否获取到锁
        """
        lock_key = f"{self._lock_prefix}{name}"
        lock = self.redis.lock(
            lock_key,
            timeout=timeout,
            blocking_timeout=blocking_timeout
        )
        
        try:
            acquired = await lock.acquire()
            yield acquired
        finally:
            if acquired:
                try:
                    await lock.release()
                except Exception as e:
                    logger.error(f"释放锁失败 {name}: {e}")
    
    async def publish(self, channel: str, message: Any) -> int:
        """
        发布消息到频道
        
        Args:
            channel: 频道名称
            message: 消息内容
            
        Returns:
            int: 接收消息的订阅者数量
        """
        try:
            data = self._serialize(message)
            return await self.redis.publish(channel, data)
            
        except Exception as e:
            logger.error(f"发布消息失败 {channel}: {e}")
            self._stats["errors"] += 1
            return 0
    
    async def subscribe(self, *channels: str):
        """
        订阅频道
        
        Args:
            *channels: 频道名称列表
            
        Returns:
            PubSub: 发布订阅对象
        """
        try:
            pubsub = self.redis.pubsub()
            await pubsub.subscribe(*channels)
            return pubsub
            
        except Exception as e:
            logger.error(f"订阅频道失败 {channels}: {e}")
            self._stats["errors"] += 1
            raise
    
    async def health_check(self) -> bool:
        """
        Redis健康检查
        
        Returns:
            bool: Redis是否健康
        """
        try:
            await self.redis.ping()
            return True
        except Exception as e:
            logger.error(f"Redis健康检查失败: {e}")
            return False
    
    async def get_info(self) -> Dict[str, Any]:
        """
        获取Redis信息
        
        Returns:
            Dict[str, Any]: Redis信息
        """
        try:
            info = await self.redis.info()
            return {
                "version": info.get("redis_version"),
                "mode": info.get("redis_mode"),
                "connected_clients": info.get("connected_clients"),
                "used_memory": info.get("used_memory"),
                "used_memory_human": info.get("used_memory_human"),
                "keyspace": {k: v for k, v in info.items() if k.startswith("db")},
            }
        except Exception as e:
            logger.error(f"获取Redis信息失败: {e}")
            return {}
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取缓存统计信息
        
        Returns:
            Dict[str, Any]: 统计信息
        """
        total_requests = self._stats["hits"] + self._stats["misses"]
        hit_rate = (self._stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self._stats,
            "total_requests": total_requests,
            "hit_rate": round(hit_rate, 2),
        }
    
    def reset_stats(self) -> None:
        """
        重置统计信息
        """
        self._stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "errors": 0,
        }
    
    async def _test_connection(self) -> None:
        """
        测试Redis连接
        
        Raises:
            Exception: 如果连接测试失败
        """
        try:
            await self.redis.ping()
            info = await self.redis.info()
            version = info.get("redis_version", "unknown")
            logger.info(f"Redis连接测试成功，版本: {version}")
        except Exception as e:
            logger.error(f"Redis连接测试失败: {e}")
            raise


# 全局Redis管理器实例
redis_manager = RedisManager()


async def get_redis() -> Redis:
    """
    FastAPI依赖注入函数
    
    用于在API端点中注入Redis客户端。
    
    Returns:
        Redis: Redis客户端
    """
    return redis_manager.redis


async def init_redis() -> None:
    """
    初始化Redis连接
    
    在应用启动时调用。
    """
    await redis_manager.initialize()


async def close_redis() -> None:
    """
    关闭Redis连接
    
    在应用关闭时调用。
    """
    await redis_manager.close()


# Redis健康检查函数
async def check_redis_health() -> dict:
    """
    检查Redis健康状态
    
    Returns:
        dict: Redis健康状态信息
    """
    try:
        is_healthy = await redis_manager.health_check()
        info = await redis_manager.get_info() if is_healthy else {}
        stats = redis_manager.get_stats()
        
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "redis": "connected" if is_healthy else "disconnected",
            "info": info,
            "stats": stats,
            "timestamp": asyncio.get_event_loop().time(),
        }
    except Exception as e:
        logger.error(f"Redis健康检查异常: {e}")
        return {
            "status": "error",
            "redis": "error",
            "error": str(e),
            "timestamp": asyncio.get_event_loop().time(),
        }