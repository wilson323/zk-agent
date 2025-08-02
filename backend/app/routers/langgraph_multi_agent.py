#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent LangGraph多智能体API路由

提供基于LangGraph的多智能体系统API接口，支持：
- 多智能体任务执行
- 智能体状态管理
- 工作流控制
- 实时监控
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field

from app.services.langgraph_multi_agent_service import langgraph_multi_agent_service
from app.core.security import get_current_user
from app.models.user import User
from app.utils.logger import get_logger

logger = get_logger()
router = APIRouter(prefix="/api/v1/langgraph", tags=["LangGraph多智能体"])


class MultiAgentTaskRequest(BaseModel):
    """多智能体任务请求"""
    task_description: str = Field(..., description="任务描述")
    workflow_type: str = Field(default="supervisor", description="工作流类型: sequential, supervisor")
    agents: Optional[List[str]] = Field(default=None, description="参与的智能体列表")
    max_iterations: int = Field(default=10, description="最大迭代次数")
    
    class Config:
        schema_extra = {
            "example": {
                "task_description": "分析当前AI技术趋势并提供技术选型建议",
                "workflow_type": "supervisor",
                "agents": ["supervisor", "researcher", "analyst", "reviewer"],
                "max_iterations": 10
            }
        }


class MultiAgentTaskResponse(BaseModel):
    """多智能体任务响应"""
    task_id: str
    status: str
    results: Dict[str, Any]
    messages: List[str]
    iteration_count: int
    
    class Config:
        schema_extra = {
            "example": {
                "task_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "completed",
                "results": {
                    "researcher": "收集了AI技术趋势数据",
                    "analyst": "分析了技术发展方向",
                    "reviewer": "提供了技术选型建议"
                },
                "messages": [
                    "任务开始执行",
                    "研究员完成信息收集",
                    "分析师完成趋势分析",
                    "审查员完成建议输出"
                ],
                "iteration_count": 4
            }
        }


class AgentStatusResponse(BaseModel):
    """智能体状态响应"""
    name: str
    status: str
    available: bool
    
    class Config:
        schema_extra = {
            "example": {
                "name": "researcher",
                "status": "active",
                "available": True
            }
        }


class AgentListResponse(BaseModel):
    """智能体列表响应"""
    agents: List[Dict[str, Any]]
    
    class Config:
        schema_extra = {
            "example": {
                "agents": [
                    {"name": "supervisor", "status": "active", "type": "langgraph_agent"},
                    {"name": "researcher", "status": "active", "type": "langgraph_agent"},
                    {"name": "analyst", "status": "active", "type": "langgraph_agent"},
                    {"name": "developer", "status": "active", "type": "langgraph_agent"},
                    {"name": "reviewer", "status": "active", "type": "langgraph_agent"}
                ]
            }
        }


@router.post(
    "/tasks",
    response_model=MultiAgentTaskResponse,
    summary="执行多智能体任务",
    description="创建并执行一个多智能体协同任务"
)
async def execute_multi_agent_task(
    request: MultiAgentTaskRequest,
    current_user: User = Depends(get_current_user)
):
    """执行多智能体任务"""
    try:
        logger.info(f"用户 {current_user.username} 请求执行多智能体任务: {request.task_description}")
        
        result = await langgraph_multi_agent_service.execute_multi_agent_task(
            task_description=request.task_description,
            workflow_type=request.workflow_type,
            agents=request.agents,
            max_iterations=request.max_iterations
        )
        
        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=result.error.message if result.error else "任务执行失败"
            )
        
        return MultiAgentTaskResponse(**result.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"执行多智能体任务失败: {e}")
        raise HTTPException(status_code=500, detail=f"内部服务器错误: {str(e)}")


@router.get(
    "/agents",
    response_model=AgentListResponse,
    summary="获取智能体列表",
    description="获取所有可用的智能体列表"
)
async def list_agents(
    current_user: User = Depends(get_current_user)
):
    """获取智能体列表"""
    try:
        logger.info(f"用户 {current_user.username} 请求获取智能体列表")
        
        result = await langgraph_multi_agent_service.list_agents()
        
        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=result.error.message if result.error else "获取智能体列表失败"
            )
        
        return AgentListResponse(**result.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取智能体列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"内部服务器错误: {str(e)}")


@router.get(
    "/agents/{agent_name}/status",
    response_model=AgentStatusResponse,
    summary="获取智能体状态",
    description="获取指定智能体的当前状态"
)
async def get_agent_status(
    agent_name: str,
    current_user: User = Depends(get_current_user)
):
    """获取智能体状态"""
    try:
        logger.info(f"用户 {current_user.username} 请求获取智能体 {agent_name} 状态")
        
        result = await langgraph_multi_agent_service.get_agent_status(agent_name)
        
        if not result.success:
            raise HTTPException(
                status_code=404 if "不存在" in (result.error.message if result.error else "") else 400,
                detail=result.error.message if result.error else "获取智能体状态失败"
            )
        
        return AgentStatusResponse(**result.data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取智能体状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"内部服务器错误: {str(e)}")


@router.get(
    "/workflows/types",
    summary="获取工作流类型",
    description="获取支持的工作流类型列表"
)
async def get_workflow_types(
    current_user: User = Depends(get_current_user)
):
    """获取工作流类型"""
    try:
        logger.info(f"用户 {current_user.username} 请求获取工作流类型")
        
        workflow_types = [
            {
                "type": "sequential",
                "name": "顺序工作流",
                "description": "智能体按顺序依次执行任务",
                "suitable_for": "线性任务处理、流水线作业"
            },
            {
                "type": "supervisor",
                "name": "监督者工作流",
                "description": "由监督者智能体协调其他智能体执行任务",
                "suitable_for": "复杂任务分解、动态任务分配"
            }
        ]
        
        return {
            "workflow_types": workflow_types,
            "default": "supervisor"
        }
        
    except Exception as e:
        logger.error(f"获取工作流类型失败: {e}")
        raise HTTPException(status_code=500, detail=f"内部服务器错误: {str(e)}")


@router.get(
    "/health",
    summary="健康检查",
    description="检查LangGraph多智能体服务健康状态"
)
async def health_check():
    """健康检查"""
    try:
        # 检查服务状态
        result = await langgraph_multi_agent_service.list_agents()
        
        if result.success:
            return {
                "status": "healthy",
                "service": "langgraph_multi_agent",
                "agents_count": len(result.data.get("agents", [])),
                "timestamp": "2024-01-20T10:00:00Z"
            }
        else:
            return {
                "status": "unhealthy",
                "service": "langgraph_multi_agent",
                "error": result.error.message if result.error else "未知错误",
                "timestamp": "2024-01-20T10:00:00Z"
            }
            
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "service": "langgraph_multi_agent",
            "error": str(e),
            "timestamp": "2024-01-20T10:00:00Z"
        }