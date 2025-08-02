#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent智能体服务

本模块实现了ZK-Agent系统的智能体管理服务，支持多智能体协作、
智能体生命周期管理、配置管理、执行监控等核心功能。

核心功能：
- 智能体创建、配置、启动、停止
- 多智能体协作和通信
- 智能体状态监控和管理
- 智能体工具和能力管理
- 智能体执行历史和分析

设计模式：
- 工厂模式：智能体创建
- 策略模式：不同类型智能体的处理策略
- 观察者模式：智能体状态变化通知
- 命令模式：智能体操作封装

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.orm import selectinload

from app.services.base import (
    BaseService, ServiceContext, ServiceResult, ServiceError,
    BusinessError, ValidationError, ResourceError, service_method
)
from app.models.agent import (
    Agent, AgentConfig, AgentExecution, AgentTool, AgentWorkflow,
    AgentMemory, AgentCollaboration, AgentType, AgentStatus, ExecutionStatus
)
from app.models.user import User
from app.core.database import get_db
from app.core.redis import RedisManager
from app.core.config import get_settings


class AgentOperationType(Enum):
    """智能体操作类型"""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    START = "start"
    STOP = "stop"
    PAUSE = "pause"
    RESUME = "resume"
    EXECUTE = "execute"
    COLLABORATE = "collaborate"


@dataclass
class AgentRequest:
    """智能体请求数据"""
    operation: AgentOperationType
    agent_id: Optional[str] = None
    user_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    agent_type: Optional[AgentType] = None
    config: Optional[Dict[str, Any]] = None
    tools: Optional[List[str]] = None
    collaborators: Optional[List[str]] = None
    task_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AgentResponse:
    """智能体响应数据"""
    agent_id: str
    status: AgentStatus
    result: Optional[Dict[str, Any]] = None
    execution_id: Optional[str] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AgentFactory:
    """智能体工厂类"""
    
    @staticmethod
    def create_agent_config(agent_type: AgentType, config: Dict[str, Any]) -> Dict[str, Any]:
        """创建智能体配置"""
        base_config = {
            "max_iterations": 10,
            "timeout": 300,
            "memory_enabled": True,
            "collaboration_enabled": True,
            "auto_retry": True,
            "max_retries": 3,
            "log_level": "INFO"
        }
        
        # 根据智能体类型设置特定配置
        type_specific_config = {
            AgentType.SEARCH: {
                "search_engines": ["google", "bing"],
                "max_results": 10,
                "result_format": "structured"
            },
            AgentType.BROWSE: {
                "browser_type": "chromium",
                "headless": True,
                "timeout": 30,
                "max_pages": 5
            },
            AgentType.PARSE: {
                "supported_formats": ["html", "pdf", "docx", "txt"],
                "extraction_mode": "intelligent",
                "preserve_structure": True
            },
            AgentType.REPORT: {
                "output_formats": ["markdown", "html", "pdf"],
                "template_engine": "jinja2",
                "include_charts": True
            },
            AgentType.MAIN: {
                "orchestration_mode": "sequential",
                "sub_agent_timeout": 600,
                "result_aggregation": "smart_merge"
            },
            AgentType.CUSTOM: {
                "plugin_system": True,
                "custom_tools": True,
                "external_apis": True
            }
        }
        
        # 合并配置
        final_config = {**base_config, **type_specific_config.get(agent_type, {}), **config}
        return final_config
    
    @staticmethod
    def validate_agent_config(agent_type: AgentType, config: Dict[str, Any]) -> bool:
        """验证智能体配置"""
        required_fields = {
            AgentType.SEARCH: ["search_engines"],
            AgentType.BROWSE: ["browser_type"],
            AgentType.PARSE: ["supported_formats"],
            AgentType.REPORT: ["output_formats"],
            AgentType.MAIN: ["orchestration_mode"],
            AgentType.CUSTOM: []
        }
        
        required = required_fields.get(agent_type, [])
        return all(field in config for field in required)


class AgentService(BaseService[AgentRequest, AgentResponse]):
    """智能体管理服务"""
    
    def __init__(self, db_session: AsyncSession, redis_manager: RedisManager):
        super().__init__("agent_service", "1.0.0")
        self.db = db_session
        self.redis = redis_manager
        self.settings = get_settings()
        self.agent_factory = AgentFactory()
        self._running_agents: Dict[str, Dict[str, Any]] = {}
        self._collaboration_channels: Dict[str, List[str]] = {}
    
    async def _execute_core(self, request: AgentRequest, context: ServiceContext) -> ServiceResult[AgentResponse]:
        """核心执行逻辑"""
        try:
            if request.operation == AgentOperationType.CREATE:
                return await self._create_agent(request, context)
            elif request.operation == AgentOperationType.UPDATE:
                return await self._update_agent(request, context)
            elif request.operation == AgentOperationType.DELETE:
                return await self._delete_agent(request, context)
            elif request.operation == AgentOperationType.START:
                return await self._start_agent(request, context)
            elif request.operation == AgentOperationType.STOP:
                return await self._stop_agent(request, context)
            elif request.operation == AgentOperationType.PAUSE:
                return await self._pause_agent(request, context)
            elif request.operation == AgentOperationType.RESUME:
                return await self._resume_agent(request, context)
            elif request.operation == AgentOperationType.EXECUTE:
                return await self._execute_agent(request, context)
            elif request.operation == AgentOperationType.COLLABORATE:
                return await self._setup_collaboration(request, context)
            else:
                raise ValidationError(f"Unsupported operation: {request.operation}")
                
        except Exception as e:
            self._logger.error(f"Agent service error: {e}")
            raise BusinessError(f"Agent operation failed: {str(e)}")
    
    @service_method(timeout=30.0, retries=2)
    async def _create_agent(self, request: AgentRequest, context: ServiceContext) -> ServiceResult[AgentResponse]:
        """创建智能体"""
        # 验证必要参数
        if not all([request.name, request.agent_type, request.user_id]):
            raise ValidationError("Missing required fields: name, agent_type, user_id")
        
        # 验证用户存在
        user_stmt = select(User).where(User.id == request.user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValidationError(f"User {request.user_id} not found")
        
        # 创建智能体配置
        agent_config = self.agent_factory.create_agent_config(
            request.agent_type, request.config or {}
        )
        
        # 验证配置
        if not self.agent_factory.validate_agent_config(request.agent_type, agent_config):
            raise ValidationError("Invalid agent configuration")
        
        # 创建智能体
        agent = Agent(
            id=str(uuid.uuid4()),
            name=request.name,
            description=request.description or "",
            agent_type=request.agent_type,
            status=AgentStatus.CREATED,
            user_id=request.user_id,
            metadata=request.metadata or {}
        )
        
        # 创建智能体配置
        config_obj = AgentConfig(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            config_data=agent_config,
            version="1.0.0",
            is_active=True
        )
        
        # 保存到数据库
        self.db.add(agent)
        self.db.add(config_obj)
        
        # 添加工具关联
        if request.tools:
            for tool_name in request.tools:
                tool = AgentTool(
                    id=str(uuid.uuid4()),
                    agent_id=agent.id,
                    tool_name=tool_name,
                    tool_type="builtin",  # 可以根据需要调整
                    is_enabled=True
                )
                self.db.add(tool)
        
        await self.db.commit()
        await self.db.refresh(agent)
        
        # 缓存智能体信息
        await self.redis.set(
            f"agent:{agent.id}",
            json.dumps({
                "id": agent.id,
                "name": agent.name,
                "type": agent.agent_type.value,
                "status": agent.status.value,
                "config": agent_config
            }),
            ex=3600  # 1小时过期
        )
        
        response = AgentResponse(
            agent_id=agent.id,
            status=agent.status,
            message="Agent created successfully",
            metadata={"config_version": "1.0.0"}
        )
        
        return ServiceResult.success_result(response)
    
    @service_method(timeout=20.0, retries=1)
    async def _start_agent(self, request: AgentRequest, context: ServiceContext) -> ServiceResult[AgentResponse]:
        """启动智能体"""
        if not request.agent_id:
            raise ValidationError("Agent ID is required")
        
        # 获取智能体信息
        agent_stmt = select(Agent).options(
            selectinload(Agent.config),
            selectinload(Agent.tools)
        ).where(Agent.id == request.agent_id)
        
        agent_result = await self.db.execute(agent_stmt)
        agent = agent_result.scalar_one_or_none()
        
        if not agent:
            raise ValidationError(f"Agent {request.agent_id} not found")
        
        if agent.status == AgentStatus.RUNNING:
            raise BusinessError("Agent is already running")
        
        # 更新状态
        agent.status = AgentStatus.RUNNING
        agent.last_active_at = datetime.utcnow()
        
        # 记录到运行中的智能体
        self._running_agents[agent.id] = {
            "agent": agent,
            "start_time": datetime.utcnow(),
            "context": context.to_dict()
        }
        
        await self.db.commit()
        
        # 更新缓存
        await self.redis.set(
            f"agent:{agent.id}:status",
            AgentStatus.RUNNING.value,
            ex=3600
        )
        
        response = AgentResponse(
            agent_id=agent.id,
            status=agent.status,
            message="Agent started successfully"
        )
        
        return ServiceResult.success_result(response)
    
    @service_method(timeout=60.0, retries=1)
    async def _execute_agent(self, request: AgentRequest, context: ServiceContext) -> ServiceResult[AgentResponse]:
        """执行智能体任务"""
        if not request.agent_id or not request.task_data:
            raise ValidationError("Agent ID and task data are required")
        
        # 获取智能体信息
        agent_stmt = select(Agent).options(
            selectinload(Agent.config),
            selectinload(Agent.tools)
        ).where(Agent.id == request.agent_id)
        
        agent_result = await self.db.execute(agent_stmt)
        agent = agent_result.scalar_one_or_none()
        
        if not agent:
            raise ValidationError(f"Agent {request.agent_id} not found")
        
        if agent.status != AgentStatus.RUNNING:
            raise BusinessError("Agent is not running")
        
        # 创建执行记录
        execution = AgentExecution(
            id=str(uuid.uuid4()),
            agent_id=agent.id,
            status=ExecutionStatus.RUNNING,
            input_data=request.task_data,
            metadata=request.metadata or {},
            started_at=datetime.utcnow()
        )
        
        self.db.add(execution)
        await self.db.commit()
        await self.db.refresh(execution)
        
        try:
            # 模拟智能体执行（实际实现中会调用具体的智能体引擎）
            result = await self._simulate_agent_execution(agent, request.task_data, context)
            
            # 更新执行记录
            execution.status = ExecutionStatus.COMPLETED
            execution.output_data = result
            execution.completed_at = datetime.utcnow()
            execution.duration = (execution.completed_at - execution.started_at).total_seconds()
            
            # 更新智能体统计
            agent.total_executions += 1
            agent.last_execution_at = datetime.utcnow()
            
            await self.db.commit()
            
            response = AgentResponse(
                agent_id=agent.id,
                status=agent.status,
                result=result,
                execution_id=execution.id,
                message="Task executed successfully"
            )
            
            return ServiceResult.success_result(response)
            
        except Exception as e:
            # 更新执行记录为失败
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            execution.duration = (execution.completed_at - execution.started_at).total_seconds()
            
            await self.db.commit()
            
            raise BusinessError(f"Agent execution failed: {str(e)}")
    
    async def _simulate_agent_execution(self, agent: Agent, task_data: Dict[str, Any], 
                                      context: ServiceContext) -> Dict[str, Any]:
        """模拟智能体执行（实际实现中会替换为真实的智能体引擎）"""
        # 根据智能体类型模拟不同的执行逻辑
        if agent.agent_type == AgentType.SEARCH:
            return {
                "search_results": [
                    {"title": "Result 1", "url": "https://example1.com", "snippet": "Sample result 1"},
                    {"title": "Result 2", "url": "https://example2.com", "snippet": "Sample result 2"}
                ],
                "total_results": 2,
                "search_time": 0.5
            }
        elif agent.agent_type == AgentType.BROWSE:
            return {
                "page_content": "Sample page content",
                "page_title": "Sample Page",
                "links_found": 10,
                "images_found": 5
            }
        elif agent.agent_type == AgentType.PARSE:
            return {
                "parsed_content": "Extracted text content",
                "structure": {"headings": 3, "paragraphs": 10, "tables": 1},
                "metadata": {"format": "html", "size": "2KB"}
            }
        elif agent.agent_type == AgentType.REPORT:
            return {
                "report_content": "Generated report content",
                "format": "markdown",
                "sections": ["Introduction", "Analysis", "Conclusion"],
                "charts_included": 2
            }
        else:
            return {
                "result": "Task completed",
                "processing_time": 1.0,
                "status": "success"
            }
    
    @service_method(timeout=30.0, retries=1)
    async def _setup_collaboration(self, request: AgentRequest, context: ServiceContext) -> ServiceResult[AgentResponse]:
        """设置智能体协作"""
        if not request.agent_id or not request.collaborators:
            raise ValidationError("Agent ID and collaborators are required")
        
        # 验证所有智能体存在
        agent_ids = [request.agent_id] + request.collaborators
        agents_stmt = select(Agent).where(Agent.id.in_(agent_ids))
        agents_result = await self.db.execute(agents_stmt)
        agents = agents_result.scalars().all()
        
        if len(agents) != len(agent_ids):
            raise ValidationError("One or more agents not found")
        
        # 创建协作关系
        collaboration_id = str(uuid.uuid4())
        
        for collaborator_id in request.collaborators:
            collaboration = AgentCollaboration(
                id=str(uuid.uuid4()),
                primary_agent_id=request.agent_id,
                collaborator_agent_id=collaborator_id,
                collaboration_type="peer",  # 可以根据需要调整
                status="active",
                metadata=request.metadata or {}
            )
            self.db.add(collaboration)
        
        await self.db.commit()
        
        # 设置协作通道
        self._collaboration_channels[collaboration_id] = agent_ids
        
        # 缓存协作信息
        await self.redis.set(
            f"collaboration:{collaboration_id}",
            json.dumps({
                "primary_agent": request.agent_id,
                "collaborators": request.collaborators,
                "created_at": datetime.utcnow().isoformat()
            }),
            ex=7200  # 2小时过期
        )
        
        response = AgentResponse(
            agent_id=request.agent_id,
            status=AgentStatus.RUNNING,
            message="Collaboration setup successfully",
            metadata={"collaboration_id": collaboration_id}
        )
        
        return ServiceResult.success_result(response)
    
    async def validate(self, request: AgentRequest, context: Optional[ServiceContext] = None) -> bool:
        """验证请求"""
        if not isinstance(request, AgentRequest):
            return False
        
        if not request.operation:
            return False
        
        # 根据操作类型验证必要字段
        if request.operation == AgentOperationType.CREATE:
            return all([request.name, request.agent_type, request.user_id])
        elif request.operation in [AgentOperationType.START, AgentOperationType.STOP, 
                                 AgentOperationType.PAUSE, AgentOperationType.RESUME]:
            return request.agent_id is not None
        elif request.operation == AgentOperationType.EXECUTE:
            return all([request.agent_id, request.task_data])
        elif request.operation == AgentOperationType.COLLABORATE:
            return all([request.agent_id, request.collaborators])
        
        return True
    
    async def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """获取智能体状态"""
        # 先从缓存获取
        cached_status = await self.redis.get(f"agent:{agent_id}:status")
        if cached_status:
            return {"status": cached_status, "source": "cache"}
        
        # 从数据库获取
        agent_stmt = select(Agent).where(Agent.id == agent_id)
        agent_result = await self.db.execute(agent_stmt)
        agent = agent_result.scalar_one_or_none()
        
        if agent:
            return {
                "status": agent.status.value,
                "last_active": agent.last_active_at.isoformat() if agent.last_active_at else None,
                "total_executions": agent.total_executions,
                "source": "database"
            }
        
        return None
    
    async def list_user_agents(self, user_id: str, status: Optional[AgentStatus] = None) -> List[Dict[str, Any]]:
        """列出用户的智能体"""
        stmt = select(Agent).where(Agent.user_id == user_id)
        
        if status:
            stmt = stmt.where(Agent.status == status)
        
        result = await self.db.execute(stmt)
        agents = result.scalars().all()
        
        return [
            {
                "id": agent.id,
                "name": agent.name,
                "type": agent.agent_type.value,
                "status": agent.status.value,
                "created_at": agent.created_at.isoformat(),
                "last_active": agent.last_active_at.isoformat() if agent.last_active_at else None,
                "total_executions": agent.total_executions
            }
            for agent in agents
        ]
    
    async def get_execution_history(self, agent_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """获取智能体执行历史"""
        stmt = select(AgentExecution).where(
            AgentExecution.agent_id == agent_id
        ).order_by(AgentExecution.started_at.desc()).limit(limit)
        
        result = await self.db.execute(stmt)
        executions = result.scalars().all()
        
        return [
            {
                "id": execution.id,
                "status": execution.status.value,
                "started_at": execution.started_at.isoformat(),
                "completed_at": execution.completed_at.isoformat() if execution.completed_at else None,
                "duration": execution.duration,
                "error_message": execution.error_message
            }
            for execution in executions
        ]
    
    async def health_check(self) -> bool:
        """健康检查"""
        try:
            # 检查数据库连接
            await self.db.execute(select(1))
            
            # 检查Redis连接
            await self.redis.ping()
            
            return True
        except Exception as e:
            self._logger.error(f"Health check failed: {e}")
            return False