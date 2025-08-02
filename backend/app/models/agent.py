#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent智能体数据模型

本模块定义了ZK-Agent系统中智能体相关的数据模型，包括智能体基本信息、
配置参数、执行历史、工具管理等。支持多智能体协作和可插拔架构。

主要模型：
- Agent: 智能体基本信息模型
- AgentConfig: 智能体配置模型
- AgentExecution: 智能体执行记录模型
- AgentTool: 智能体工具模型
- AgentWorkflow: 智能体工作流模型
- AgentMemory: 智能体记忆模型
- AgentCollaboration: 智能体协作模型

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SQLEnum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AgentType(str, Enum):
    """智能体类型枚举"""
    GENERAL = "general"  # 通用智能体
    SPECIALIST = "specialist"  # 专业智能体
    COORDINATOR = "coordinator"  # 协调智能体
    EXECUTOR = "executor"  # 执行智能体
    ANALYZER = "analyzer"  # 分析智能体
    CREATIVE = "creative"  # 创意智能体
    REVIEWER = "reviewer"  # 审查智能体


class AgentStatus(str, Enum):
    """智能体状态枚举"""
    ACTIVE = "active"  # 活跃
    INACTIVE = "inactive"  # 非活跃
    BUSY = "busy"  # 忙碌
    ERROR = "error"  # 错误
    MAINTENANCE = "maintenance"  # 维护中


class ExecutionStatus(str, Enum):
    """执行状态枚举"""
    PENDING = "pending"  # 等待中
    RUNNING = "running"  # 运行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"  # 失败
    CANCELLED = "cancelled"  # 已取消
    TIMEOUT = "timeout"  # 超时


class ToolType(str, Enum):
    """工具类型枚举"""
    BUILTIN = "builtin"  # 内置工具
    CUSTOM = "custom"  # 自定义工具
    EXTERNAL = "external"  # 外部工具
    API = "api"  # API工具
    PLUGIN = "plugin"  # 插件工具


class WorkflowStatus(str, Enum):
    """工作流状态枚举"""
    DRAFT = "draft"  # 草稿
    ACTIVE = "active"  # 活跃
    PAUSED = "paused"  # 暂停
    COMPLETED = "completed"  # 完成
    FAILED = "failed"  # 失败
    ARCHIVED = "archived"  # 已归档


class Agent(Base):
    """
    智能体模型
    
    存储智能体的基本信息和配置。
    """
    
    __tablename__ = "agents"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="智能体名称"
    )
    display_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="显示名称"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="智能体描述"
    )
    
    # 类型和状态
    agent_type: Mapped[AgentType] = mapped_column(
        SQLEnum(AgentType),
        nullable=False,
        index=True,
        comment="智能体类型"
    )
    status: Mapped[AgentStatus] = mapped_column(
        SQLEnum(AgentStatus),
        default=AgentStatus.INACTIVE,
        nullable=False,
        index=True,
        comment="智能体状态"
    )
    
    # 版本信息
    version: Mapped[str] = mapped_column(
        String(20),
        default="1.0.0",
        nullable=False,
        comment="版本号"
    )
    
    # 所有者信息
    owner_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="所有者ID"
    )
    
    # 配置信息
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否公开"
    )
    is_template: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否为模板"
    )
    
    # 性能指标
    success_rate: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        comment="成功率"
    )
    average_execution_time: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        comment="平均执行时间（秒）"
    )
    total_executions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="总执行次数"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    last_active_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后活跃时间"
    )
    
    # 关联关系
    owner: Mapped["User"] = relationship(
        "User",
        foreign_keys=[owner_id]
    )
    
    config: Mapped[Optional["AgentConfig"]] = relationship(
        "AgentConfig",
        back_populates="agent",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    executions: Mapped[List["AgentExecution"]] = relationship(
        "AgentExecution",
        back_populates="agent",
        cascade="all, delete-orphan"
    )
    
    tools: Mapped[List["AgentTool"]] = relationship(
        "AgentTool",
        back_populates="agent",
        cascade="all, delete-orphan"
    )
    
    workflows: Mapped[List["AgentWorkflow"]] = relationship(
        "AgentWorkflow",
        back_populates="agent",
        cascade="all, delete-orphan"
    )
    
    memories: Mapped[List["AgentMemory"]] = relationship(
        "AgentMemory",
        back_populates="agent",
        cascade="all, delete-orphan"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_agent_owner_type", "owner_id", "agent_type"),
        Index("idx_agent_status_active", "status", "last_active_at"),
        Index("idx_agent_public_template", "is_public", "is_template"),
        UniqueConstraint("owner_id", "name", name="uq_agent_owner_name"),
    )
    
    def __repr__(self) -> str:
        return f"<Agent(id={self.id}, name='{self.name}', type='{self.agent_type}', status='{self.status}')>"


class AgentConfig(Base):
    """
    智能体配置模型
    
    存储智能体的详细配置参数。
    """
    
    __tablename__ = "agent_configs"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        comment="智能体ID"
    )
    
    # 模型配置
    model_name: Mapped[str] = mapped_column(
        String(100),
        default="gpt-4",
        nullable=False,
        comment="模型名称"
    )
    model_provider: Mapped[str] = mapped_column(
        String(50),
        default="openai",
        nullable=False,
        comment="模型提供商"
    )
    temperature: Mapped[float] = mapped_column(
        Float,
        default=0.7,
        nullable=False,
        comment="温度参数"
    )
    max_tokens: Mapped[int] = mapped_column(
        Integer,
        default=4000,
        nullable=False,
        comment="最大令牌数"
    )
    
    # 系统提示
    system_prompt: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="系统提示"
    )
    
    # 执行配置
    max_execution_time: Mapped[int] = mapped_column(
        Integer,
        default=300,
        nullable=False,
        comment="最大执行时间（秒）"
    )
    max_retry_attempts: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
        comment="最大重试次数"
    )
    
    # 记忆配置
    memory_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否启用记忆"
    )
    memory_window_size: Mapped[int] = mapped_column(
        Integer,
        default=10,
        nullable=False,
        comment="记忆窗口大小"
    )
    
    # 协作配置
    collaboration_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否启用协作"
    )
    
    # 自定义配置
    custom_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="自定义配置（JSON格式）"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    
    # 关联关系
    agent: Mapped[Agent] = relationship(
        "Agent",
        back_populates="config"
    )
    
    def __repr__(self) -> str:
        return f"<AgentConfig(id={self.id}, agent_id={self.agent_id}, model='{self.model_name}')>"


class AgentExecution(Base):
    """
    智能体执行记录模型
    
    记录智能体的执行历史和结果。
    """
    
    __tablename__ = "agent_executions"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="智能体ID"
    )
    
    # 执行信息
    execution_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="执行ID"
    )
    task_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="任务描述"
    )
    
    # 状态信息
    status: Mapped[ExecutionStatus] = mapped_column(
        SQLEnum(ExecutionStatus),
        default=ExecutionStatus.PENDING,
        nullable=False,
        index=True,
        comment="执行状态"
    )
    
    # 输入输出
    input_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="输入数据（JSON格式）"
    )
    output_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="输出数据（JSON格式）"
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="错误信息"
    )
    
    # 性能指标
    execution_time: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="执行时间（秒）"
    )
    tokens_used: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="使用的令牌数"
    )
    cost: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="执行成本"
    )
    
    # 用户信息
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="用户ID"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="开始时间"
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="完成时间"
    )
    
    # 关联关系
    agent: Mapped[Agent] = relationship(
        "Agent",
        back_populates="executions"
    )
    
    user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[user_id]
    )
    
    # 索引
    __table_args__ = (
        Index("idx_execution_agent_status", "agent_id", "status"),
        Index("idx_execution_user_created", "user_id", "created_at"),
        Index("idx_execution_created_at", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<AgentExecution(id={self.id}, execution_id='{self.execution_id}', status='{self.status}')>"


class AgentTool(Base):
    """
    智能体工具模型
    
    管理智能体可用的工具。
    """
    
    __tablename__ = "agent_tools"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="智能体ID"
    )
    
    # 工具信息
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="工具名称"
    )
    display_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="显示名称"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="工具描述"
    )
    
    # 工具类型
    tool_type: Mapped[ToolType] = mapped_column(
        SQLEnum(ToolType),
        nullable=False,
        index=True,
        comment="工具类型"
    )
    
    # 配置信息
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="工具配置（JSON格式）"
    )
    
    # 状态信息
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否启用"
    )
    
    # 使用统计
    usage_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="使用次数"
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后使用时间"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    
    # 关联关系
    agent: Mapped[Agent] = relationship(
        "Agent",
        back_populates="tools"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_tool_agent_type", "agent_id", "tool_type"),
        Index("idx_tool_enabled_usage", "is_enabled", "usage_count"),
        UniqueConstraint("agent_id", "name", name="uq_agent_tool_name"),
    )
    
    def __repr__(self) -> str:
        return f"<AgentTool(id={self.id}, name='{self.name}', type='{self.tool_type}')>"


class AgentWorkflow(Base):
    """
    智能体工作流模型
    
    定义智能体的工作流程。
    """
    
    __tablename__ = "agent_workflows"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="智能体ID"
    )
    
    # 工作流信息
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="工作流名称"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="工作流描述"
    )
    
    # 状态信息
    status: Mapped[WorkflowStatus] = mapped_column(
        SQLEnum(WorkflowStatus),
        default=WorkflowStatus.DRAFT,
        nullable=False,
        index=True,
        comment="工作流状态"
    )
    
    # 工作流定义
    definition: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        comment="工作流定义（JSON格式）"
    )
    
    # 版本信息
    version: Mapped[str] = mapped_column(
        String(20),
        default="1.0.0",
        nullable=False,
        comment="版本号"
    )
    
    # 执行统计
    execution_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="执行次数"
    )
    success_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="成功次数"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    last_executed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后执行时间"
    )
    
    # 关联关系
    agent: Mapped[Agent] = relationship(
        "Agent",
        back_populates="workflows"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_workflow_agent_status", "agent_id", "status"),
        Index("idx_workflow_execution_count", "execution_count"),
        UniqueConstraint("agent_id", "name", name="uq_agent_workflow_name"),
    )
    
    def __repr__(self) -> str:
        return f"<AgentWorkflow(id={self.id}, name='{self.name}', status='{self.status}')>"


class AgentMemory(Base):
    """
    智能体记忆模型
    
    存储智能体的记忆数据。
    """
    
    __tablename__ = "agent_memories"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="智能体ID"
    )
    
    # 记忆信息
    memory_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="记忆类型"
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="记忆内容"
    )
    
    # 元数据
    metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="记忆元数据（JSON格式）"
    )
    
    # 重要性评分
    importance_score: Mapped[float] = mapped_column(
        Float,
        default=0.5,
        nullable=False,
        comment="重要性评分（0-1）"
    )
    
    # 访问统计
    access_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="访问次数"
    )
    last_accessed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后访问时间"
    )
    
    # 过期时间
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="过期时间"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    
    # 关联关系
    agent: Mapped[Agent] = relationship(
        "Agent",
        back_populates="memories"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_memory_agent_type", "agent_id", "memory_type"),
        Index("idx_memory_importance", "importance_score"),
        Index("idx_memory_expires_at", "expires_at"),
    )
    
    def __repr__(self) -> str:
        return f"<AgentMemory(id={self.id}, agent_id={self.agent_id}, type='{self.memory_type}')>"
    
    @property
    def is_expired(self) -> bool:
        """检查记忆是否过期"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at


class AgentCollaboration(Base):
    """
    智能体协作模型
    
    记录智能体之间的协作关系和历史。
    """
    
    __tablename__ = "agent_collaborations"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 协作智能体
    initiator_agent_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="发起者智能体ID"
    )
    collaborator_agent_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="协作者智能体ID"
    )
    
    # 协作信息
    collaboration_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="协作类型"
    )
    task_description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="任务描述"
    )
    
    # 状态信息
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        nullable=False,
        index=True,
        comment="协作状态"
    )
    
    # 协作数据
    shared_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="共享数据（JSON格式）"
    )
    
    # 结果信息
    result: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="协作结果（JSON格式）"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="完成时间"
    )
    
    # 关联关系
    initiator: Mapped[Agent] = relationship(
        "Agent",
        foreign_keys=[initiator_agent_id]
    )
    
    collaborator: Mapped[Agent] = relationship(
        "Agent",
        foreign_keys=[collaborator_agent_id]
    )
    
    # 索引
    __table_args__ = (
        Index("idx_collaboration_initiator", "initiator_agent_id"),
        Index("idx_collaboration_collaborator", "collaborator_agent_id"),
        Index("idx_collaboration_status", "status"),
        Index("idx_collaboration_created_at", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<AgentCollaboration(id={self.id}, initiator={self.initiator_agent_id}, collaborator={self.collaborator_agent_id})>"