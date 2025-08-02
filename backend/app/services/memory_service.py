#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent记忆管理服务

本模块实现了ZK-Agent系统的记忆管理服务，支持跨任务工作流记忆、
相关知识管理、工作步骤历史记忆等核心功能。

核心功能：
- 跨任务工作流记忆管理
- 相关知识存储和检索
- 工作步骤历史记录
- 记忆向量化和相似性搜索
- 记忆生命周期管理
- 记忆共享和协作

记忆类型：
- 短期记忆：当前会话和任务相关
- 长期记忆：跨会话持久化存储
- 工作记忆：任务执行过程中的临时存储
- 知识记忆：结构化知识和经验

设计模式：
- 策略模式：不同类型记忆的存储策略
- 观察者模式：记忆变化通知
- 装饰器模式：记忆增强功能
- 工厂模式：记忆对象创建

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import json
import uuid
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_, func, text
from sqlalchemy.orm import selectinload
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss

from app.services.base import (
    BaseService, ServiceContext, ServiceResult, ServiceError,
    BusinessError, ValidationError, ResourceError, service_method
)
from app.models.agent import AgentMemory
from app.core.database import get_db
from app.core.redis import RedisManager
from app.core.config import get_settings


class MemoryType(Enum):
    """记忆类型枚举"""
    SHORT_TERM = "short_term"  # 短期记忆
    LONG_TERM = "long_term"    # 长期记忆
    WORKING = "working"        # 工作记忆
    KNOWLEDGE = "knowledge"    # 知识记忆
    EPISODIC = "episodic"      # 情节记忆
    SEMANTIC = "semantic"      # 语义记忆


class MemoryScope(Enum):
    """记忆范围枚举"""
    PERSONAL = "personal"      # 个人记忆
    SHARED = "shared"          # 共享记忆
    GLOBAL = "global"          # 全局记忆
    TEAM = "team"              # 团队记忆


class MemoryOperation(Enum):
    """记忆操作类型"""
    STORE = "store"
    RETRIEVE = "retrieve"
    UPDATE = "update"
    DELETE = "delete"
    SEARCH = "search"
    CONSOLIDATE = "consolidate"
    FORGET = "forget"


@dataclass
class MemoryItem:
    """记忆项数据结构"""
    id: str
    content: str
    memory_type: MemoryType
    scope: MemoryScope
    agent_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    task_id: Optional[str] = None
    workflow_id: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None
    importance: float = 0.5  # 重要性评分 0-1
    access_count: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None


@dataclass
class MemoryRequest:
    """记忆请求数据"""
    operation: MemoryOperation
    memory_id: Optional[str] = None
    content: Optional[str] = None
    memory_type: Optional[MemoryType] = None
    scope: Optional[MemoryScope] = None
    agent_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    task_id: Optional[str] = None
    workflow_id: Optional[str] = None
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    limit: int = 10
    similarity_threshold: float = 0.7
    time_range: Optional[Tuple[datetime, datetime]] = None


@dataclass
class MemoryResponse:
    """记忆响应数据"""
    success: bool
    memory_items: List[MemoryItem] = field(default_factory=list)
    total_count: int = 0
    similarity_scores: List[float] = field(default_factory=list)
    message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class VectorStore:
    """向量存储管理器"""
    
    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.index = faiss.IndexFlatIP(dimension)  # 内积相似度
        self.id_to_memory: Dict[int, str] = {}  # FAISS索引到记忆ID的映射
        self.memory_to_id: Dict[str, int] = {}  # 记忆ID到FAISS索引的映射
        self.next_id = 0
    
    def add_vector(self, memory_id: str, vector: np.ndarray) -> None:
        """添加向量"""
        if memory_id in self.memory_to_id:
            return  # 已存在
        
        # 归一化向量
        vector = vector / np.linalg.norm(vector)
        vector = vector.reshape(1, -1).astype(np.float32)
        
        self.index.add(vector)
        self.id_to_memory[self.next_id] = memory_id
        self.memory_to_id[memory_id] = self.next_id
        self.next_id += 1
    
    def search_similar(self, query_vector: np.ndarray, k: int = 10, 
                      threshold: float = 0.7) -> List[Tuple[str, float]]:
        """搜索相似向量"""
        if self.index.ntotal == 0:
            return []
        
        # 归一化查询向量
        query_vector = query_vector / np.linalg.norm(query_vector)
        query_vector = query_vector.reshape(1, -1).astype(np.float32)
        
        # 搜索
        scores, indices = self.index.search(query_vector, min(k, self.index.ntotal))
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if score >= threshold and idx in self.id_to_memory:
                memory_id = self.id_to_memory[idx]
                results.append((memory_id, float(score)))
        
        return results
    
    def remove_vector(self, memory_id: str) -> bool:
        """移除向量（FAISS不支持直接删除，这里只是标记）"""
        if memory_id in self.memory_to_id:
            faiss_id = self.memory_to_id[memory_id]
            del self.memory_to_id[memory_id]
            del self.id_to_memory[faiss_id]
            return True
        return False


class MemoryService(BaseService[MemoryRequest, MemoryResponse]):
    """记忆管理服务"""
    
    def __init__(self, db_session: AsyncSession, redis_manager: RedisManager):
        super().__init__("memory_service", "1.0.0")
        self.db = db_session
        self.redis = redis_manager
        self.settings = get_settings()
        
        # 初始化向量模型和存储
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')  # 轻量级模型
        self.vector_store = VectorStore(dimension=384)
        
        # 记忆缓存
        self._memory_cache: Dict[str, MemoryItem] = {}
        self._session_memories: Dict[str, List[str]] = {}  # 会话记忆索引
        
        # 记忆生命周期配置
        self.memory_ttl = {
            MemoryType.SHORT_TERM: timedelta(hours=1),
            MemoryType.WORKING: timedelta(minutes=30),
            MemoryType.LONG_TERM: timedelta(days=365),
            MemoryType.KNOWLEDGE: None,  # 永久
            MemoryType.EPISODIC: timedelta(days=30),
            MemoryType.SEMANTIC: timedelta(days=90)
        }
    
    async def _execute_core(self, request: MemoryRequest, context: ServiceContext) -> ServiceResult[MemoryResponse]:
        """核心执行逻辑"""
        try:
            if request.operation == MemoryOperation.STORE:
                return await self._store_memory(request, context)
            elif request.operation == MemoryOperation.RETRIEVE:
                return await self._retrieve_memory(request, context)
            elif request.operation == MemoryOperation.UPDATE:
                return await self._update_memory(request, context)
            elif request.operation == MemoryOperation.DELETE:
                return await self._delete_memory(request, context)
            elif request.operation == MemoryOperation.SEARCH:
                return await self._search_memory(request, context)
            elif request.operation == MemoryOperation.CONSOLIDATE:
                return await self._consolidate_memory(request, context)
            elif request.operation == MemoryOperation.FORGET:
                return await self._forget_memory(request, context)
            else:
                raise ValidationError(f"Unsupported operation: {request.operation}")
                
        except Exception as e:
            self._logger.error(f"Memory service error: {e}")
            raise BusinessError(f"Memory operation failed: {str(e)}")
    
    @service_method(timeout=10.0, retries=2)
    async def _store_memory(self, request: MemoryRequest, context: ServiceContext) -> ServiceResult[MemoryResponse]:
        """存储记忆"""
        if not request.content or not request.memory_type:
            raise ValidationError("Content and memory_type are required")
        
        # 创建记忆项
        memory_id = str(uuid.uuid4())
        
        # 生成内容嵌入向量
        embedding = self.encoder.encode(request.content).tolist()
        
        # 计算重要性评分
        importance = self._calculate_importance(request.content, request.metadata or {})
        
        # 设置过期时间
        expires_at = None
        if request.memory_type in self.memory_ttl and self.memory_ttl[request.memory_type]:
            expires_at = datetime.utcnow() + self.memory_ttl[request.memory_type]
        
        memory_item = MemoryItem(
            id=memory_id,
            content=request.content,
            memory_type=request.memory_type,
            scope=request.scope or MemoryScope.PERSONAL,
            agent_id=request.agent_id,
            user_id=request.user_id,
            session_id=request.session_id,
            task_id=request.task_id,
            workflow_id=request.workflow_id,
            tags=request.tags or [],
            metadata=request.metadata or {},
            embedding=embedding,
            importance=importance,
            expires_at=expires_at
        )
        
        # 存储到数据库
        db_memory = AgentMemory(
            id=memory_id,
            agent_id=request.agent_id,
            memory_type=request.memory_type.value,
            content=request.content,
            metadata={
                "scope": request.scope.value if request.scope else MemoryScope.PERSONAL.value,
                "user_id": request.user_id,
                "session_id": request.session_id,
                "task_id": request.task_id,
                "workflow_id": request.workflow_id,
                "tags": request.tags or [],
                "importance": importance,
                "embedding": embedding,
                **(request.metadata or {})
            },
            importance=importance,
            expires_at=expires_at
        )
        
        self.db.add(db_memory)
        await self.db.commit()
        
        # 添加到向量存储
        self.vector_store.add_vector(memory_id, np.array(embedding))
        
        # 缓存记忆
        self._memory_cache[memory_id] = memory_item
        
        # 更新会话记忆索引
        if request.session_id:
            if request.session_id not in self._session_memories:
                self._session_memories[request.session_id] = []
            self._session_memories[request.session_id].append(memory_id)
        
        # 缓存到Redis
        await self.redis.set(
            f"memory:{memory_id}",
            json.dumps({
                "content": request.content,
                "type": request.memory_type.value,
                "importance": importance,
                "created_at": memory_item.created_at.isoformat()
            }),
            ex=3600  # 1小时过期
        )
        
        response = MemoryResponse(
            success=True,
            memory_items=[memory_item],
            total_count=1,
            message="Memory stored successfully"
        )
        
        return ServiceResult.success_result(response)
    
    @service_method(timeout=5.0, retries=1)
    async def _search_memory(self, request: MemoryRequest, context: ServiceContext) -> ServiceResult[MemoryResponse]:
        """搜索记忆"""
        if not request.query:
            raise ValidationError("Query is required for search")
        
        # 生成查询向量
        query_embedding = self.encoder.encode(request.query)
        
        # 向量相似性搜索
        similar_results = self.vector_store.search_similar(
            query_embedding,
            k=request.limit * 2,  # 获取更多候选
            threshold=request.similarity_threshold
        )
        
        if not similar_results:
            return ServiceResult.success_result(MemoryResponse(
                success=True,
                memory_items=[],
                total_count=0,
                message="No similar memories found"
            ))
        
        # 获取记忆详情
        memory_ids = [result[0] for result in similar_results]
        similarity_scores = [result[1] for result in similar_results]
        
        # 从数据库获取记忆
        stmt = select(AgentMemory).where(AgentMemory.id.in_(memory_ids))
        
        # 添加过滤条件
        if request.agent_id:
            stmt = stmt.where(AgentMemory.agent_id == request.agent_id)
        if request.memory_type:
            stmt = stmt.where(AgentMemory.memory_type == request.memory_type.value)
        if request.time_range:
            start_time, end_time = request.time_range
            stmt = stmt.where(and_(
                AgentMemory.created_at >= start_time,
                AgentMemory.created_at <= end_time
            ))
        
        result = await self.db.execute(stmt)
        db_memories = result.scalars().all()
        
        # 转换为MemoryItem
        memory_items = []
        filtered_scores = []
        
        for db_memory in db_memories:
            # 找到对应的相似度分数
            try:
                idx = memory_ids.index(db_memory.id)
                score = similarity_scores[idx]
            except ValueError:
                continue
            
            memory_item = self._db_memory_to_item(db_memory)
            memory_items.append(memory_item)
            filtered_scores.append(score)
        
        # 按相似度排序
        sorted_pairs = sorted(zip(memory_items, filtered_scores), 
                            key=lambda x: x[1], reverse=True)
        
        final_memories = [pair[0] for pair in sorted_pairs[:request.limit]]
        final_scores = [pair[1] for pair in sorted_pairs[:request.limit]]
        
        # 更新访问计数
        for memory in final_memories:
            memory.access_count += 1
            await self.redis.incr(f"memory:{memory.id}:access_count")
        
        response = MemoryResponse(
            success=True,
            memory_items=final_memories,
            total_count=len(final_memories),
            similarity_scores=final_scores,
            message=f"Found {len(final_memories)} similar memories"
        )
        
        return ServiceResult.success_result(response)
    
    @service_method(timeout=15.0, retries=1)
    async def _consolidate_memory(self, request: MemoryRequest, context: ServiceContext) -> ServiceResult[MemoryResponse]:
        """记忆整合"""
        # 获取需要整合的记忆
        stmt = select(AgentMemory)
        
        if request.agent_id:
            stmt = stmt.where(AgentMemory.agent_id == request.agent_id)
        if request.session_id:
            stmt = stmt.where(AgentMemory.metadata['session_id'].astext == request.session_id)
        if request.memory_type:
            stmt = stmt.where(AgentMemory.memory_type == request.memory_type.value)
        
        # 只整合短期记忆和工作记忆
        stmt = stmt.where(AgentMemory.memory_type.in_([
            MemoryType.SHORT_TERM.value,
            MemoryType.WORKING.value
        ]))
        
        result = await self.db.execute(stmt)
        memories = result.scalars().all()
        
        if len(memories) < 2:
            return ServiceResult.success_result(MemoryResponse(
                success=True,
                memory_items=[],
                total_count=0,
                message="Not enough memories to consolidate"
            ))
        
        # 按重要性和时间分组
        important_memories = [m for m in memories if m.importance > 0.7]
        
        if not important_memories:
            return ServiceResult.success_result(MemoryResponse(
                success=True,
                memory_items=[],
                total_count=0,
                message="No important memories to consolidate"
            ))
        
        # 合并相似内容
        consolidated_content = self._merge_memory_contents([m.content for m in important_memories])
        
        # 创建长期记忆
        consolidated_memory = MemoryItem(
            id=str(uuid.uuid4()),
            content=consolidated_content,
            memory_type=MemoryType.LONG_TERM,
            scope=MemoryScope.PERSONAL,
            agent_id=request.agent_id,
            user_id=request.user_id,
            session_id=request.session_id,
            tags=list(set(sum([m.metadata.get('tags', []) for m in important_memories], []))),
            metadata={
                "consolidated_from": [m.id for m in important_memories],
                "consolidation_time": datetime.utcnow().isoformat()
            },
            importance=max(m.importance for m in important_memories)
        )
        
        # 存储整合后的记忆
        store_request = MemoryRequest(
            operation=MemoryOperation.STORE,
            content=consolidated_content,
            memory_type=MemoryType.LONG_TERM,
            scope=MemoryScope.PERSONAL,
            agent_id=request.agent_id,
            user_id=request.user_id,
            session_id=request.session_id,
            metadata=consolidated_memory.metadata
        )
        
        store_result = await self._store_memory(store_request, context)
        
        # 删除原始记忆
        for memory in important_memories:
            await self.db.delete(memory)
        
        await self.db.commit()
        
        response = MemoryResponse(
            success=True,
            memory_items=[consolidated_memory],
            total_count=1,
            message=f"Consolidated {len(important_memories)} memories into long-term memory"
        )
        
        return ServiceResult.success_result(response)
    
    def _calculate_importance(self, content: str, metadata: Dict[str, Any]) -> float:
        """计算记忆重要性"""
        importance = 0.5  # 基础重要性
        
        # 基于内容长度
        if len(content) > 100:
            importance += 0.1
        if len(content) > 500:
            importance += 0.1
        
        # 基于关键词
        important_keywords = ['error', 'success', 'result', 'conclusion', 'important', 'critical']
        for keyword in important_keywords:
            if keyword.lower() in content.lower():
                importance += 0.05
        
        # 基于元数据
        if metadata.get('priority') == 'high':
            importance += 0.2
        if metadata.get('user_marked_important'):
            importance += 0.3
        
        return min(importance, 1.0)
    
    def _merge_memory_contents(self, contents: List[str]) -> str:
        """合并记忆内容"""
        # 简单的内容合并策略
        unique_contents = list(set(contents))
        
        if len(unique_contents) == 1:
            return unique_contents[0]
        
        # 按长度排序，保留最详细的内容
        sorted_contents = sorted(unique_contents, key=len, reverse=True)
        
        # 合并前3个最长的内容
        merged = "\n\n".join(sorted_contents[:3])
        
        return f"Consolidated memory:\n{merged}"
    
    def _db_memory_to_item(self, db_memory: AgentMemory) -> MemoryItem:
        """将数据库记忆转换为MemoryItem"""
        metadata = db_memory.metadata or {}
        
        return MemoryItem(
            id=db_memory.id,
            content=db_memory.content,
            memory_type=MemoryType(db_memory.memory_type),
            scope=MemoryScope(metadata.get('scope', MemoryScope.PERSONAL.value)),
            agent_id=db_memory.agent_id,
            user_id=metadata.get('user_id'),
            session_id=metadata.get('session_id'),
            task_id=metadata.get('task_id'),
            workflow_id=metadata.get('workflow_id'),
            tags=metadata.get('tags', []),
            metadata=metadata,
            embedding=metadata.get('embedding'),
            importance=db_memory.importance,
            created_at=db_memory.created_at,
            updated_at=db_memory.updated_at,
            expires_at=db_memory.expires_at
        )
    
    async def validate(self, request: MemoryRequest, context: Optional[ServiceContext] = None) -> bool:
        """验证请求"""
        if not isinstance(request, MemoryRequest):
            return False
        
        if not request.operation:
            return False
        
        # 根据操作类型验证必要字段
        if request.operation == MemoryOperation.STORE:
            return all([request.content, request.memory_type])
        elif request.operation == MemoryOperation.SEARCH:
            return request.query is not None
        elif request.operation in [MemoryOperation.RETRIEVE, MemoryOperation.UPDATE, MemoryOperation.DELETE]:
            return request.memory_id is not None
        
        return True
    
    async def get_session_memories(self, session_id: str, memory_type: Optional[MemoryType] = None) -> List[MemoryItem]:
        """获取会话记忆"""
        stmt = select(AgentMemory).where(
            AgentMemory.metadata['session_id'].astext == session_id
        )
        
        if memory_type:
            stmt = stmt.where(AgentMemory.memory_type == memory_type.value)
        
        stmt = stmt.order_by(AgentMemory.created_at.desc())
        
        result = await self.db.execute(stmt)
        memories = result.scalars().all()
        
        return [self._db_memory_to_item(memory) for memory in memories]
    
    async def cleanup_expired_memories(self) -> int:
        """清理过期记忆"""
        now = datetime.utcnow()
        
        stmt = delete(AgentMemory).where(
            and_(
                AgentMemory.expires_at.isnot(None),
                AgentMemory.expires_at < now
            )
        )
        
        result = await self.db.execute(stmt)
        await self.db.commit()
        
        return result.rowcount
    
    async def health_check(self) -> bool:
        """健康检查"""
        try:
            # 检查数据库连接
            await self.db.execute(select(1))
            
            # 检查Redis连接
            await self.redis.ping()
            
            # 检查向量存储
            test_vector = np.random.rand(384).astype(np.float32)
            self.vector_store.search_similar(test_vector, k=1)
            
            return True
        except Exception as e:
            self._logger.error(f"Health check failed: {e}")
            return False