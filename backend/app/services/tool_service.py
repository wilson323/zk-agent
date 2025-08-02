#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent工具管理服务

本模块实现了ZK-Agent系统的工具管理服务，支持工具演化、
原子工具管理、工具组合、工具银行等核心功能。

核心功能：
- 工具注册、发现、管理
- 工具演化和自动拆解重组
- 原子工具（Atom Tools）管理
- 工具银行（Tool Bank）
- 工具组合和编排
- 工具性能监控和优化
- 工具版本管理

工具类型：
- 内置工具：系统预定义工具
- 自定义工具：用户定义工具
- 组合工具：多个工具的组合
- 演化工具：通过演化算法优化的工具
- 原子工具：最小粒度的功能单元

设计模式：
- 策略模式：不同工具的执行策略
- 工厂模式：工具创建和实例化
- 装饰器模式：工具功能增强
- 组合模式：工具组合和编排
- 观察者模式：工具状态变化通知

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from typing import Dict, List, Optional, Any, Union, Callable, Type
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import asyncio
import json
import uuid
import inspect
import importlib
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.orm import selectinload
import numpy as np
from pydantic import BaseModel, Field

from app.services.base import (
    BaseService, ServiceContext, ServiceResult, ServiceError,
    BusinessError, ValidationError, ResourceError, service_method
)
from app.models.agent import AgentTool
from app.core.database import get_db
from app.core.redis import RedisManager
from app.core.config import get_settings


class ToolType(Enum):
    """工具类型枚举"""
    BUILTIN = "builtin"        # 内置工具
    CUSTOM = "custom"          # 自定义工具
    COMPOSITE = "composite"    # 组合工具
    EVOLVED = "evolved"        # 演化工具
    ATOMIC = "atomic"          # 原子工具
    EXTERNAL = "external"      # 外部工具


class ToolCategory(Enum):
    """工具分类枚举"""
    SEARCH = "search"          # 搜索工具
    BROWSE = "browse"          # 浏览工具
    PARSE = "parse"            # 解析工具
    GENERATE = "generate"      # 生成工具
    ANALYZE = "analyze"        # 分析工具
    TRANSFORM = "transform"    # 转换工具
    COMMUNICATE = "communicate" # 通信工具
    STORAGE = "storage"        # 存储工具
    UTILITY = "utility"        # 实用工具


class ToolStatus(Enum):
    """工具状态枚举"""
    AVAILABLE = "available"    # 可用
    UNAVAILABLE = "unavailable" # 不可用
    DEPRECATED = "deprecated"  # 已弃用
    EVOLVING = "evolving"      # 演化中
    TESTING = "testing"        # 测试中
    ERROR = "error"            # 错误状态


class ToolOperation(Enum):
    """工具操作类型"""
    REGISTER = "register"
    UNREGISTER = "unregister"
    EXECUTE = "execute"
    COMPOSE = "compose"
    EVOLVE = "evolve"
    OPTIMIZE = "optimize"
    DISCOVER = "discover"
    ANALYZE = "analyze"


@dataclass
class ToolMetrics:
    """工具性能指标"""
    execution_count: int = 0
    success_count: int = 0
    error_count: int = 0
    total_duration: float = 0.0
    avg_duration: float = 0.0
    last_execution: Optional[datetime] = None
    performance_score: float = 0.0
    reliability_score: float = 1.0
    usage_frequency: float = 0.0


@dataclass
class ToolSchema:
    """工具模式定义"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    parameters: Dict[str, Any] = field(default_factory=dict)
    examples: List[Dict[str, Any]] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)


class ITool(ABC):
    """工具基础接口"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """工具名称"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """工具描述"""
        pass
    
    @property
    @abstractmethod
    def category(self) -> ToolCategory:
        """工具分类"""
        pass
    
    @property
    @abstractmethod
    def schema(self) -> ToolSchema:
        """工具模式"""
        pass
    
    @abstractmethod
    async def execute(self, inputs: Dict[str, Any], context: Optional[ServiceContext] = None) -> Dict[str, Any]:
        """执行工具"""
        pass
    
    @abstractmethod
    async def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """验证输入"""
        pass
    
    async def health_check(self) -> bool:
        """健康检查"""
        return True


class BaseTool(ITool):
    """工具基础实现"""
    
    def __init__(self, name: str, description: str, category: ToolCategory, schema: ToolSchema):
        self._name = name
        self._description = description
        self._category = category
        self._schema = schema
        self._metrics = ToolMetrics()
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def description(self) -> str:
        return self._description
    
    @property
    def category(self) -> ToolCategory:
        return self._category
    
    @property
    def schema(self) -> ToolSchema:
        return self._schema
    
    @property
    def metrics(self) -> ToolMetrics:
        return self._metrics
    
    async def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """默认输入验证"""
        required_fields = self._schema.input_schema.get('required', [])
        return all(field in inputs for field in required_fields)
    
    def update_metrics(self, duration: float, success: bool) -> None:
        """更新性能指标"""
        self._metrics.execution_count += 1
        self._metrics.total_duration += duration
        self._metrics.avg_duration = self._metrics.total_duration / self._metrics.execution_count
        self._metrics.last_execution = datetime.utcnow()
        
        if success:
            self._metrics.success_count += 1
        else:
            self._metrics.error_count += 1
        
        # 计算性能评分
        success_rate = self._metrics.success_count / self._metrics.execution_count
        speed_score = max(0, 1 - (self._metrics.avg_duration / 10))  # 假设10秒为基准
        self._metrics.performance_score = (success_rate * 0.7) + (speed_score * 0.3)
        self._metrics.reliability_score = success_rate


class AtomicTool(BaseTool):
    """原子工具 - 最小功能单元"""
    
    def __init__(self, name: str, description: str, category: ToolCategory, 
                 schema: ToolSchema, func: Callable):
        super().__init__(name, description, category, schema)
        self._func = func
        self._is_atomic = True
    
    async def execute(self, inputs: Dict[str, Any], context: Optional[ServiceContext] = None) -> Dict[str, Any]:
        """执行原子工具"""
        if not await self.validate_inputs(inputs):
            raise ValidationError(f"Invalid inputs for tool {self.name}")
        
        start_time = datetime.utcnow()
        try:
            # 检查函数是否为异步
            if inspect.iscoroutinefunction(self._func):
                result = await self._func(**inputs)
            else:
                result = self._func(**inputs)
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            self.update_metrics(duration, True)
            
            return {"result": result, "success": True}
            
        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            self.update_metrics(duration, False)
            raise BusinessError(f"Tool execution failed: {str(e)}")


class CompositeTool(BaseTool):
    """组合工具 - 多个工具的组合"""
    
    def __init__(self, name: str, description: str, category: ToolCategory, 
                 schema: ToolSchema, tools: List[ITool], workflow: Dict[str, Any]):
        super().__init__(name, description, category, schema)
        self._tools = {tool.name: tool for tool in tools}
        self._workflow = workflow
        self._is_composite = True
    
    async def execute(self, inputs: Dict[str, Any], context: Optional[ServiceContext] = None) -> Dict[str, Any]:
        """执行组合工具"""
        if not await self.validate_inputs(inputs):
            raise ValidationError(f"Invalid inputs for composite tool {self.name}")
        
        start_time = datetime.utcnow()
        try:
            result = await self._execute_workflow(inputs, context)
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            self.update_metrics(duration, True)
            
            return result
            
        except Exception as e:
            duration = (datetime.utcnow() - start_time).total_seconds()
            self.update_metrics(duration, False)
            raise BusinessError(f"Composite tool execution failed: {str(e)}")
    
    async def _execute_workflow(self, inputs: Dict[str, Any], context: Optional[ServiceContext]) -> Dict[str, Any]:
        """执行工作流"""
        steps = self._workflow.get('steps', [])
        current_data = inputs.copy()
        results = {}
        
        for step in steps:
            tool_name = step.get('tool')
            step_inputs = step.get('inputs', {})
            output_key = step.get('output_key', tool_name)
            
            if tool_name not in self._tools:
                raise BusinessError(f"Tool {tool_name} not found in composite tool")
            
            # 解析输入（可能引用前面步骤的输出）
            resolved_inputs = self._resolve_inputs(step_inputs, current_data, results)
            
            # 执行工具
            tool_result = await self._tools[tool_name].execute(resolved_inputs, context)
            results[output_key] = tool_result
            
            # 更新当前数据
            if isinstance(tool_result, dict) and 'result' in tool_result:
                current_data.update(tool_result['result'] if isinstance(tool_result['result'], dict) else {})
        
        return {
            "result": results,
            "success": True,
            "workflow_completed": True
        }
    
    def _resolve_inputs(self, step_inputs: Dict[str, Any], current_data: Dict[str, Any], 
                       results: Dict[str, Any]) -> Dict[str, Any]:
        """解析步骤输入"""
        resolved = {}
        
        for key, value in step_inputs.items():
            if isinstance(value, str) and value.startswith('$'):
                # 引用变量
                ref_path = value[1:].split('.')
                resolved_value = current_data
                
                for path_part in ref_path:
                    if isinstance(resolved_value, dict) and path_part in resolved_value:
                        resolved_value = resolved_value[path_part]
                    else:
                        resolved_value = None
                        break
                
                resolved[key] = resolved_value
            else:
                resolved[key] = value
        
        return resolved


@dataclass
class ToolRequest:
    """工具请求数据"""
    operation: ToolOperation
    tool_name: Optional[str] = None
    tool_type: Optional[ToolType] = None
    category: Optional[ToolCategory] = None
    inputs: Optional[Dict[str, Any]] = None
    composition_spec: Optional[Dict[str, Any]] = None
    evolution_params: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ToolResponse:
    """工具响应数据"""
    success: bool
    tool_name: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    tools: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[ToolMetrics] = None
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ToolRegistry:
    """工具注册表"""
    
    def __init__(self):
        self._tools: Dict[str, ITool] = {}
        self._categories: Dict[ToolCategory, List[str]] = {}
        self._tool_bank: Dict[str, Dict[str, Any]] = {}  # 工具银行
    
    def register_tool(self, tool: ITool) -> None:
        """注册工具"""
        self._tools[tool.name] = tool
        
        if tool.category not in self._categories:
            self._categories[tool.category] = []
        
        if tool.name not in self._categories[tool.category]:
            self._categories[tool.category].append(tool.name)
        
        # 添加到工具银行
        self._tool_bank[tool.name] = {
            "tool": tool,
            "registered_at": datetime.utcnow(),
            "usage_count": 0,
            "last_used": None
        }
    
    def unregister_tool(self, tool_name: str) -> bool:
        """注销工具"""
        if tool_name in self._tools:
            tool = self._tools[tool_name]
            del self._tools[tool_name]
            
            if tool.category in self._categories:
                self._categories[tool.category].remove(tool_name)
            
            if tool_name in self._tool_bank:
                del self._tool_bank[tool_name]
            
            return True
        return False
    
    def get_tool(self, tool_name: str) -> Optional[ITool]:
        """获取工具"""
        if tool_name in self._tools:
            # 更新使用统计
            if tool_name in self._tool_bank:
                self._tool_bank[tool_name]["usage_count"] += 1
                self._tool_bank[tool_name]["last_used"] = datetime.utcnow()
            
            return self._tools[tool_name]
        return None
    
    def list_tools(self, category: Optional[ToolCategory] = None) -> List[str]:
        """列出工具"""
        if category:
            return self._categories.get(category, [])
        return list(self._tools.keys())
    
    def get_tool_bank(self) -> Dict[str, Dict[str, Any]]:
        """获取工具银行"""
        return self._tool_bank.copy()


class ToolEvolutionEngine:
    """工具演化引擎"""
    
    def __init__(self, registry: ToolRegistry):
        self.registry = registry
        self._evolution_history: Dict[str, List[Dict[str, Any]]] = {}
    
    async def evolve_tool(self, tool_name: str, performance_data: Dict[str, Any], 
                         evolution_params: Dict[str, Any]) -> Optional[ITool]:
        """演化工具"""
        original_tool = self.registry.get_tool(tool_name)
        if not original_tool:
            return None
        
        # 分析性能数据
        analysis = self._analyze_performance(performance_data)
        
        # 生成演化策略
        strategy = self._generate_evolution_strategy(analysis, evolution_params)
        
        # 应用演化
        evolved_tool = await self._apply_evolution(original_tool, strategy)
        
        # 记录演化历史
        if tool_name not in self._evolution_history:
            self._evolution_history[tool_name] = []
        
        self._evolution_history[tool_name].append({
            "timestamp": datetime.utcnow(),
            "strategy": strategy,
            "performance_before": analysis,
            "evolution_params": evolution_params
        })
        
        return evolved_tool
    
    def _analyze_performance(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """分析性能数据"""
        return {
            "bottlenecks": self._identify_bottlenecks(performance_data),
            "optimization_opportunities": self._find_optimization_opportunities(performance_data),
            "reliability_issues": self._detect_reliability_issues(performance_data)
        }
    
    def _identify_bottlenecks(self, data: Dict[str, Any]) -> List[str]:
        """识别性能瓶颈"""
        bottlenecks = []
        
        avg_duration = data.get('avg_duration', 0)
        if avg_duration > 5.0:  # 超过5秒认为是瓶颈
            bottlenecks.append('slow_execution')
        
        error_rate = data.get('error_count', 0) / max(data.get('execution_count', 1), 1)
        if error_rate > 0.1:  # 错误率超过10%
            bottlenecks.append('high_error_rate')
        
        return bottlenecks
    
    def _find_optimization_opportunities(self, data: Dict[str, Any]) -> List[str]:
        """发现优化机会"""
        opportunities = []
        
        # 基于使用模式发现优化机会
        usage_frequency = data.get('usage_frequency', 0)
        if usage_frequency > 0.8:  # 高频使用
            opportunities.append('caching')
            opportunities.append('parallel_processing')
        
        return opportunities
    
    def _detect_reliability_issues(self, data: Dict[str, Any]) -> List[str]:
        """检测可靠性问题"""
        issues = []
        
        reliability_score = data.get('reliability_score', 1.0)
        if reliability_score < 0.9:
            issues.append('low_reliability')
        
        return issues
    
    def _generate_evolution_strategy(self, analysis: Dict[str, Any], 
                                   params: Dict[str, Any]) -> Dict[str, Any]:
        """生成演化策略"""
        strategy = {
            "type": "optimization",
            "actions": []
        }
        
        bottlenecks = analysis.get('bottlenecks', [])
        opportunities = analysis.get('optimization_opportunities', [])
        
        if 'slow_execution' in bottlenecks:
            strategy['actions'].append('add_caching')
            strategy['actions'].append('optimize_algorithm')
        
        if 'high_error_rate' in bottlenecks:
            strategy['actions'].append('add_error_handling')
            strategy['actions'].append('add_input_validation')
        
        if 'caching' in opportunities:
            strategy['actions'].append('implement_caching')
        
        return strategy
    
    async def _apply_evolution(self, original_tool: ITool, strategy: Dict[str, Any]) -> ITool:
        """应用演化策略"""
        # 这里是一个简化的演化实现
        # 实际实现中会根据策略修改工具的行为
        
        evolved_name = f"{original_tool.name}_evolved_{int(datetime.utcnow().timestamp())}"
        
        # 创建演化后的工具（这里只是示例）
        evolved_tool = BaseTool(
            name=evolved_name,
            description=f"Evolved version of {original_tool.description}",
            category=original_tool.category,
            schema=original_tool.schema
        )
        
        return evolved_tool


class ToolService(BaseService[ToolRequest, ToolResponse]):
    """工具管理服务"""
    
    def __init__(self, db_session: AsyncSession, redis_manager: RedisManager):
        super().__init__("tool_service", "1.0.0")
        self.db = db_session
        self.redis = redis_manager
        self.settings = get_settings()
        
        # 初始化工具注册表和演化引擎
        self.registry = ToolRegistry()
        self.evolution_engine = ToolEvolutionEngine(self.registry)
        
        # 注册内置工具
        asyncio.create_task(self._register_builtin_tools())
    
    async def _execute_core(self, request: ToolRequest, context: ServiceContext) -> ServiceResult[ToolResponse]:
        """核心执行逻辑"""
        try:
            if request.operation == ToolOperation.REGISTER:
                return await self._register_tool(request, context)
            elif request.operation == ToolOperation.UNREGISTER:
                return await self._unregister_tool(request, context)
            elif request.operation == ToolOperation.EXECUTE:
                return await self._execute_tool(request, context)
            elif request.operation == ToolOperation.COMPOSE:
                return await self._compose_tools(request, context)
            elif request.operation == ToolOperation.EVOLVE:
                return await self._evolve_tool(request, context)
            elif request.operation == ToolOperation.DISCOVER:
                return await self._discover_tools(request, context)
            elif request.operation == ToolOperation.ANALYZE:
                return await self._analyze_tools(request, context)
            else:
                raise ValidationError(f"Unsupported operation: {request.operation}")
                
        except Exception as e:
            self._logger.error(f"Tool service error: {e}")
            raise BusinessError(f"Tool operation failed: {str(e)}")
    
    @service_method(timeout=30.0, retries=2)
    async def _execute_tool(self, request: ToolRequest, context: ServiceContext) -> ServiceResult[ToolResponse]:
        """执行工具"""
        if not request.tool_name or not request.inputs:
            raise ValidationError("Tool name and inputs are required")
        
        tool = self.registry.get_tool(request.tool_name)
        if not tool:
            raise ValidationError(f"Tool {request.tool_name} not found")
        
        # 执行工具
        result = await tool.execute(request.inputs, context)
        
        # 缓存结果（如果配置了缓存）
        cache_key = f"tool_result:{request.tool_name}:{hash(str(request.inputs))}"
        await self.redis.set(cache_key, json.dumps(result), ex=300)  # 5分钟缓存
        
        response = ToolResponse(
            success=True,
            tool_name=request.tool_name,
            result=result,
            metrics=tool.metrics if hasattr(tool, 'metrics') else None,
            message="Tool executed successfully"
        )
        
        return ServiceResult.success_result(response)
    
    async def _register_builtin_tools(self) -> None:
        """注册内置工具"""
        # 文本处理原子工具
        text_schema = ToolSchema(
            name="text_processor",
            description="Process text content",
            input_schema={
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "operation": {"type": "string", "enum": ["clean", "extract", "summarize"]}
                },
                "required": ["text", "operation"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "result": {"type": "string"},
                    "metadata": {"type": "object"}
                }
            }
        )
        
        async def text_processor(text: str, operation: str) -> str:
            """文本处理函数"""
            if operation == "clean":
                return text.strip().replace("\n\n", "\n")
            elif operation == "extract":
                # 简单的关键信息提取
                return text[:200] + "..." if len(text) > 200 else text
            elif operation == "summarize":
                # 简单的摘要
                sentences = text.split(". ")
                return ". ".join(sentences[:3]) + "." if len(sentences) > 3 else text
            else:
                return text
        
        text_tool = AtomicTool(
            name="text_processor",
            description="Atomic tool for text processing",
            category=ToolCategory.TRANSFORM,
            schema=text_schema,
            func=text_processor
        )
        
        self.registry.register_tool(text_tool)
        
        # 数据验证原子工具
        validation_schema = ToolSchema(
            name="data_validator",
            description="Validate data format and content",
            input_schema={
                "type": "object",
                "properties": {
                    "data": {"type": "any"},
                    "schema": {"type": "object"}
                },
                "required": ["data", "schema"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "valid": {"type": "boolean"},
                    "errors": {"type": "array"}
                }
            }
        )
        
        def data_validator(data: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
            """数据验证函数"""
            # 简单的验证逻辑
            errors = []
            
            if schema.get("type") == "string" and not isinstance(data, str):
                errors.append("Expected string type")
            elif schema.get("type") == "number" and not isinstance(data, (int, float)):
                errors.append("Expected number type")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors
            }
        
        validation_tool = AtomicTool(
            name="data_validator",
            description="Atomic tool for data validation",
            category=ToolCategory.UTILITY,
            schema=validation_schema,
            func=data_validator
        )
        
        self.registry.register_tool(validation_tool)
    
    async def validate(self, request: ToolRequest, context: Optional[ServiceContext] = None) -> bool:
        """验证请求"""
        if not isinstance(request, ToolRequest):
            return False
        
        if not request.operation:
            return False
        
        # 根据操作类型验证必要字段
        if request.operation == ToolOperation.EXECUTE:
            return all([request.tool_name, request.inputs])
        elif request.operation == ToolOperation.REGISTER:
            return request.tool_name is not None
        elif request.operation == ToolOperation.COMPOSE:
            return request.composition_spec is not None
        
        return True
    
    async def get_tool_bank(self) -> Dict[str, Any]:
        """获取工具银行信息"""
        tool_bank = self.registry.get_tool_bank()
        
        # 添加统计信息
        stats = {
            "total_tools": len(tool_bank),
            "categories": {},
            "most_used": None,
            "recently_added": []
        }
        
        # 按分类统计
        for tool_name, tool_info in tool_bank.items():
            tool = tool_info["tool"]
            category = tool.category.value
            
            if category not in stats["categories"]:
                stats["categories"][category] = 0
            stats["categories"][category] += 1
        
        # 找出最常用的工具
        if tool_bank:
            most_used = max(tool_bank.items(), key=lambda x: x[1]["usage_count"])
            stats["most_used"] = {
                "name": most_used[0],
                "usage_count": most_used[1]["usage_count"]
            }
        
        # 最近添加的工具
        recent_tools = sorted(
            tool_bank.items(),
            key=lambda x: x[1]["registered_at"],
            reverse=True
        )[:5]
        
        stats["recently_added"] = [
            {
                "name": tool_name,
                "registered_at": tool_info["registered_at"].isoformat()
            }
            for tool_name, tool_info in recent_tools
        ]
        
        return {
            "tool_bank": tool_bank,
            "statistics": stats
        }
    
    async def health_check(self) -> bool:
        """健康检查"""
        try:
            # 检查数据库连接
            await self.db.execute(select(1))
            
            # 检查Redis连接
            await self.redis.ping()
            
            # 检查工具注册表
            tools = self.registry.list_tools()
            if not tools:
                self._logger.warning("No tools registered")
            
            return True
        except Exception as e:
            self._logger.error(f"Health check failed: {e}")
            return False