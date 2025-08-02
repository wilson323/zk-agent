#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent LangChain工作流服务

基于LangChain框架的工作流服务，提供自然语言工作流解析、
智能体编排和任务执行功能。

核心功能：
- 自然语言工作流解析
- 基于LangChain的智能体创建
- 工作流链式执行
- 智能工具选择和匹配
- 任务自动分解
"""

import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

from langchain.chains import LLMChain, SequentialChain
from langchain.agents import AgentExecutor, Tool
from langchain.agents.openai_functions_agent.base import OpenAIFunctionsAgent
from langchain.schema import BaseMessage
from langchain.prompts import ChatPromptTemplate, PromptTemplate
from langchain_openai import ChatOpenAI
from langchain.tools import BaseTool
from langchain.callbacks.base import AsyncCallbackHandler
from pydantic import BaseModel, Field

from app.services.base import (
    BaseService, ServiceContext, ServiceResult, ServiceError,
    BusinessError, ValidationError, ResourceError, service_method
)
from app.services.workflow_service import WorkflowDefinition, NodeDefinition, EdgeDefinition
from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import RedisManager
from app.utils.logger import get_logger

logger = get_logger()
settings = get_settings()


class WorkflowType(Enum):
    """工作流类型"""
    SEQUENTIAL = "sequential"
    PARALLEL = "parallel"
    CONDITIONAL = "conditional"
    AGENT_BASED = "agent_based"


class AgentRole(Enum):
    """智能体角色"""
    ANALYST = "analyst"
    DEVELOPER = "developer"
    TESTER = "tester"
    REVIEWER = "reviewer"
    COORDINATOR = "coordinator"


@dataclass
class LangChainWorkflowConfig:
    """LangChain工作流配置"""
    name: str
    description: str
    type: WorkflowType
    agents: List[Dict[str, Any]] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)
    max_iterations: int = 10
    temperature: float = 0.7
    model_name: str = "gpt-4o-mini"
    timeout: int = 300
    enable_memory: bool = True
    enable_callbacks: bool = True


@dataclass
class WorkflowExecutionResult:
    """工作流执行结果"""
    workflow_id: str
    execution_id: str
    status: str
    result: Dict[str, Any]
    metrics: Dict[str, Any]
    logs: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class LangChainCallbackHandler(AsyncCallbackHandler):
    """LangChain回调处理器"""
    
    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        self.logs = []
        self.metrics = {
            'total_tokens': 0,
            'prompt_tokens': 0,
            'completion_tokens': 0,
            'total_cost': 0.0
        }
    
    async def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs) -> None:
        """LLM开始时的回调"""
        self.logs.append(f"LLM started for workflow {self.workflow_id}")
        logger.info(f"LLM started for workflow {self.workflow_id}")
    
    async def on_llm_end(self, response, **kwargs) -> None:
        """LLM结束时的回调"""
        if hasattr(response, 'llm_output') and response.llm_output:
            token_usage = response.llm_output.get('token_usage', {})
            self.metrics['total_tokens'] += token_usage.get('total_tokens', 0)
            self.metrics['prompt_tokens'] += token_usage.get('prompt_tokens', 0)
            self.metrics['completion_tokens'] += token_usage.get('completion_tokens', 0)
        
        self.logs.append(f"LLM completed for workflow {self.workflow_id}")
        logger.info(f"LLM completed for workflow {self.workflow_id}")
    
    async def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs) -> None:
        """工具开始时的回调"""
        tool_name = serialized.get('name', 'unknown')
        self.logs.append(f"Tool {tool_name} started with input: {input_str[:100]}...")
        logger.info(f"Tool {tool_name} started for workflow {self.workflow_id}")
    
    async def on_tool_end(self, output: str, **kwargs) -> None:
        """工具结束时的回调"""
        self.logs.append(f"Tool completed with output: {output[:100]}...")
        logger.info(f"Tool completed for workflow {self.workflow_id}")


class LangChainWorkflowService:
    """基于LangChain的工作流服务"""
    
    def __init__(self, redis_manager: Optional[RedisManager] = None):
        self.redis = redis_manager
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL_NAME or "gpt-4o-mini",
            temperature=0.7,
            api_key=settings.OPENAI_API_KEY
        )
        self.workflows: Dict[str, LangChainWorkflowConfig] = {}
        self.executions: Dict[str, WorkflowExecutionResult] = {}
        self.tools = self._initialize_tools()
        self.agents: Dict[str, AgentExecutor] = {}
        
        logger.info("LangChain工作流服务初始化完成")
    
    def _initialize_tools(self) -> List[Tool]:
        """初始化可用工具"""
        return [
            Tool(
                name="code_generator",
                description="生成代码的工具，输入需求描述，输出相应的代码",
                func=self._generate_code
            ),
            Tool(
                name="test_writer",
                description="编写测试代码的工具，输入代码，输出测试用例",
                func=self._write_tests
            ),
            Tool(
                name="code_reviewer",
                description="代码审查工具，输入代码，输出审查意见和改进建议",
                func=self._review_code
            ),
            Tool(
                name="documentation_writer",
                description="编写文档的工具，输入代码或需求，输出相应文档",
                func=self._write_documentation
            ),
            Tool(
                name="task_analyzer",
                description="任务分析工具，输入任务描述，输出任务分析和分解结果",
                func=self._analyze_task
            )
        ]
    
    async def _generate_code(self, requirement: str) -> str:
        """生成代码工具实现"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个专业的软件开发工程师，根据需求生成高质量的代码。"),
            ("human", "请根据以下需求生成代码：{requirement}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(requirement=requirement)
        return result
    
    async def _write_tests(self, code: str) -> str:
        """编写测试工具实现"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个测试工程师，为给定的代码编写全面的测试用例。"),
            ("human", "请为以下代码编写测试用例：\n{code}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(code=code)
        return result
    
    async def _review_code(self, code: str) -> str:
        """代码审查工具实现"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个资深的代码审查专家，提供专业的代码审查意见。"),
            ("human", "请审查以下代码并提供改进建议：\n{code}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(code=code)
        return result
    
    async def _write_documentation(self, content: str) -> str:
        """编写文档工具实现"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个技术文档专家，编写清晰、详细的技术文档。"),
            ("human", "请为以下内容编写技术文档：\n{content}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(content=content)
        return result
    
    async def _analyze_task(self, task: str) -> str:
        """任务分析工具实现"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "你是一个项目管理专家，擅长任务分析和分解。"),
            ("human", "请分析以下任务并提供分解建议：\n{task}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(task=task)
        return result
    
    async def parse_natural_language_workflow(self, description: str) -> LangChainWorkflowConfig:
        """解析自然语言工作流描述"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """
你是一个工作流设计专家，将自然语言描述转换为结构化的工作流配置。

请分析用户的描述，识别：
1. 工作流类型（sequential/parallel/conditional/agent_based）
2. 需要的智能体角色和能力
3. 所需的工具和资源
4. 执行步骤和依赖关系

返回JSON格式的工作流配置。
"""),
            ("human", "请分析以下工作流描述：{description}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        result = await chain.arun(description=description)
        
        try:
            # 解析LLM返回的JSON配置
            config_data = json.loads(result)
            
            workflow_config = LangChainWorkflowConfig(
                name=config_data.get('name', f'workflow_{uuid.uuid4().hex[:8]}'),
                description=description,
                type=WorkflowType(config_data.get('type', 'sequential')),
                agents=config_data.get('agents', []),
                tools=config_data.get('tools', []),
                max_iterations=config_data.get('max_iterations', 10),
                temperature=config_data.get('temperature', 0.7)
            )
            
            return workflow_config
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"解析工作流配置失败: {e}")
            # 返回默认配置
            return LangChainWorkflowConfig(
                name=f'workflow_{uuid.uuid4().hex[:8]}',
                description=description,
                type=WorkflowType.SEQUENTIAL,
                agents=[{
                    'role': 'coordinator',
                    'capabilities': ['task_coordination', 'result_synthesis']
                }],
                tools=['task_analyzer']
            )
    
    async def create_agent_for_role(self, role: AgentRole, capabilities: List[str]) -> AgentExecutor:
        """为特定角色创建智能体"""
        # 根据角色选择合适的工具
        role_tools = self._get_tools_for_role(role, capabilities)
        
        # 创建角色特定的提示模板
        prompt = self._create_role_prompt(role)
        
        # 创建智能体
        agent = OpenAIFunctionsAgent(
            llm=self.llm,
            tools=role_tools,
            prompt=prompt
        )
        agent_executor = AgentExecutor(
            agent=agent, 
            tools=role_tools, 
            verbose=True,
            max_iterations=10
        )
        
        return agent_executor
    
    def _get_tools_for_role(self, role: AgentRole, capabilities: List[str]) -> List[Tool]:
        """根据角色获取相应工具"""
        role_tool_mapping = {
            AgentRole.DEVELOPER: ['code_generator', 'code_reviewer'],
            AgentRole.TESTER: ['test_writer', 'code_reviewer'],
            AgentRole.ANALYST: ['task_analyzer', 'documentation_writer'],
            AgentRole.REVIEWER: ['code_reviewer', 'documentation_writer'],
            AgentRole.COORDINATOR: ['task_analyzer']
        }
        
        tool_names = role_tool_mapping.get(role, [])
        return [tool for tool in self.tools if tool.name in tool_names]
    
    def _create_role_prompt(self, role: AgentRole) -> ChatPromptTemplate:
        """创建角色特定的提示模板"""
        role_prompts = {
            AgentRole.DEVELOPER: "你是一个专业的软件开发工程师，负责编写高质量的代码。",
            AgentRole.TESTER: "你是一个测试工程师，负责编写全面的测试用例和质量保证。",
            AgentRole.ANALYST: "你是一个业务分析师，负责需求分析和任务分解。",
            AgentRole.REVIEWER: "你是一个代码审查专家，负责代码质量审查和改进建议。",
            AgentRole.COORDINATOR: "你是一个项目协调员，负责任务协调和结果整合。"
        }
        
        system_message = role_prompts.get(role, "你是一个专业的AI助手。")
        
        return ChatPromptTemplate.from_messages([
            ("system", system_message),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}")
        ])
    
    async def create_workflow(self, config: LangChainWorkflowConfig) -> str:
        """创建工作流"""
        workflow_id = str(uuid.uuid4())
        self.workflows[workflow_id] = config
        
        # 为工作流创建所需的智能体
        for agent_config in config.agents:
            role = AgentRole(agent_config.get('role', 'coordinator'))
            capabilities = agent_config.get('capabilities', [])
            agent_id = f"{workflow_id}_{role.value}"
            
            self.agents[agent_id] = await self.create_agent_for_role(role, capabilities)
        
        logger.info(f"工作流创建成功: {workflow_id}")
        return workflow_id
    
    async def execute_workflow(self, workflow_id: str, inputs: Dict[str, Any]) -> WorkflowExecutionResult:
        """执行工作流"""
        if workflow_id not in self.workflows:
            raise BusinessError(f"工作流 {workflow_id} 不存在")
        
        config = self.workflows[workflow_id]
        execution_id = str(uuid.uuid4())
        
        # 创建回调处理器
        callback_handler = LangChainCallbackHandler(workflow_id)
        
        # 创建执行结果对象
        execution_result = WorkflowExecutionResult(
            workflow_id=workflow_id,
            execution_id=execution_id,
            status="running",
            result={},
            metrics={}
        )
        
        self.executions[execution_id] = execution_result
        
        try:
            # 根据工作流类型执行
            if config.type == WorkflowType.SEQUENTIAL:
                result = await self._execute_sequential_workflow(config, inputs, callback_handler)
            elif config.type == WorkflowType.PARALLEL:
                result = await self._execute_parallel_workflow(config, inputs, callback_handler)
            elif config.type == WorkflowType.AGENT_BASED:
                result = await self._execute_agent_based_workflow(config, inputs, callback_handler)
            else:
                result = await self._execute_sequential_workflow(config, inputs, callback_handler)
            
            execution_result.status = "completed"
            execution_result.result = result
            execution_result.completed_at = datetime.now()
            execution_result.logs = callback_handler.logs
            execution_result.metrics = callback_handler.metrics
            
        except Exception as e:
            execution_result.status = "failed"
            execution_result.errors.append(str(e))
            execution_result.completed_at = datetime.now()
            logger.error(f"工作流执行失败: {e}")
            raise BusinessError(f"工作流执行失败: {str(e)}")
        
        return execution_result
    
    async def _execute_sequential_workflow(self, config: LangChainWorkflowConfig, 
                                         inputs: Dict[str, Any], 
                                         callback_handler: LangChainCallbackHandler) -> Dict[str, Any]:
        """执行顺序工作流"""
        results = {}
        current_input = inputs.copy()
        
        for i, agent_config in enumerate(config.agents):
            role = AgentRole(agent_config.get('role', 'coordinator'))
            agent_id = f"{config.name}_{role.value}"
            
            if agent_id in self.agents:
                agent = self.agents[agent_id]
                
                # 构建输入
                agent_input = {
                    'input': current_input.get('task', ''),
                    'context': current_input,
                    'step': i + 1
                }
                
                # 执行智能体
                result = await agent.ainvoke(
                    agent_input,
                    callbacks=[callback_handler]
                )
                
                results[f"step_{i+1}_{role.value}"] = result
                current_input.update(result)
        
        return results
    
    async def _execute_parallel_workflow(self, config: LangChainWorkflowConfig, 
                                        inputs: Dict[str, Any], 
                                        callback_handler: LangChainCallbackHandler) -> Dict[str, Any]:
        """执行并行工作流"""
        tasks = []
        
        for i, agent_config in enumerate(config.agents):
            role = AgentRole(agent_config.get('role', 'coordinator'))
            agent_id = f"{config.name}_{role.value}"
            
            if agent_id in self.agents:
                agent = self.agents[agent_id]
                
                agent_input = {
                    'input': inputs.get('task', ''),
                    'context': inputs,
                    'step': i + 1
                }
                
                task = agent.ainvoke(agent_input, callbacks=[callback_handler])
                tasks.append((f"agent_{i+1}_{role.value}", task))
        
        # 并行执行所有任务
        results = {}
        completed_tasks = await asyncio.gather(*[task for _, task in tasks], return_exceptions=True)
        
        for (name, _), result in zip(tasks, completed_tasks):
            if isinstance(result, Exception):
                results[name] = {"error": str(result)}
            else:
                results[name] = result
        
        return results
    
    async def _execute_agent_based_workflow(self, config: LangChainWorkflowConfig, 
                                          inputs: Dict[str, Any], 
                                          callback_handler: LangChainCallbackHandler) -> Dict[str, Any]:
        """执行基于智能体的工作流"""
        # 创建协调智能体
        coordinator_agent = await self.create_agent_for_role(AgentRole.COORDINATOR, ['task_coordination'])
        
        # 协调智能体分析任务并分配给其他智能体
        coordination_result = await coordinator_agent.ainvoke({
            'input': f"请分析并协调以下任务的执行: {inputs.get('task', '')}",
            'available_agents': [agent['role'] for agent in config.agents],
            'context': inputs
        }, callbacks=[callback_handler])
        
        # 根据协调结果执行具体任务
        results = {'coordination': coordination_result}
        
        # 这里可以根据协调结果进一步执行其他智能体
        # 简化实现，直接返回协调结果
        return results
    
    async def get_workflow_status(self, execution_id: str) -> Optional[WorkflowExecutionResult]:
        """获取工作流执行状态"""
        return self.executions.get(execution_id)
    
    async def list_workflows(self) -> List[Dict[str, Any]]:
        """列出所有工作流"""
        return [
            {
                'id': workflow_id,
                'name': config.name,
                'description': config.description,
                'type': config.type.value,
                'agents_count': len(config.agents)
            }
            for workflow_id, config in self.workflows.items()
        ]
    
    async def delete_workflow(self, workflow_id: str) -> bool:
        """删除工作流"""
        if workflow_id in self.workflows:
            del self.workflows[workflow_id]
            
            # 删除相关的智能体
            agents_to_delete = [agent_id for agent_id in self.agents.keys() 
                              if agent_id.startswith(workflow_id)]
            for agent_id in agents_to_delete:
                del self.agents[agent_id]
            
            logger.info(f"工作流删除成功: {workflow_id}")
            return True
        
        return False


# 请求和响应模型
class CreateWorkflowRequest(BaseModel):
    """创建工作流请求"""
    description: str = Field(..., description="工作流的自然语言描述")
    name: Optional[str] = Field(None, description="工作流名称")
    config: Optional[Dict[str, Any]] = Field(None, description="额外配置")


class ExecuteWorkflowRequest(BaseModel):
    """执行工作流请求"""
    workflow_id: str = Field(..., description="工作流ID")
    inputs: Dict[str, Any] = Field(..., description="输入数据")
    context: Optional[Dict[str, Any]] = Field(None, description="执行上下文")


class WorkflowResponse(BaseModel):
    """工作流响应"""
    success: bool
    workflow_id: Optional[str] = None
    execution_id: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


# 导出主要类和函数
__all__ = [
    'LangChainWorkflowService',
    'LangChainWorkflowConfig',
    'WorkflowExecutionResult',
    'CreateWorkflowRequest',
    'ExecuteWorkflowRequest',
    'WorkflowResponse',
    'WorkflowType',
    'AgentRole'
]