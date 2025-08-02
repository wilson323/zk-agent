#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent LangGraph多智能体服务

基于LangGraph框架的现代化多智能体系统，提供状态管理、
智能体协同和复杂工作流编排功能。

核心功能：
- 基于StateGraph的多智能体状态管理
- 智能体间协同和通信
- 条件边和节点协作
- 任务分解和并行处理
- 实时监控和调试
"""

import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any, Union, TypedDict, Annotated
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from operator import add

from app.services.base import (
    BaseService, ServiceContext, ServiceResult, ServiceError,
    BusinessError, ValidationError, ResourceError, service_method
)
from app.core.config import get_settings
from app.utils.logger import get_logger

logger = get_logger()
settings = get_settings()


class AgentState(TypedDict):
    """多智能体状态定义"""
    messages: Annotated[List[BaseMessage], add]
    current_agent: str
    task_id: str
    task_description: str
    task_status: str
    results: Dict[str, Any]
    next_agent: Optional[str]
    iteration_count: int
    max_iterations: int
    error_message: Optional[str]


class AgentRole(Enum):
    """智能体角色定义"""
    SUPERVISOR = "supervisor"  # 监督者
    RESEARCHER = "researcher"  # 研究员
    ANALYST = "analyst"       # 分析师
    DEVELOPER = "developer"   # 开发者
    REVIEWER = "reviewer"     # 审查员
    COORDINATOR = "coordinator"  # 协调员


@dataclass
class AgentConfig:
    """智能体配置"""
    name: str
    role: AgentRole
    description: str
    system_prompt: str
    tools: List[str] = field(default_factory=list)
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 4000


@dataclass
class MultiAgentTask:
    """多智能体任务"""
    id: str
    description: str
    agents: List[str]
    workflow_type: str = "sequential"
    max_iterations: int = 10
    timeout: int = 300
    created_at: datetime = field(default_factory=datetime.now)
    status: str = "pending"
    results: Dict[str, Any] = field(default_factory=dict)


class LangGraphMultiAgentService(BaseService):
    """LangGraph多智能体服务"""
    
    def __init__(self):
        super().__init__(name="LangGraphMultiAgentService", version="1.0.0")
        self.agents: Dict[str, Any] = {}
        self.workflows: Dict[str, StateGraph] = {}
        self.checkpointer = MemorySaver()
        self._initialize_default_agents()
        
    def _initialize_default_agents(self):
        """初始化默认智能体"""
        # 监督者智能体
        supervisor_config = AgentConfig(
            name="supervisor",
            role=AgentRole.SUPERVISOR,
            description="负责任务分解、智能体协调和结果整合",
            system_prompt="""
            你是一个智能的任务监督者。你的职责是：
            1. 分析用户任务并分解为子任务
            2. 决定哪个智能体应该处理特定任务
            3. 协调多个智能体的工作
            4. 整合最终结果
            
            可用的智能体：
            - researcher: 负责信息收集和研究
            - analyst: 负责数据分析和洞察
            - developer: 负责代码开发和技术实现
            - reviewer: 负责质量审查和优化建议
            
            请根据任务需求选择合适的智能体，并提供清晰的指令。
            """
        )
        
        # 研究员智能体
        researcher_config = AgentConfig(
            name="researcher",
            role=AgentRole.RESEARCHER,
            description="负责信息收集、资料研究和知识整理",
            system_prompt="""
            你是一个专业的研究员。你的职责是：
            1. 收集相关信息和资料
            2. 进行深度研究和分析
            3. 整理和总结研究成果
            4. 提供准确可靠的信息支持
            
            请确保你的研究结果准确、全面且有价值。
            """,
            tools=["web_search", "document_analysis"]
        )
        
        # 分析师智能体
        analyst_config = AgentConfig(
            name="analyst",
            role=AgentRole.ANALYST,
            description="负责数据分析、趋势识别和洞察提取",
            system_prompt="""
            你是一个专业的数据分析师。你的职责是：
            1. 分析数据和信息
            2. 识别模式和趋势
            3. 提供深度洞察和建议
            4. 生成分析报告
            
            请确保你的分析客观、准确且有洞察力。
            """,
            tools=["data_analysis", "visualization"]
        )
        
        # 开发者智能体
        developer_config = AgentConfig(
            name="developer",
            role=AgentRole.DEVELOPER,
            description="负责代码开发、技术实现和系统设计",
            system_prompt="""
            你是一个专业的软件开发者。你的职责是：
            1. 设计技术方案
            2. 编写高质量代码
            3. 实现功能需求
            4. 优化性能和架构
            
            请确保你的代码规范、高效且可维护。
            """,
            tools=["code_generation", "code_review", "testing"]
        )
        
        # 审查员智能体
        reviewer_config = AgentConfig(
            name="reviewer",
            role=AgentRole.REVIEWER,
            description="负责质量审查、优化建议和最终验证",
            system_prompt="""
            你是一个专业的质量审查员。你的职责是：
            1. 审查工作成果的质量
            2. 识别问题和改进点
            3. 提供优化建议
            4. 确保最终交付质量
            
            请确保你的审查严格、客观且建设性。
            """,
            tools=["quality_check", "optimization"]
        )
        
        # 创建智能体实例
        for config in [supervisor_config, researcher_config, analyst_config, developer_config, reviewer_config]:
            self.agents[config.name] = self._create_agent(config)
    
    def _create_agent(self, config: AgentConfig) -> Any:
        """创建智能体实例"""
        from langchain_openai import ChatOpenAI
        
        # 创建支持工具绑定的模型
        model = ChatOpenAI(
            model=config.model,
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            api_key=settings.OPENAI_API_KEY,
            model_kwargs={"tool_choice": "auto"}  # 启用工具选择
        )
        
        # 创建工具列表
        tools = self._get_tools_for_agent(config.tools)
        
        # 如果没有工具，创建简单的聊天agent
        if not tools:
            # 创建简单的聊天函数
            def simple_chat(state):
                messages = state.get("messages", [])
                if messages:
                    response = model.invoke(messages)
                    return {"messages": [response]}
                return {"messages": []}
            return simple_chat
        
        # 尝试创建React智能体
        try:
            agent = create_react_agent(
                model=model,
                tools=tools
            )
            return agent
        except NotImplementedError:
            # 如果bind_tools不支持，创建自定义agent
            def custom_agent(state):
                messages = state.get("messages", [])
                if messages:
                    # 简单的消息处理，不使用工具绑定
                    response = model.invoke(messages)
                    return {"messages": [response]}
                return {"messages": []}
            return custom_agent
        
        return agent
    
    def _get_tools_for_agent(self, tool_names: List[str]) -> List[Any]:
        """获取智能体工具"""
        available_tools = {
            "web_search": self._create_web_search_tool(),
            "document_analysis": self._create_document_analysis_tool(),
            "data_analysis": self._create_data_analysis_tool(),
            "visualization": self._create_visualization_tool(),
            "code_generation": self._create_code_generation_tool(),
            "code_review": self._create_code_review_tool(),
            "testing": self._create_testing_tool(),
            "quality_check": self._create_quality_check_tool(),
            "optimization": self._create_optimization_tool()
        }
        
        return [available_tools[name] for name in tool_names if name in available_tools]
    
    def _create_web_search_tool(self):
        """创建网络搜索工具"""
        @tool
        def web_search(query: str) -> str:
            """搜索网络信息"""
            # 这里应该集成真实的搜索API
            return f"搜索结果：{query}的相关信息"
        return web_search
    
    def _create_document_analysis_tool(self):
        """创建文档分析工具"""
        @tool
        def document_analysis(document: str) -> str:
            """分析文档内容"""
            return f"文档分析结果：{document[:100]}..."
        return document_analysis

    def _create_data_analysis_tool(self):
        """创建数据分析工具"""
        @tool
        def data_analysis(data: str) -> str:
            """分析数据"""
            return f"数据分析结果：{data}的统计信息和趋势"
        return data_analysis

    def _create_visualization_tool(self):
        """创建可视化工具"""
        @tool
        def visualization(data: str) -> str:
            """创建数据可视化"""
            return f"可视化图表：{data}的图表已生成"
        return visualization
    
    def _create_code_generation_tool(self):
        """创建代码生成工具"""
        @tool
        def code_generation(requirement: str) -> str:
            """生成代码"""
            return f"生成的代码：\n# {requirement}\nprint('Hello, World!')"
        return code_generation

    def _create_code_review_tool(self):
        """创建代码审查工具"""
        @tool
        def code_review(code: str) -> str:
            """审查代码"""
            return f"代码审查结果：{code[:50]}...的质量评估"
        return code_review

    def _create_testing_tool(self):
        """创建测试工具"""
        @tool
        def testing(code: str) -> str:
            """测试代码"""
            return f"测试结果：{code[:50]}...的测试通过"
        return testing

    def _create_quality_check_tool(self):
        """创建质量检查工具"""
        @tool
        def quality_check(content: str) -> str:
            """质量检查"""
            return f"质量检查结果：{content[:50]}...符合质量标准"
        return quality_check

    def _create_optimization_tool(self):
        """创建优化工具"""
        @tool
        def optimization(content: str) -> str:
            """优化建议"""
            return f"优化建议：{content[:50]}...的改进方案"
        return optimization
    
    def create_sequential_workflow(self, agents: List[str]) -> StateGraph:
        """创建顺序工作流"""
        workflow = StateGraph(AgentState)
        
        # 添加智能体节点
        for agent_name in agents:
            if agent_name in self.agents:
                workflow.add_node(agent_name, self._create_agent_node(agent_name))
        
        # 设置入口点
        workflow.set_entry_point(agents[0])
        
        # 添加顺序边
        for i in range(len(agents) - 1):
            workflow.add_edge(agents[i], agents[i + 1])
        
        # 最后一个节点连接到END
        workflow.add_edge(agents[-1], END)
        
        return workflow.compile(checkpointer=self.checkpointer)
    
    def create_supervisor_workflow(self, agents: List[str]) -> StateGraph:
        """创建监督者工作流"""
        workflow = StateGraph(AgentState)
        
        # 添加监督者节点
        workflow.add_node("supervisor", self._create_supervisor_node())
        
        # 添加工作智能体节点
        for agent_name in agents:
            if agent_name in self.agents and agent_name != "supervisor":
                workflow.add_node(agent_name, self._create_agent_node(agent_name))
        
        # 设置入口点
        workflow.set_entry_point("supervisor")
        
        # 添加条件边
        workflow.add_conditional_edges(
            "supervisor",
            self._should_continue,
            {agent: agent for agent in agents if agent != "supervisor"} | {"END": END}
        )
        
        # 工作智能体完成后返回监督者
        for agent_name in agents:
            if agent_name != "supervisor":
                workflow.add_edge(agent_name, "supervisor")
        
        return workflow.compile(checkpointer=self.checkpointer)
    
    def _create_agent_node(self, agent_name: str):
        """创建智能体节点"""
        async def agent_node(state: AgentState, config: RunnableConfig):
            agent = self.agents[agent_name]
            
            # 更新状态
            state["current_agent"] = agent_name
            state["iteration_count"] += 1
            
            try:
                # 执行智能体
                result = await agent.ainvoke(state, config)
                
                # 更新结果
                state["results"][agent_name] = result
                state["messages"].append(AIMessage(content=f"{agent_name}完成任务: {result}"))
                
                return state
                
            except Exception as e:
                logger.error(f"智能体{agent_name}执行失败: {e}")
                state["error_message"] = str(e)
                state["task_status"] = "failed"
                return state
        
        return agent_node
    
    def _create_supervisor_node(self):
        """创建监督者节点"""
        async def supervisor_node(state: AgentState, config: RunnableConfig):
            supervisor = self.agents["supervisor"]
            
            # 更新状态
            state["current_agent"] = "supervisor"
            
            try:
                # 监督者决策
                result = await supervisor.ainvoke(state, config)
                
                # 解析下一个智能体
                next_agent = self._parse_next_agent(result)
                state["next_agent"] = next_agent
                
                if next_agent == "END":
                    state["task_status"] = "completed"
                
                state["messages"].append(AIMessage(content=f"监督者决策: {result}"))
                
                return state
                
            except Exception as e:
                logger.error(f"监督者执行失败: {e}")
                state["error_message"] = str(e)
                state["task_status"] = "failed"
                return state
        
        return supervisor_node
    
    def _should_continue(self, state: AgentState) -> str:
        """决定是否继续执行"""
        if state.get("task_status") == "completed":
            return "END"
        
        if state.get("iteration_count", 0) >= state.get("max_iterations", 10):
            return "END"
        
        if state.get("error_message"):
            return "END"
        
        next_agent = state.get("next_agent")
        if next_agent and next_agent in self.agents:
            return next_agent
        
        return "END"
    
    def _parse_next_agent(self, supervisor_result: str) -> str:
        """解析监督者决策的下一个智能体"""
        # 简单的解析逻辑，实际应该更智能
        if "researcher" in supervisor_result.lower():
            return "researcher"
        elif "analyst" in supervisor_result.lower():
            return "analyst"
        elif "developer" in supervisor_result.lower():
            return "developer"
        elif "reviewer" in supervisor_result.lower():
            return "reviewer"
        else:
            return "END"
    
    @service_method
    async def execute_multi_agent_task(
        self,
        task_description: str,
        workflow_type: str = "supervisor",
        agents: Optional[List[str]] = None,
        max_iterations: int = 10
    ) -> ServiceResult:
        """执行多智能体任务"""
        try:
            task_id = str(uuid.uuid4())
            
            # 默认智能体列表
            if agents is None:
                agents = ["supervisor", "researcher", "analyst", "developer", "reviewer"]
            
            # 创建工作流
            if workflow_type == "sequential":
                workflow = self.create_sequential_workflow(agents)
            else:
                workflow = self.create_supervisor_workflow(agents)
            
            # 初始化状态
            initial_state = AgentState(
                messages=[HumanMessage(content=task_description)],
                current_agent="",
                task_id=task_id,
                task_description=task_description,
                task_status="running",
                results={},
                next_agent=None,
                iteration_count=0,
                max_iterations=max_iterations,
                error_message=None
            )
            
            # 执行工作流
            config = RunnableConfig(
                configurable={"thread_id": task_id}
            )
            
            final_state = await workflow.ainvoke(initial_state, config)
            
            return ServiceResult(
                success=True,
                data={
                    "task_id": task_id,
                    "status": final_state.get("task_status", "completed"),
                    "results": final_state.get("results", {}),
                    "messages": [msg.content for msg in final_state.get("messages", [])],
                    "iteration_count": final_state.get("iteration_count", 0)
                },
                message="多智能体任务执行完成"
            )
            
        except Exception as e:
            logger.error(f"多智能体任务执行失败: {e}")
            return ServiceResult(
                success=False,
                error=ServiceError(
                    code="MULTI_AGENT_EXECUTION_FAILED",
                    message=f"多智能体任务执行失败: {str(e)}"
                )
            )
    
    @service_method
    async def get_agent_status(self, agent_name: str) -> ServiceResult:
        """获取智能体状态"""
        try:
            if agent_name not in self.agents:
                return ServiceResult(
                    success=False,
                    error=ValidationError(f"智能体 {agent_name} 不存在")
                )
            
            return ServiceResult(
                success=True,
                data={
                    "name": agent_name,
                    "status": "active",
                    "available": True
                },
                message=f"智能体 {agent_name} 状态获取成功"
            )
            
        except Exception as e:
            logger.error(f"获取智能体状态失败: {e}")
            return ServiceResult(
                success=False,
                error=ServiceError(
                    code="AGENT_STATUS_FAILED",
                    message=f"获取智能体状态失败: {str(e)}"
                )
            )
    
    @service_method
    async def list_agents(self) -> ServiceResult:
        """列出所有智能体"""
        try:
            agents_info = []
            for name, agent in self.agents.items():
                agents_info.append({
                    "name": name,
                    "status": "active",
                    "type": "langgraph_agent"
                })
            
            return ServiceResult(
                success=True,
                data={"agents": agents_info},
                message="智能体列表获取成功"
            )
            
        except Exception as e:
            logger.error(f"获取智能体列表失败: {e}")
            return ServiceResult(
                success=False,
                error=ServiceError(
                    code="LIST_AGENTS_FAILED",
                    message=f"获取智能体列表失败: {str(e)}"
                )
            )
    
    async def _execute_core(self, request: Any, context: ServiceContext) -> ServiceResult:
        """实现BaseService的抽象方法
        
        这是BaseService要求实现的核心执行方法。
        对于LangGraph多智能体服务，我们将请求委托给具体的服务方法。
        
        Args:
            request: 请求数据，可以是任何类型
            context: 服务上下文
            
        Returns:
            ServiceResult: 执行结果
        """
        try:
            # 如果请求是字符串，作为任务描述处理
            if isinstance(request, str):
                return await self.execute_multi_agent_task(request)
            
            # 如果请求是字典，解析参数
            elif isinstance(request, dict):
                task_description = request.get('task_description', '')
                workflow_type = request.get('workflow_type', 'supervisor')
                agents = request.get('agents')
                max_iterations = request.get('max_iterations', 10)
                
                return await self.execute_multi_agent_task(
                    task_description=task_description,
                    workflow_type=workflow_type,
                    agents=agents,
                    max_iterations=max_iterations
                )
            
            # 其他类型的请求
            else:
                return ServiceResult(
                    success=False,
                    error=ValidationError("不支持的请求类型")
                )
                
        except Exception as e:
            logger.error(f"核心执行方法失败: {e}")
            return ServiceResult(
                success=False,
                error=ServiceError(
                    code="CORE_EXECUTION_FAILED",
                    message=f"核心执行失败: {str(e)}"
                )
            )


# 全局服务实例
langgraph_multi_agent_service = LangGraphMultiAgentService()