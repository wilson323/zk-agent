#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent任务调度服务

本模块实现了ZK-Agent系统的任务调度服务，支持多级多模式思维、
任务级响应、工作级计划执行器等核心功能。

核心功能：
- 多级思维模式（Work Level、Task Level）
- 任务调度和执行
- 依赖关系管理
- 并行化处理
- 任务优先级管理
- 任务状态监控
- 任务重试和恢复
- 任务性能分析

思维模式：
- Work Level: 工作级别的计划和执行
- Task Level: 任务级别的响应和处理
- 依赖分析: 自动分析任务依赖关系
- 并行化: 支持任务并行执行

设计模式：
- 策略模式：不同的调度策略
- 观察者模式：任务状态变化通知
- 命令模式：任务执行命令
- 工厂模式：任务创建
- 责任链模式：任务处理链

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Union, Callable, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.orm import selectinload
import networkx as nx
from pydantic import BaseModel, Field

from app.services.base import (
    BaseService, ServiceContext, ServiceResult, ServiceError,
    BusinessError, ValidationError, ResourceError, service_method
)
from app.models.task import (
    Task, TaskExecution, TaskDependency, TaskSchedule,
    Workflow, WorkflowExecution, WorkflowNode, WorkflowEdge,
    TaskStatus, TaskPriority, TaskType, ScheduleType
)
from app.core.database import get_db
from app.core.redis import RedisManager
from app.core.config import get_settings


class ThinkingLevel(Enum):
    """思维级别枚举"""
    WORK_LEVEL = "work_level"      # 工作级别
    TASK_LEVEL = "task_level"      # 任务级别
    ATOMIC_LEVEL = "atomic_level"  # 原子级别


class ThinkingMode(Enum):
    """思维模式枚举"""
    SEQUENTIAL = "sequential"      # 顺序思维
    PARALLEL = "parallel"          # 并行思维
    REACTIVE = "reactive"          # 响应式思维
    PROACTIVE = "proactive"        # 主动式思维
    ADAPTIVE = "adaptive"          # 自适应思维


class SchedulingStrategy(Enum):
    """调度策略枚举"""
    FIFO = "fifo"                  # 先进先出
    PRIORITY = "priority"          # 优先级调度
    DEADLINE = "deadline"          # 截止时间调度
    RESOURCE = "resource"          # 资源优化调度
    DEPENDENCY = "dependency"      # 依赖优化调度
    ADAPTIVE = "adaptive"          # 自适应调度


class ExecutionMode(Enum):
    """执行模式枚举"""
    SYNC = "sync"                  # 同步执行
    ASYNC = "async"                # 异步执行
    BATCH = "batch"                # 批量执行
    STREAM = "stream"              # 流式执行


class TaskOperation(Enum):
    """任务操作类型"""
    CREATE = "create"
    SCHEDULE = "schedule"
    EXECUTE = "execute"
    PAUSE = "pause"
    RESUME = "resume"
    CANCEL = "cancel"
    RETRY = "retry"
    ANALYZE = "analyze"
    OPTIMIZE = "optimize"


@dataclass
class TaskMetrics:
    """任务性能指标"""
    execution_time: float = 0.0
    wait_time: float = 0.0
    queue_time: float = 0.0
    resource_usage: Dict[str, float] = field(default_factory=dict)
    success_rate: float = 1.0
    retry_count: int = 0
    throughput: float = 0.0
    latency: float = 0.0


@dataclass
class ThinkingContext:
    """思维上下文"""
    level: ThinkingLevel
    mode: ThinkingMode
    current_task: Optional[str] = None
    parent_context: Optional['ThinkingContext'] = None
    child_contexts: List['ThinkingContext'] = field(default_factory=list)
    variables: Dict[str, Any] = field(default_factory=dict)
    constraints: Dict[str, Any] = field(default_factory=dict)
    objectives: List[str] = field(default_factory=list)


@dataclass
class WorkPlan:
    """工作计划"""
    id: str
    name: str
    description: str
    objectives: List[str]
    tasks: List[str]
    dependencies: Dict[str, List[str]]
    timeline: Dict[str, datetime]
    resources: Dict[str, Any]
    constraints: Dict[str, Any]
    success_criteria: List[str]


@dataclass
class TaskPlan:
    """任务计划"""
    id: str
    work_plan_id: str
    name: str
    description: str
    type: TaskType
    priority: TaskPriority
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]
    dependencies: List[str]
    estimated_duration: timedelta
    deadline: Optional[datetime]
    resources_required: Dict[str, Any]
    success_criteria: List[str]


class ITaskExecutor(ABC):
    """任务执行器接口"""
    
    @abstractmethod
    async def execute(self, task: TaskPlan, context: ThinkingContext) -> Dict[str, Any]:
        """执行任务"""
        pass
    
    @abstractmethod
    async def validate(self, task: TaskPlan) -> bool:
        """验证任务"""
        pass
    
    @abstractmethod
    async def estimate_duration(self, task: TaskPlan) -> timedelta:
        """估算执行时间"""
        pass


class BaseTaskExecutor(ITaskExecutor):
    """基础任务执行器"""
    
    def __init__(self, executor_type: str):
        self.executor_type = executor_type
        self.metrics = TaskMetrics()
    
    async def validate(self, task: TaskPlan) -> bool:
        """默认验证逻辑"""
        return all([
            task.id,
            task.name,
            task.type,
            task.priority
        ])
    
    async def estimate_duration(self, task: TaskPlan) -> timedelta:
        """默认时间估算"""
        return task.estimated_duration or timedelta(minutes=5)
    
    def update_metrics(self, execution_time: float, success: bool) -> None:
        """更新执行指标"""
        self.metrics.execution_time = execution_time
        if not success:
            self.metrics.retry_count += 1
        
        # 计算成功率
        total_executions = max(1, self.metrics.retry_count + (1 if success else 0))
        self.metrics.success_rate = (total_executions - self.metrics.retry_count) / total_executions


class WorkLevelPlanner:
    """工作级计划器"""
    
    def __init__(self):
        self.active_plans: Dict[str, WorkPlan] = {}
        self.plan_history: List[WorkPlan] = []
    
    async def create_work_plan(self, objectives: List[str], constraints: Dict[str, Any]) -> WorkPlan:
        """创建工作计划"""
        plan_id = str(uuid.uuid4())
        
        # 分析目标，分解为任务
        tasks = await self._decompose_objectives(objectives)
        
        # 分析任务依赖关系
        dependencies = await self._analyze_dependencies(tasks)
        
        # 生成时间线
        timeline = await self._generate_timeline(tasks, dependencies, constraints)
        
        # 分配资源
        resources = await self._allocate_resources(tasks, constraints)
        
        plan = WorkPlan(
            id=plan_id,
            name=f"Work Plan {len(self.active_plans) + 1}",
            description="Auto-generated work plan",
            objectives=objectives,
            tasks=tasks,
            dependencies=dependencies,
            timeline=timeline,
            resources=resources,
            constraints=constraints,
            success_criteria=await self._define_success_criteria(objectives)
        )
        
        self.active_plans[plan_id] = plan
        return plan
    
    async def _decompose_objectives(self, objectives: List[str]) -> List[str]:
        """分解目标为任务"""
        tasks = []
        
        for i, objective in enumerate(objectives):
            # 简化的目标分解逻辑
            if "analyze" in objective.lower():
                tasks.extend([
                    f"data_collection_{i}",
                    f"data_analysis_{i}",
                    f"result_synthesis_{i}"
                ])
            elif "create" in objective.lower():
                tasks.extend([
                    f"planning_{i}",
                    f"implementation_{i}",
                    f"validation_{i}"
                ])
            else:
                tasks.append(f"task_{i}")
        
        return tasks
    
    async def _analyze_dependencies(self, tasks: List[str]) -> Dict[str, List[str]]:
        """分析任务依赖关系"""
        dependencies = {}
        
        for task in tasks:
            deps = []
            
            # 基于任务名称的简单依赖分析
            if "analysis" in task:
                collection_task = task.replace("analysis", "collection")
                if collection_task in tasks:
                    deps.append(collection_task)
            
            elif "synthesis" in task:
                analysis_task = task.replace("synthesis", "analysis")
                if analysis_task in tasks:
                    deps.append(analysis_task)
            
            elif "implementation" in task:
                planning_task = task.replace("implementation", "planning")
                if planning_task in tasks:
                    deps.append(planning_task)
            
            elif "validation" in task:
                impl_task = task.replace("validation", "implementation")
                if impl_task in tasks:
                    deps.append(impl_task)
            
            dependencies[task] = deps
        
        return dependencies
    
    async def _generate_timeline(self, tasks: List[str], dependencies: Dict[str, List[str]], 
                               constraints: Dict[str, Any]) -> Dict[str, datetime]:
        """生成时间线"""
        timeline = {}
        start_time = datetime.utcnow()
        
        # 使用拓扑排序确定任务顺序
        graph = nx.DiGraph()
        for task in tasks:
            graph.add_node(task)
        
        for task, deps in dependencies.items():
            for dep in deps:
                graph.add_edge(dep, task)
        
        try:
            ordered_tasks = list(nx.topological_sort(graph))
        except nx.NetworkXError:
            # 如果有循环依赖，使用原始顺序
            ordered_tasks = tasks
        
        current_time = start_time
        for task in ordered_tasks:
            timeline[task] = current_time
            # 假设每个任务需要1小时
            current_time += timedelta(hours=1)
        
        return timeline
    
    async def _allocate_resources(self, tasks: List[str], constraints: Dict[str, Any]) -> Dict[str, Any]:
        """分配资源"""
        return {
            "cpu_cores": min(len(tasks), constraints.get("max_cpu_cores", 4)),
            "memory_gb": min(len(tasks) * 2, constraints.get("max_memory_gb", 16)),
            "storage_gb": constraints.get("storage_gb", 100)
        }
    
    async def _define_success_criteria(self, objectives: List[str]) -> List[str]:
        """定义成功标准"""
        return [
            "All tasks completed successfully",
            "All objectives achieved",
            "No critical errors occurred",
            "Resource usage within limits"
        ]


class TaskLevelReactor:
    """任务级响应器"""
    
    def __init__(self):
        self.active_tasks: Dict[str, TaskPlan] = {}
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.executors: Dict[TaskType, ITaskExecutor] = {}
    
    def register_executor(self, task_type: TaskType, executor: ITaskExecutor) -> None:
        """注册任务执行器"""
        self.executors[task_type] = executor
    
    async def react_to_task(self, task_plan: TaskPlan, context: ThinkingContext) -> Dict[str, Any]:
        """响应任务"""
        # 验证任务
        if not await self._validate_task(task_plan):
            raise ValidationError(f"Invalid task plan: {task_plan.id}")
        
        # 选择执行器
        executor = self.executors.get(task_plan.type)
        if not executor:
            raise ResourceError(f"No executor found for task type: {task_plan.type}")
        
        # 执行任务
        start_time = datetime.utcnow()
        try:
            result = await executor.execute(task_plan, context)
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # 更新指标
            if hasattr(executor, 'update_metrics'):
                executor.update_metrics(execution_time, True)
            
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time,
                "task_id": task_plan.id
            }
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            if hasattr(executor, 'update_metrics'):
                executor.update_metrics(execution_time, False)
            
            raise BusinessError(f"Task execution failed: {str(e)}")
    
    async def _validate_task(self, task_plan: TaskPlan) -> bool:
        """验证任务计划"""
        executor = self.executors.get(task_plan.type)
        if executor:
            return await executor.validate(task_plan)
        return False


class DependencyAnalyzer:
    """依赖关系分析器"""
    
    def __init__(self):
        self.dependency_graph = nx.DiGraph()
    
    def add_task(self, task_id: str, dependencies: List[str]) -> None:
        """添加任务及其依赖"""
        self.dependency_graph.add_node(task_id)
        for dep in dependencies:
            self.dependency_graph.add_edge(dep, task_id)
    
    def get_execution_order(self) -> List[str]:
        """获取执行顺序"""
        try:
            return list(nx.topological_sort(self.dependency_graph))
        except nx.NetworkXError:
            # 处理循环依赖
            return self._resolve_cycles()
    
    def _resolve_cycles(self) -> List[str]:
        """解决循环依赖"""
        # 找到强连通分量
        sccs = list(nx.strongly_connected_components(self.dependency_graph))
        
        # 为每个强连通分量创建一个虚拟节点
        condensed_graph = nx.condensation(self.dependency_graph, sccs)
        
        # 获取拓扑排序
        condensed_order = list(nx.topological_sort(condensed_graph))
        
        # 展开为原始节点
        execution_order = []
        for scc_id in condensed_order:
            scc_nodes = list(sccs[scc_id])
            execution_order.extend(scc_nodes)
        
        return execution_order
    
    def get_parallel_groups(self) -> List[List[str]]:
        """获取可并行执行的任务组"""
        execution_order = self.get_execution_order()
        parallel_groups = []
        
        processed = set()
        for task in execution_order:
            if task in processed:
                continue
            
            # 找到所有可以与当前任务并行执行的任务
            parallel_group = [task]
            processed.add(task)
            
            for other_task in execution_order:
                if other_task in processed:
                    continue
                
                # 检查是否可以并行执行
                if self._can_run_parallel(task, other_task):
                    parallel_group.append(other_task)
                    processed.add(other_task)
            
            parallel_groups.append(parallel_group)
        
        return parallel_groups
    
    def _can_run_parallel(self, task1: str, task2: str) -> bool:
        """检查两个任务是否可以并行执行"""
        # 检查是否有直接或间接的依赖关系
        return not (nx.has_path(self.dependency_graph, task1, task2) or 
                   nx.has_path(self.dependency_graph, task2, task1))


class ParallelExecutor:
    """并行执行器"""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.thread_pool = ThreadPoolExecutor(max_workers=max_workers)
        self.semaphore = asyncio.Semaphore(max_workers)
    
    async def execute_parallel(self, tasks: List[Callable], max_concurrent: Optional[int] = None) -> List[Any]:
        """并行执行任务"""
        if max_concurrent:
            semaphore = asyncio.Semaphore(max_concurrent)
        else:
            semaphore = self.semaphore
        
        async def execute_with_semaphore(task):
            async with semaphore:
                if asyncio.iscoroutinefunction(task):
                    return await task()
                else:
                    loop = asyncio.get_event_loop()
                    return await loop.run_in_executor(self.thread_pool, task)
        
        return await asyncio.gather(*[execute_with_semaphore(task) for task in tasks])
    
    async def execute_batches(self, task_batches: List[List[Callable]]) -> List[List[Any]]:
        """批量执行任务组"""
        results = []
        
        for batch in task_batches:
            batch_results = await self.execute_parallel(batch)
            results.append(batch_results)
        
        return results


@dataclass
class TaskRequest:
    """任务请求数据"""
    operation: TaskOperation
    task_id: Optional[str] = None
    work_plan: Optional[WorkPlan] = None
    task_plan: Optional[TaskPlan] = None
    thinking_context: Optional[ThinkingContext] = None
    scheduling_strategy: Optional[SchedulingStrategy] = None
    execution_mode: Optional[ExecutionMode] = None
    parameters: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class TaskResponse:
    """任务响应数据"""
    success: bool
    task_id: Optional[str] = None
    work_plan_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    execution_order: Optional[List[str]] = None
    parallel_groups: Optional[List[List[str]]] = None
    metrics: Optional[TaskMetrics] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TaskService(BaseService[TaskRequest, TaskResponse]):
    """任务调度服务"""
    
    def __init__(self, db_session: AsyncSession, redis_manager: RedisManager):
        super().__init__("task_service", "1.0.0")
        self.db = db_session
        self.redis = redis_manager
        self.settings = get_settings()
        
        # 初始化组件
        self.work_planner = WorkLevelPlanner()
        self.task_reactor = TaskLevelReactor()
        self.dependency_analyzer = DependencyAnalyzer()
        self.parallel_executor = ParallelExecutor(max_workers=self.settings.max_workers)
        
        # 注册默认执行器
        self._register_default_executors()
    
    async def _execute_core(self, request: TaskRequest, context: ServiceContext) -> ServiceResult[TaskResponse]:
        """核心执行逻辑"""
        try:
            if request.operation == TaskOperation.CREATE:
                return await self._create_work_plan(request, context)
            elif request.operation == TaskOperation.SCHEDULE:
                return await self._schedule_tasks(request, context)
            elif request.operation == TaskOperation.EXECUTE:
                return await self._execute_task(request, context)
            elif request.operation == TaskOperation.ANALYZE:
                return await self._analyze_dependencies(request, context)
            elif request.operation == TaskOperation.OPTIMIZE:
                return await self._optimize_execution(request, context)
            else:
                raise ValidationError(f"Unsupported operation: {request.operation}")
                
        except Exception as e:
            self._logger.error(f"Task service error: {e}")
            raise BusinessError(f"Task operation failed: {str(e)}")
    
    @service_method(timeout=60.0, retries=2)
    async def _create_work_plan(self, request: TaskRequest, context: ServiceContext) -> ServiceResult[TaskResponse]:
        """创建工作计划"""
        if not request.parameters or 'objectives' not in request.parameters:
            raise ValidationError("Objectives are required for work plan creation")
        
        objectives = request.parameters['objectives']
        constraints = request.parameters.get('constraints', {})
        
        # 创建工作计划
        work_plan = await self.work_planner.create_work_plan(objectives, constraints)
        
        # 分析依赖关系
        for task_id, deps in work_plan.dependencies.items():
            self.dependency_analyzer.add_task(task_id, deps)
        
        # 获取执行顺序和并行组
        execution_order = self.dependency_analyzer.get_execution_order()
        parallel_groups = self.dependency_analyzer.get_parallel_groups()
        
        response = TaskResponse(
            success=True,
            work_plan_id=work_plan.id,
            execution_order=execution_order,
            parallel_groups=parallel_groups,
            message="Work plan created successfully",
            metadata={
                "total_tasks": len(work_plan.tasks),
                "estimated_duration": len(work_plan.tasks) * 60,  # 分钟
                "resource_requirements": work_plan.resources
            }
        )
        
        return ServiceResult.success_result(response)
    
    def _register_default_executors(self) -> None:
        """注册默认任务执行器"""
        
        class DefaultExecutor(BaseTaskExecutor):
            def __init__(self, task_type: TaskType):
                super().__init__(f"default_{task_type.value}")
                self.task_type = task_type
            
            async def execute(self, task: TaskPlan, context: ThinkingContext) -> Dict[str, Any]:
                # 模拟任务执行
                await asyncio.sleep(0.1)  # 模拟处理时间
                
                return {
                    "task_id": task.id,
                    "task_type": self.task_type.value,
                    "status": "completed",
                    "output": f"Task {task.name} completed successfully",
                    "context_level": context.level.value,
                    "context_mode": context.mode.value
                }
        
        # 注册各种类型的执行器
        for task_type in TaskType:
            executor = DefaultExecutor(task_type)
            self.task_reactor.register_executor(task_type, executor)
    
    async def validate(self, request: TaskRequest, context: Optional[ServiceContext] = None) -> bool:
        """验证请求"""
        if not isinstance(request, TaskRequest):
            return False
        
        if not request.operation:
            return False
        
        # 根据操作类型验证必要字段
        if request.operation == TaskOperation.CREATE:
            return (request.parameters and 
                   'objectives' in request.parameters and 
                   isinstance(request.parameters['objectives'], list))
        elif request.operation == TaskOperation.EXECUTE:
            return request.task_plan is not None
        elif request.operation == TaskOperation.SCHEDULE:
            return request.work_plan is not None
        
        return True
    
    async def get_task_statistics(self) -> Dict[str, Any]:
        """获取任务统计信息"""
        # 从数据库获取任务统计
        total_tasks_result = await self.db.execute(
            select(Task).where(Task.created_at >= datetime.utcnow() - timedelta(days=30))
        )
        total_tasks = len(total_tasks_result.scalars().all())
        
        completed_tasks_result = await self.db.execute(
            select(Task).where(
                and_(
                    Task.status == TaskStatus.COMPLETED,
                    Task.created_at >= datetime.utcnow() - timedelta(days=30)
                )
            )
        )
        completed_tasks = len(completed_tasks_result.scalars().all())
        
        return {
            "total_tasks_30_days": total_tasks,
            "completed_tasks_30_days": completed_tasks,
            "completion_rate": completed_tasks / max(total_tasks, 1),
            "active_work_plans": len(self.work_planner.active_plans),
            "active_tasks": len(self.task_reactor.active_tasks),
            "registered_executors": len(self.task_reactor.executors)
        }
    
    async def health_check(self) -> bool:
        """健康检查"""
        try:
            # 检查数据库连接
            await self.db.execute(select(1))
            
            # 检查Redis连接
            await self.redis.ping()
            
            # 检查组件状态
            if not self.task_reactor.executors:
                self._logger.warning("No task executors registered")
            
            return True
        except Exception as e:
            self._logger.error(f"Health check failed: {e}")
            return False