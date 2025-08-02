#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent工作流编排服务

本模块实现了ZK-Agent系统的工作流编排服务，支持复杂工作流的
设计、执行、监控和优化。

核心功能：
- 工作流设计和建模
- 工作流执行引擎
- 节点和边的管理
- 条件分支和循环
- 并行执行和同步
- 工作流状态监控
- 错误处理和恢复
- 工作流优化和分析

工作流类型：
- 顺序工作流：按顺序执行的工作流
- 并行工作流：支持并行分支的工作流
- 条件工作流：包含条件分支的工作流
- 循环工作流：包含循环结构的工作流
- 混合工作流：组合多种模式的复杂工作流

设计模式：
- 状态机模式：工作流状态管理
- 策略模式：不同的执行策略
- 观察者模式：工作流状态变化通知
- 命令模式：工作流操作命令
- 建造者模式：工作流构建

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
    Workflow, WorkflowExecution, WorkflowNode, WorkflowEdge,
    WorkflowStatus, NodeType
)
from app.core.database import get_db
from app.core.redis import RedisManager
from app.core.config import get_settings


class WorkflowType(Enum):
    """工作流类型枚举"""
    SEQUENTIAL = "sequential"      # 顺序工作流
    PARALLEL = "parallel"          # 并行工作流
    CONDITIONAL = "conditional"    # 条件工作流
    LOOP = "loop"                  # 循环工作流
    HYBRID = "hybrid"              # 混合工作流
    DAG = "dag"                    # 有向无环图工作流


class ExecutionStrategy(Enum):
    """执行策略枚举"""
    EAGER = "eager"                # 急切执行
    LAZY = "lazy"                  # 懒惰执行
    OPTIMISTIC = "optimistic"      # 乐观执行
    PESSIMISTIC = "pessimistic"    # 悲观执行
    ADAPTIVE = "adaptive"          # 自适应执行


class NodeStatus(Enum):
    """节点状态枚举"""
    PENDING = "pending"            # 等待中
    RUNNING = "running"            # 运行中
    COMPLETED = "completed"        # 已完成
    FAILED = "failed"              # 失败
    SKIPPED = "skipped"            # 跳过
    CANCELLED = "cancelled"        # 取消


class EdgeType(Enum):
    """边类型枚举"""
    SEQUENCE = "sequence"          # 顺序边
    CONDITION = "condition"        # 条件边
    PARALLEL = "parallel"          # 并行边
    LOOP = "loop"                  # 循环边
    ERROR = "error"                # 错误处理边


class WorkflowOperation(Enum):
    """工作流操作类型"""
    CREATE = "create"
    EXECUTE = "execute"
    PAUSE = "pause"
    RESUME = "resume"
    STOP = "stop"
    VALIDATE = "validate"
    OPTIMIZE = "optimize"
    ANALYZE = "analyze"


@dataclass
class WorkflowMetrics:
    """工作流性能指标"""
    total_execution_time: float = 0.0
    node_execution_times: Dict[str, float] = field(default_factory=dict)
    success_rate: float = 1.0
    throughput: float = 0.0
    resource_utilization: Dict[str, float] = field(default_factory=dict)
    error_count: int = 0
    retry_count: int = 0
    parallel_efficiency: float = 1.0


@dataclass
class NodeDefinition:
    """节点定义"""
    id: str
    name: str
    type: NodeType
    description: str
    inputs: Dict[str, Any] = field(default_factory=dict)
    outputs: Dict[str, Any] = field(default_factory=dict)
    parameters: Dict[str, Any] = field(default_factory=dict)
    conditions: Dict[str, Any] = field(default_factory=dict)
    retry_policy: Dict[str, Any] = field(default_factory=dict)
    timeout: Optional[timedelta] = None
    resources: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EdgeDefinition:
    """边定义"""
    id: str
    source_node_id: str
    target_node_id: str
    type: EdgeType
    condition: Optional[str] = None
    weight: float = 1.0
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowDefinition:
    """工作流定义"""
    id: str
    name: str
    description: str
    type: WorkflowType
    nodes: List[NodeDefinition]
    edges: List[EdgeDefinition]
    global_parameters: Dict[str, Any] = field(default_factory=dict)
    execution_strategy: ExecutionStrategy = ExecutionStrategy.EAGER
    timeout: Optional[timedelta] = None
    retry_policy: Dict[str, Any] = field(default_factory=dict)


class IWorkflowNode(ABC):
    """工作流节点接口"""
    
    @property
    @abstractmethod
    def node_id(self) -> str:
        """节点ID"""
        pass
    
    @property
    @abstractmethod
    def node_type(self) -> NodeType:
        """节点类型"""
        pass
    
    @abstractmethod
    async def execute(self, inputs: Dict[str, Any], context: ServiceContext) -> Dict[str, Any]:
        """执行节点"""
        pass
    
    @abstractmethod
    async def validate(self, inputs: Dict[str, Any]) -> bool:
        """验证输入"""
        pass
    
    async def can_execute(self, workflow_state: Dict[str, Any]) -> bool:
        """检查是否可以执行"""
        return True


class BaseWorkflowNode(IWorkflowNode):
    """基础工作流节点"""
    
    def __init__(self, definition: NodeDefinition):
        self.definition = definition
        self.status = NodeStatus.PENDING
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
    
    @property
    def node_id(self) -> str:
        return self.definition.id
    
    @property
    def node_type(self) -> NodeType:
        return self.definition.type
    
    async def validate(self, inputs: Dict[str, Any]) -> bool:
        """默认验证逻辑"""
        required_inputs = self.definition.inputs.get('required', [])
        return all(key in inputs for key in required_inputs)
    
    def get_execution_time(self) -> Optional[float]:
        """获取执行时间"""
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None


class TaskNode(BaseWorkflowNode):
    """任务节点"""
    
    def __init__(self, definition: NodeDefinition, task_executor: Callable):
        super().__init__(definition)
        self.task_executor = task_executor
    
    async def execute(self, inputs: Dict[str, Any], context: ServiceContext) -> Dict[str, Any]:
        """执行任务节点"""
        self.status = NodeStatus.RUNNING
        self.start_time = datetime.utcnow()
        
        try:
            # 合并输入和参数
            execution_inputs = {**inputs, **self.definition.parameters}
            
            # 执行任务
            if asyncio.iscoroutinefunction(self.task_executor):
                result = await self.task_executor(execution_inputs, context)
            else:
                result = self.task_executor(execution_inputs, context)
            
            self.result = result
            self.status = NodeStatus.COMPLETED
            self.end_time = datetime.utcnow()
            
            return result
            
        except Exception as e:
            self.error = str(e)
            self.status = NodeStatus.FAILED
            self.end_time = datetime.utcnow()
            raise BusinessError(f"Task node {self.node_id} execution failed: {str(e)}")


class ConditionNode(BaseWorkflowNode):
    """条件节点"""
    
    async def execute(self, inputs: Dict[str, Any], context: ServiceContext) -> Dict[str, Any]:
        """执行条件节点"""
        self.status = NodeStatus.RUNNING
        self.start_time = datetime.utcnow()
        
        try:
            condition_expr = self.definition.conditions.get('expression')
            if not condition_expr:
                raise ValidationError("Condition expression is required")
            
            # 评估条件表达式
            result = self._evaluate_condition(condition_expr, inputs)
            
            self.result = {"condition_result": result}
            self.status = NodeStatus.COMPLETED
            self.end_time = datetime.utcnow()
            
            return self.result
            
        except Exception as e:
            self.error = str(e)
            self.status = NodeStatus.FAILED
            self.end_time = datetime.utcnow()
            raise BusinessError(f"Condition node {self.node_id} execution failed: {str(e)}")
    
    def _evaluate_condition(self, expression: str, inputs: Dict[str, Any]) -> bool:
        """评估条件表达式"""
        # 简化的条件评估逻辑
        # 实际实现中应该使用更安全的表达式评估器
        try:
            # 替换变量
            for key, value in inputs.items():
                expression = expression.replace(f"${key}", str(value))
            
            # 评估表达式
            return eval(expression)
        except Exception:
            return False


class ParallelNode(BaseWorkflowNode):
    """并行节点"""
    
    def __init__(self, definition: NodeDefinition, child_nodes: List[IWorkflowNode]):
        super().__init__(definition)
        self.child_nodes = child_nodes
    
    async def execute(self, inputs: Dict[str, Any], context: ServiceContext) -> Dict[str, Any]:
        """执行并行节点"""
        self.status = NodeStatus.RUNNING
        self.start_time = datetime.utcnow()
        
        try:
            # 并行执行所有子节点
            tasks = []
            for child_node in self.child_nodes:
                task = asyncio.create_task(child_node.execute(inputs, context))
                tasks.append(task)
            
            # 等待所有任务完成
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 处理结果
            combined_result = {}
            errors = []
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    errors.append(f"Child node {i}: {str(result)}")
                else:
                    combined_result[f"child_{i}"] = result
            
            if errors:
                self.error = "; ".join(errors)
                self.status = NodeStatus.FAILED
            else:
                self.status = NodeStatus.COMPLETED
            
            self.result = combined_result
            self.end_time = datetime.utcnow()
            
            return self.result
            
        except Exception as e:
            self.error = str(e)
            self.status = NodeStatus.FAILED
            self.end_time = datetime.utcnow()
            raise BusinessError(f"Parallel node {self.node_id} execution failed: {str(e)}")


class WorkflowEngine:
    """工作流执行引擎"""
    
    def __init__(self):
        self.active_workflows: Dict[str, 'WorkflowInstance'] = {}
        self.node_registry: Dict[NodeType, type] = {
            NodeType.TASK: TaskNode,
            NodeType.CONDITION: ConditionNode,
            NodeType.PARALLEL: ParallelNode
        }
    
    def register_node_type(self, node_type: NodeType, node_class: type) -> None:
        """注册节点类型"""
        self.node_registry[node_type] = node_class
    
    async def create_workflow_instance(self, definition: WorkflowDefinition) -> 'WorkflowInstance':
        """创建工作流实例"""
        instance = WorkflowInstance(definition, self)
        await instance.initialize()
        self.active_workflows[instance.instance_id] = instance
        return instance
    
    async def execute_workflow(self, instance_id: str, inputs: Dict[str, Any], 
                             context: ServiceContext) -> Dict[str, Any]:
        """执行工作流"""
        instance = self.active_workflows.get(instance_id)
        if not instance:
            raise ResourceError(f"Workflow instance {instance_id} not found")
        
        return await instance.execute(inputs, context)
    
    def get_workflow_status(self, instance_id: str) -> Optional[WorkflowStatus]:
        """获取工作流状态"""
        instance = self.active_workflows.get(instance_id)
        return instance.status if instance else None


class WorkflowInstance:
    """工作流实例"""
    
    def __init__(self, definition: WorkflowDefinition, engine: WorkflowEngine):
        self.definition = definition
        self.engine = engine
        self.instance_id = str(uuid.uuid4())
        self.status = WorkflowStatus.PENDING
        self.nodes: Dict[str, IWorkflowNode] = {}
        self.execution_graph = nx.DiGraph()
        self.metrics = WorkflowMetrics()
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.current_inputs: Dict[str, Any] = {}
        self.global_state: Dict[str, Any] = {}
    
    async def initialize(self) -> None:
        """初始化工作流实例"""
        # 创建节点实例
        for node_def in self.definition.nodes:
            node_class = self.engine.node_registry.get(node_def.type)
            if not node_class:
                raise ValidationError(f"Unknown node type: {node_def.type}")
            
            if node_def.type == NodeType.TASK:
                # 任务节点需要任务执行器
                node = node_class(node_def, self._default_task_executor)
            else:
                node = node_class(node_def)
            
            self.nodes[node_def.id] = node
            self.execution_graph.add_node(node_def.id)
        
        # 创建边
        for edge_def in self.definition.edges:
            self.execution_graph.add_edge(
                edge_def.source_node_id,
                edge_def.target_node_id,
                edge_type=edge_def.type,
                condition=edge_def.condition,
                weight=edge_def.weight
            )
    
    async def execute(self, inputs: Dict[str, Any], context: ServiceContext) -> Dict[str, Any]:
        """执行工作流"""
        self.status = WorkflowStatus.RUNNING
        self.start_time = datetime.utcnow()
        self.current_inputs = inputs
        
        try:
            if self.definition.type == WorkflowType.SEQUENTIAL:
                result = await self._execute_sequential(context)
            elif self.definition.type == WorkflowType.PARALLEL:
                result = await self._execute_parallel(context)
            elif self.definition.type == WorkflowType.DAG:
                result = await self._execute_dag(context)
            else:
                result = await self._execute_hybrid(context)
            
            self.status = WorkflowStatus.COMPLETED
            self.end_time = datetime.utcnow()
            
            # 更新指标
            self._update_metrics()
            
            return result
            
        except Exception as e:
            self.status = WorkflowStatus.FAILED
            self.end_time = datetime.utcnow()
            self._update_metrics()
            raise BusinessError(f"Workflow execution failed: {str(e)}")
    
    async def _execute_sequential(self, context: ServiceContext) -> Dict[str, Any]:
        """顺序执行工作流"""
        current_data = self.current_inputs.copy()
        results = {}
        
        # 获取拓扑排序的节点顺序
        try:
            execution_order = list(nx.topological_sort(self.execution_graph))
        except nx.NetworkXError:
            raise ValidationError("Workflow contains cycles")
        
        for node_id in execution_order:
            node = self.nodes[node_id]
            
            # 检查是否可以执行
            if not await node.can_execute(self.global_state):
                continue
            
            # 执行节点
            node_result = await node.execute(current_data, context)
            results[node_id] = node_result
            
            # 更新全局状态
            self.global_state.update(node_result)
            current_data.update(node_result)
        
        return results
    
    async def _execute_parallel(self, context: ServiceContext) -> Dict[str, Any]:
        """并行执行工作流"""
        # 找到所有入度为0的节点（起始节点）
        start_nodes = [node_id for node_id in self.execution_graph.nodes() 
                      if self.execution_graph.in_degree(node_id) == 0]
        
        if not start_nodes:
            raise ValidationError("No start nodes found in workflow")
        
        # 并行执行起始节点
        tasks = []
        for node_id in start_nodes:
            node = self.nodes[node_id]
            task = asyncio.create_task(node.execute(self.current_inputs, context))
            tasks.append((node_id, task))
        
        results = {}
        for node_id, task in tasks:
            try:
                result = await task
                results[node_id] = result
            except Exception as e:
                results[node_id] = {"error": str(e)}
        
        return results
    
    async def _execute_dag(self, context: ServiceContext) -> Dict[str, Any]:
        """执行DAG工作流"""
        results = {}
        completed_nodes = set()
        running_tasks = {}
        
        while len(completed_nodes) < len(self.nodes):
            # 找到可以执行的节点
            ready_nodes = []
            for node_id in self.nodes:
                if node_id in completed_nodes or node_id in running_tasks:
                    continue
                
                # 检查所有前驱节点是否已完成
                predecessors = list(self.execution_graph.predecessors(node_id))
                if all(pred in completed_nodes for pred in predecessors):
                    ready_nodes.append(node_id)
            
            # 启动准备好的节点
            for node_id in ready_nodes:
                node = self.nodes[node_id]
                task = asyncio.create_task(node.execute(self.current_inputs, context))
                running_tasks[node_id] = task
            
            # 等待至少一个任务完成
            if running_tasks:
                done, pending = await asyncio.wait(
                    running_tasks.values(),
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                # 处理完成的任务
                for task in done:
                    for node_id, node_task in list(running_tasks.items()):
                        if node_task == task:
                            try:
                                result = await task
                                results[node_id] = result
                                self.global_state.update(result)
                            except Exception as e:
                                results[node_id] = {"error": str(e)}
                            
                            completed_nodes.add(node_id)
                            del running_tasks[node_id]
                            break
            else:
                # 没有可执行的节点，可能存在问题
                break
        
        return results
    
    async def _execute_hybrid(self, context: ServiceContext) -> Dict[str, Any]:
        """执行混合工作流"""
        # 混合工作流的执行逻辑
        # 这里可以根据具体需求实现复杂的执行策略
        return await self._execute_dag(context)
    
    def _update_metrics(self) -> None:
        """更新性能指标"""
        if self.start_time and self.end_time:
            self.metrics.total_execution_time = (self.end_time - self.start_time).total_seconds()
        
        # 更新节点执行时间
        for node_id, node in self.nodes.items():
            if hasattr(node, 'get_execution_time'):
                exec_time = node.get_execution_time()
                if exec_time:
                    self.metrics.node_execution_times[node_id] = exec_time
        
        # 计算成功率
        total_nodes = len(self.nodes)
        successful_nodes = sum(1 for node in self.nodes.values() 
                             if hasattr(node, 'status') and node.status == NodeStatus.COMPLETED)
        self.metrics.success_rate = successful_nodes / max(total_nodes, 1)
    
    async def _default_task_executor(self, inputs: Dict[str, Any], context: ServiceContext) -> Dict[str, Any]:
        """默认任务执行器"""
        # 模拟任务执行
        await asyncio.sleep(0.1)
        return {
            "status": "completed",
            "output": f"Task completed with inputs: {inputs}",
            "timestamp": datetime.utcnow().isoformat()
        }


@dataclass
class WorkflowRequest:
    """工作流请求数据"""
    operation: WorkflowOperation
    workflow_id: Optional[str] = None
    workflow_definition: Optional[WorkflowDefinition] = None
    inputs: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class WorkflowResponse:
    """工作流响应数据"""
    success: bool
    workflow_id: Optional[str] = None
    instance_id: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    result: Optional[Dict[str, Any]] = None
    metrics: Optional[WorkflowMetrics] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkflowService(BaseService[WorkflowRequest, WorkflowResponse]):
    """工作流编排服务"""
    
    def __init__(self, db_session: AsyncSession, redis_manager: RedisManager):
        super().__init__("workflow_service", "1.0.0")
        self.db = db_session
        self.redis = redis_manager
        self.settings = get_settings()
        
        # 初始化工作流引擎
        self.workflow_engine = WorkflowEngine()
        
        # 工作流定义缓存
        self.workflow_definitions: Dict[str, WorkflowDefinition] = {}
    
    async def _execute_core(self, request: WorkflowRequest, context: ServiceContext) -> ServiceResult[WorkflowResponse]:
        """核心执行逻辑"""
        try:
            if request.operation == WorkflowOperation.CREATE:
                return await self._create_workflow(request, context)
            elif request.operation == WorkflowOperation.EXECUTE:
                return await self._execute_workflow(request, context)
            elif request.operation == WorkflowOperation.VALIDATE:
                return await self._validate_workflow(request, context)
            elif request.operation == WorkflowOperation.ANALYZE:
                return await self._analyze_workflow(request, context)
            else:
                raise ValidationError(f"Unsupported operation: {request.operation}")
                
        except Exception as e:
            self._logger.error(f"Workflow service error: {e}")
            raise BusinessError(f"Workflow operation failed: {str(e)}")
    
    @service_method(timeout=120.0, retries=1)
    async def _execute_workflow(self, request: WorkflowRequest, context: ServiceContext) -> ServiceResult[WorkflowResponse]:
        """执行工作流"""
        if not request.workflow_id or not request.inputs:
            raise ValidationError("Workflow ID and inputs are required")
        
        # 获取工作流定义
        workflow_def = self.workflow_definitions.get(request.workflow_id)
        if not workflow_def:
            raise ResourceError(f"Workflow {request.workflow_id} not found")
        
        # 创建工作流实例
        instance = await self.workflow_engine.create_workflow_instance(workflow_def)
        
        # 执行工作流
        result = await instance.execute(request.inputs, context)
        
        response = WorkflowResponse(
            success=True,
            workflow_id=request.workflow_id,
            instance_id=instance.instance_id,
            status=instance.status,
            result=result,
            metrics=instance.metrics,
            message="Workflow executed successfully"
        )
        
        return ServiceResult.success_result(response)
    
    async def create_sample_workflow(self) -> WorkflowDefinition:
        """创建示例工作流"""
        # 创建节点定义
        nodes = [
            NodeDefinition(
                id="start",
                name="Start Node",
                type=NodeType.TASK,
                description="Starting task",
                inputs={"required": []},
                outputs={"status": "string"}
            ),
            NodeDefinition(
                id="process",
                name="Process Node",
                type=NodeType.TASK,
                description="Processing task",
                inputs={"required": ["data"]},
                outputs={"result": "object"}
            ),
            NodeDefinition(
                id="condition",
                name="Condition Node",
                type=NodeType.CONDITION,
                description="Conditional check",
                conditions={"expression": "$result.success == True"}
            ),
            NodeDefinition(
                id="end",
                name="End Node",
                type=NodeType.TASK,
                description="Ending task",
                inputs={"required": []},
                outputs={"final_status": "string"}
            )
        ]
        
        # 创建边定义
        edges = [
            EdgeDefinition(
                id="start_to_process",
                source_node_id="start",
                target_node_id="process",
                type=EdgeType.SEQUENCE
            ),
            EdgeDefinition(
                id="process_to_condition",
                source_node_id="process",
                target_node_id="condition",
                type=EdgeType.SEQUENCE
            ),
            EdgeDefinition(
                id="condition_to_end",
                source_node_id="condition",
                target_node_id="end",
                type=EdgeType.CONDITION,
                condition="result == True"
            )
        ]
        
        # 创建工作流定义
        workflow_def = WorkflowDefinition(
            id="sample_workflow",
            name="Sample Workflow",
            description="A sample workflow for demonstration",
            type=WorkflowType.DAG,
            nodes=nodes,
            edges=edges,
            execution_strategy=ExecutionStrategy.EAGER
        )
        
        self.workflow_definitions[workflow_def.id] = workflow_def
        return workflow_def
    
    async def validate(self, request: WorkflowRequest, context: Optional[ServiceContext] = None) -> bool:
        """验证请求"""
        if not isinstance(request, WorkflowRequest):
            return False
        
        if not request.operation:
            return False
        
        # 根据操作类型验证必要字段
        if request.operation == WorkflowOperation.EXECUTE:
            return all([request.workflow_id, request.inputs])
        elif request.operation == WorkflowOperation.CREATE:
            return request.workflow_definition is not None
        
        return True
    
    async def get_workflow_statistics(self) -> Dict[str, Any]:
        """获取工作流统计信息"""
        return {
            "total_workflows": len(self.workflow_definitions),
            "active_instances": len(self.workflow_engine.active_workflows),
            "registered_node_types": len(self.workflow_engine.node_registry),
            "workflow_types": list(set(wf.type.value for wf in self.workflow_definitions.values()))
        }
    
    async def health_check(self) -> bool:
        """健康检查"""
        try:
            # 检查数据库连接
            await self.db.execute(select(1))
            
            # 检查Redis连接
            await self.redis.ping()
            
            # 检查工作流引擎
            if not self.workflow_engine.node_registry:
                self._logger.warning("No node types registered")
            
            return True
        except Exception as e:
            self._logger.error(f"Health check failed: {e}")
            return False