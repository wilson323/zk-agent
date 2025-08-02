#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent任务管理数据模型

本模块定义了ZK-Agent系统中任务管理相关的数据模型，包括任务定义、
执行状态、依赖关系、调度配置等。支持复杂的工作流编排和任务调度。

主要模型：
- Task: 任务基本信息模型
- TaskExecution: 任务执行记录模型
- TaskDependency: 任务依赖关系模型
- TaskSchedule: 任务调度配置模型
- Workflow: 工作流模型
- WorkflowExecution: 工作流执行记录模型
- WorkflowNode: 工作流节点模型
- WorkflowEdge: 工作流边模型

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from datetime import datetime, timedelta
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


class TaskStatus(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"  # 等待中
    QUEUED = "queued"  # 已排队
    RUNNING = "running"  # 运行中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"  # 失败
    CANCELLED = "cancelled"  # 已取消
    TIMEOUT = "timeout"  # 超时
    RETRYING = "retrying"  # 重试中
    PAUSED = "paused"  # 暂停


class TaskPriority(str, Enum):
    """任务优先级枚举"""
    LOW = "low"  # 低优先级
    NORMAL = "normal"  # 普通优先级
    HIGH = "high"  # 高优先级
    URGENT = "urgent"  # 紧急优先级
    CRITICAL = "critical"  # 关键优先级


class TaskType(str, Enum):
    """任务类型枚举"""
    SINGLE = "single"  # 单次任务
    RECURRING = "recurring"  # 循环任务
    WORKFLOW = "workflow"  # 工作流任务
    BATCH = "batch"  # 批处理任务
    STREAMING = "streaming"  # 流处理任务


class ScheduleType(str, Enum):
    """调度类型枚举"""
    IMMEDIATE = "immediate"  # 立即执行
    DELAYED = "delayed"  # 延迟执行
    CRON = "cron"  # Cron表达式
    INTERVAL = "interval"  # 间隔执行
    EVENT = "event"  # 事件触发


class WorkflowStatus(str, Enum):
    """工作流状态枚举"""
    DRAFT = "draft"  # 草稿
    ACTIVE = "active"  # 活跃
    INACTIVE = "inactive"  # 非活跃
    ARCHIVED = "archived"  # 已归档
    DEPRECATED = "deprecated"  # 已废弃


class NodeType(str, Enum):
    """节点类型枚举"""
    START = "start"  # 开始节点
    END = "end"  # 结束节点
    TASK = "task"  # 任务节点
    CONDITION = "condition"  # 条件节点
    PARALLEL = "parallel"  # 并行节点
    MERGE = "merge"  # 合并节点
    LOOP = "loop"  # 循环节点
    SUBWORKFLOW = "subworkflow"  # 子工作流节点


class Task(Base):
    """
    任务模型
    
    定义系统中的任务基本信息和配置。
    """
    
    __tablename__ = "tasks"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
        comment="任务名称"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="任务描述"
    )
    
    # 任务类型和状态
    task_type: Mapped[TaskType] = mapped_column(
        SQLEnum(TaskType),
        default=TaskType.SINGLE,
        nullable=False,
        index=True,
        comment="任务类型"
    )
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus),
        default=TaskStatus.PENDING,
        nullable=False,
        index=True,
        comment="任务状态"
    )
    priority: Mapped[TaskPriority] = mapped_column(
        SQLEnum(TaskPriority),
        default=TaskPriority.NORMAL,
        nullable=False,
        index=True,
        comment="任务优先级"
    )
    
    # 关联信息
    agent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("agents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="执行智能体ID"
    )
    workflow_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="所属工作流ID"
    )
    creator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="创建者ID"
    )
    
    # 任务配置
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="任务配置（JSON格式）"
    )
    input_schema: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="输入数据模式（JSON Schema）"
    )
    output_schema: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="输出数据模式（JSON Schema）"
    )
    
    # 执行配置
    max_execution_time: Mapped[int] = mapped_column(
        Integer,
        default=3600,
        nullable=False,
        comment="最大执行时间（秒）"
    )
    max_retry_attempts: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
        comment="最大重试次数"
    )
    retry_delay: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False,
        comment="重试延迟（秒）"
    )
    
    # 资源限制
    cpu_limit: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="CPU限制（核数）"
    )
    memory_limit: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="内存限制（MB）"
    )
    
    # 标签和分类
    tags: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        comment="任务标签"
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="任务分类"
    )
    
    # 统计信息
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
    failure_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="失败次数"
    )
    average_execution_time: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        comment="平均执行时间（秒）"
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
    agent: Mapped[Optional["Agent"]] = relationship(
        "Agent",
        foreign_keys=[agent_id]
    )
    
    workflow: Mapped[Optional["Workflow"]] = relationship(
        "Workflow",
        back_populates="tasks"
    )
    
    creator: Mapped["User"] = relationship(
        "User",
        foreign_keys=[creator_id]
    )
    
    executions: Mapped[List["TaskExecution"]] = relationship(
        "TaskExecution",
        back_populates="task",
        cascade="all, delete-orphan"
    )
    
    dependencies: Mapped[List["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.task_id",
        back_populates="task",
        cascade="all, delete-orphan"
    )
    
    dependents: Mapped[List["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.depends_on_task_id",
        back_populates="depends_on_task"
    )
    
    schedule: Mapped[Optional["TaskSchedule"]] = relationship(
        "TaskSchedule",
        back_populates="task",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_task_status_priority", "status", "priority"),
        Index("idx_task_agent_status", "agent_id", "status"),
        Index("idx_task_workflow_status", "workflow_id", "status"),
        Index("idx_task_creator_created", "creator_id", "created_at"),
        Index("idx_task_category_status", "category", "status"),
        Index("idx_task_last_executed", "last_executed_at"),
    )
    
    def __repr__(self) -> str:
        return f"<Task(id={self.id}, name='{self.name}', status='{self.status}', priority='{self.priority}')>"
    
    @property
    def success_rate(self) -> float:
        """计算成功率"""
        if self.execution_count == 0:
            return 0.0
        return self.success_count / self.execution_count
    
    def can_execute(self) -> bool:
        """检查任务是否可以执行"""
        return self.status in [TaskStatus.PENDING, TaskStatus.QUEUED, TaskStatus.RETRYING]


class TaskExecution(Base):
    """
    任务执行记录模型
    
    记录任务的具体执行历史和结果。
    """
    
    __tablename__ = "task_executions"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="任务ID"
    )
    
    # 执行信息
    execution_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="执行ID"
    )
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus),
        default=TaskStatus.PENDING,
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
    error_traceback: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="错误堆栈"
    )
    
    # 执行环境
    executor_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="执行器ID"
    )
    worker_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        comment="工作节点ID"
    )
    
    # 性能指标
    execution_time: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="执行时间（秒）"
    )
    cpu_usage: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="CPU使用率"
    )
    memory_usage: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="内存使用量（MB）"
    )
    
    # 重试信息
    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="重试次数"
    )
    
    # 用户信息
    triggered_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="触发用户ID"
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
    task: Mapped[Task] = relationship(
        "Task",
        back_populates="executions"
    )
    
    triggered_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[triggered_by_user_id]
    )
    
    # 索引
    __table_args__ = (
        Index("idx_execution_task_status", "task_id", "status"),
        Index("idx_execution_created_at", "created_at"),
        Index("idx_execution_executor", "executor_id"),
        Index("idx_execution_worker", "worker_id"),
    )
    
    def __repr__(self) -> str:
        return f"<TaskExecution(id={self.id}, execution_id='{self.execution_id}', status='{self.status}')>"
    
    @property
    def is_running(self) -> bool:
        """检查是否正在运行"""
        return self.status == TaskStatus.RUNNING
    
    @property
    def is_completed(self) -> bool:
        """检查是否已完成"""
        return self.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED, TaskStatus.TIMEOUT]


class TaskDependency(Base):
    """
    任务依赖关系模型
    
    定义任务之间的依赖关系。
    """
    
    __tablename__ = "task_dependencies"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 依赖关系
    task_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="任务ID"
    )
    depends_on_task_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="依赖的任务ID"
    )
    
    # 依赖类型
    dependency_type: Mapped[str] = mapped_column(
        String(20),
        default="success",
        nullable=False,
        comment="依赖类型（success/failure/completion）"
    )
    
    # 条件配置
    condition: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="依赖条件（JSON格式）"
    )
    
    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间"
    )
    
    # 关联关系
    task: Mapped[Task] = relationship(
        "Task",
        foreign_keys=[task_id],
        back_populates="dependencies"
    )
    
    depends_on_task: Mapped[Task] = relationship(
        "Task",
        foreign_keys=[depends_on_task_id],
        back_populates="dependents"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_dependency_task", "task_id"),
        Index("idx_dependency_depends_on", "depends_on_task_id"),
        UniqueConstraint("task_id", "depends_on_task_id", name="uq_task_dependency"),
    )
    
    def __repr__(self) -> str:
        return f"<TaskDependency(task_id={self.task_id}, depends_on={self.depends_on_task_id}, type='{self.dependency_type}')>"


class TaskSchedule(Base):
    """
    任务调度配置模型
    
    定义任务的调度规则和时间配置。
    """
    
    __tablename__ = "task_schedules"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    task_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tasks.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        comment="任务ID"
    )
    
    # 调度类型
    schedule_type: Mapped[ScheduleType] = mapped_column(
        SQLEnum(ScheduleType),
        nullable=False,
        index=True,
        comment="调度类型"
    )
    
    # 调度配置
    cron_expression: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Cron表达式"
    )
    interval_seconds: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="间隔时间（秒）"
    )
    start_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="开始时间"
    )
    end_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="结束时间"
    )
    
    # 状态信息
    is_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="是否启用"
    )
    
    # 执行限制
    max_executions: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="最大执行次数"
    )
    current_executions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="当前执行次数"
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
    next_run_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="下次运行时间"
    )
    last_run_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="上次运行时间"
    )
    
    # 关联关系
    task: Mapped[Task] = relationship(
        "Task",
        back_populates="schedule"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_schedule_next_run", "next_run_time"),
        Index("idx_schedule_enabled", "is_enabled"),
        Index("idx_schedule_type", "schedule_type"),
    )
    
    def __repr__(self) -> str:
        return f"<TaskSchedule(id={self.id}, task_id={self.task_id}, type='{self.schedule_type}')>"
    
    def is_due(self) -> bool:
        """检查是否到期执行"""
        if not self.is_enabled or self.next_run_time is None:
            return False
        return datetime.utcnow() >= self.next_run_time
    
    def can_execute(self) -> bool:
        """检查是否可以执行"""
        if not self.is_enabled:
            return False
        if self.max_executions is not None and self.current_executions >= self.max_executions:
            return False
        if self.end_time is not None and datetime.utcnow() > self.end_time:
            return False
        return True


class Workflow(Base):
    """
    工作流模型
    
    定义复杂的任务编排和执行流程。
    """
    
    __tablename__ = "workflows"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    
    # 基本信息
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
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
    
    # 工作流定义
    definition: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        comment="工作流定义（JSON格式）"
    )
    
    # 配置信息
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="工作流配置（JSON格式）"
    )
    
    # 标签和分类
    tags: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        comment="工作流标签"
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
        comment="工作流分类"
    )
    
    # 访问控制
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
    
    # 统计信息
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
    failure_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="失败次数"
    )
    average_execution_time: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        comment="平均执行时间（秒）"
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
    owner: Mapped["User"] = relationship(
        "User",
        foreign_keys=[owner_id]
    )
    
    tasks: Mapped[List[Task]] = relationship(
        "Task",
        back_populates="workflow",
        cascade="all, delete-orphan"
    )
    
    executions: Mapped[List["WorkflowExecution"]] = relationship(
        "WorkflowExecution",
        back_populates="workflow",
        cascade="all, delete-orphan"
    )
    
    nodes: Mapped[List["WorkflowNode"]] = relationship(
        "WorkflowNode",
        back_populates="workflow",
        cascade="all, delete-orphan"
    )
    
    edges: Mapped[List["WorkflowEdge"]] = relationship(
        "WorkflowEdge",
        back_populates="workflow",
        cascade="all, delete-orphan"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_workflow_owner_status", "owner_id", "status"),
        Index("idx_workflow_category_status", "category", "status"),
        Index("idx_workflow_public_template", "is_public", "is_template"),
        Index("idx_workflow_last_executed", "last_executed_at"),
        UniqueConstraint("owner_id", "name", "version", name="uq_workflow_owner_name_version"),
    )
    
    def __repr__(self) -> str:
        return f"<Workflow(id={self.id}, name='{self.name}', status='{self.status}', version='{self.version}')>"
    
    @property
    def success_rate(self) -> float:
        """计算成功率"""
        if self.execution_count == 0:
            return 0.0
        return self.success_count / self.execution_count


class WorkflowExecution(Base):
    """
    工作流执行记录模型
    
    记录工作流的执行历史和状态。
    """
    
    __tablename__ = "workflow_executions"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="工作流ID"
    )
    
    # 执行信息
    execution_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="执行ID"
    )
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus),
        default=TaskStatus.PENDING,
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
    context_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="上下文数据（JSON格式）"
    )
    
    # 错误信息
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="错误信息"
    )
    failed_node_id: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="失败节点ID"
    )
    
    # 执行统计
    total_nodes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="总节点数"
    )
    completed_nodes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="已完成节点数"
    )
    failed_nodes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="失败节点数"
    )
    
    # 性能指标
    execution_time: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="执行时间（秒）"
    )
    
    # 用户信息
    triggered_by_user_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="触发用户ID"
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
    workflow: Mapped[Workflow] = relationship(
        "Workflow",
        back_populates="executions"
    )
    
    triggered_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[triggered_by_user_id]
    )
    
    # 索引
    __table_args__ = (
        Index("idx_workflow_execution_status", "workflow_id", "status"),
        Index("idx_workflow_execution_created", "created_at"),
        Index("idx_workflow_execution_user", "triggered_by_user_id"),
    )
    
    def __repr__(self) -> str:
        return f"<WorkflowExecution(id={self.id}, execution_id='{self.execution_id}', status='{self.status}')>"
    
    @property
    def progress_percentage(self) -> float:
        """计算执行进度百分比"""
        if self.total_nodes == 0:
            return 0.0
        return (self.completed_nodes / self.total_nodes) * 100


class WorkflowNode(Base):
    """
    工作流节点模型
    
    定义工作流中的节点信息。
    """
    
    __tablename__ = "workflow_nodes"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="工作流ID"
    )
    
    # 节点信息
    node_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="节点ID"
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="节点名称"
    )
    node_type: Mapped[NodeType] = mapped_column(
        SQLEnum(NodeType),
        nullable=False,
        index=True,
        comment="节点类型"
    )
    
    # 位置信息
    position_x: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        comment="X坐标"
    )
    position_y: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
        comment="Y坐标"
    )
    
    # 配置信息
    config: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="节点配置（JSON格式）"
    )
    
    # 关联任务
    task_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联任务ID"
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
    workflow: Mapped[Workflow] = relationship(
        "Workflow",
        back_populates="nodes"
    )
    
    task: Mapped[Optional[Task]] = relationship(
        "Task",
        foreign_keys=[task_id]
    )
    
    # 索引
    __table_args__ = (
        Index("idx_node_workflow_type", "workflow_id", "node_type"),
        UniqueConstraint("workflow_id", "node_id", name="uq_workflow_node_id"),
    )
    
    def __repr__(self) -> str:
        return f"<WorkflowNode(id={self.id}, node_id='{self.node_id}', type='{self.node_type}')>"


class WorkflowEdge(Base):
    """
    工作流边模型
    
    定义工作流节点之间的连接关系。
    """
    
    __tablename__ = "workflow_edges"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="工作流ID"
    )
    
    # 边信息
    edge_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="边ID"
    )
    source_node_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="源节点ID"
    )
    target_node_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="目标节点ID"
    )
    
    # 条件配置
    condition: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON,
        nullable=True,
        comment="边条件（JSON格式）"
    )
    
    # 标签
    label: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="边标签"
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
    workflow: Mapped[Workflow] = relationship(
        "Workflow",
        back_populates="edges"
    )
    
    # 索引
    __table_args__ = (
        Index("idx_edge_workflow_source", "workflow_id", "source_node_id"),
        Index("idx_edge_workflow_target", "workflow_id", "target_node_id"),
        UniqueConstraint("workflow_id", "edge_id", name="uq_workflow_edge_id"),
    )
    
    def __repr__(self) -> str:
        return f"<WorkflowEdge(id={self.id}, edge_id='{self.edge_id}', source='{self.source_node_id}', target='{self.target_node_id}')>"