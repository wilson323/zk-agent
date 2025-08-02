#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ZK-Agent智能体API端点

本模块提供智能体相关的RESTful API端点，支持智能体的创建、
管理、执行、协作等功能。

核心功能：
- 智能体CRUD操作
- 智能体配置管理
- 智能体执行控制
- 多智能体协作
- 智能体状态监控
- 智能体性能分析

API设计：
- RESTful风格
- 统一响应格式
- 分页和过滤
- 错误处理
- 权限控制

作者: ZK-Agent Team
创建时间: 2024-01-20
最后更新: 2024-01-20
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.redis import get_redis, RedisManager
from app.core.security import get_current_user, require_permission
from app.models.user import User
from app.models.agent import Agent, AgentType, AgentStatus
from app.services.agent_service import (
    AgentService, AgentRequest, AgentResponse, AgentOperation
)
from app.api.v1.schemas.agent import (
    AgentCreate, AgentUpdate, AgentInDB, AgentList,
    AgentExecuteRequest, AgentCollaborationRequest,
    AgentConfigUpdate, AgentStatusResponse
)
from app.api.v1.schemas.common import (
    StandardResponse, PaginatedResponse, ErrorResponse
)

# 创建路由器
router = APIRouter()


@router.post(
    "/",
    response_model=StandardResponse[AgentInDB],
    summary="创建智能体",
    description="创建一个新的智能体实例"
)
async def create_agent(
    agent_data: AgentCreate,
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[AgentInDB]:
    """
    创建新的智能体
    
    - **name**: 智能体名称
    - **description**: 智能体描述
    - **type**: 智能体类型
    - **config**: 智能体配置
    - **capabilities**: 智能体能力列表
    """
    try:
        # 创建智能体服务实例
        agent_service = AgentService(db, redis)
        
        # 构建请求
        request = AgentRequest(
            operation=AgentOperation.CREATE,
            agent_data={
                "name": agent_data.name,
                "description": agent_data.description,
                "type": agent_data.type,
                "config": agent_data.config,
                "capabilities": agent_data.capabilities,
                "user_id": current_user.id
            }
        )
        
        # 执行创建操作
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=AgentInDB(**result.data.agent_data),
                message="智能体创建成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体创建失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"创建智能体时发生错误: {str(e)}"
        )


@router.get(
    "/",
    response_model=PaginatedResponse[AgentList],
    summary="获取智能体列表",
    description="获取当前用户的智能体列表，支持分页和过滤"
)
async def list_agents(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    agent_type: Optional[AgentType] = Query(None, description="智能体类型过滤"),
    status: Optional[AgentStatus] = Query(None, description="状态过滤"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[AgentList]:
    """
    获取智能体列表
    
    支持以下过滤条件：
    - **agent_type**: 按智能体类型过滤
    - **status**: 按状态过滤
    - **search**: 按名称或描述搜索
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.LIST,
            filters={
                "user_id": current_user.id,
                "agent_type": agent_type,
                "status": status,
                "search": search,
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            agents_data = result.data.agents or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=[AgentList(**agent) for agent in agents_data],
                total=total,
                skip=skip,
                limit=limit,
                message="智能体列表获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取智能体列表失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取智能体列表时发生错误: {str(e)}"
        )


@router.get(
    "/{agent_id}",
    response_model=StandardResponse[AgentInDB],
    summary="获取智能体详情",
    description="根据ID获取智能体的详细信息"
)
async def get_agent(
    agent_id: str = Path(..., description="智能体ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[AgentInDB]:
    """
    获取智能体详情
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.GET,
            agent_id=agent_id,
            user_id=current_user.id
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=AgentInDB(**result.data.agent_data),
                message="智能体详情获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "智能体不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取智能体详情时发生错误: {str(e)}"
        )


@router.put(
    "/{agent_id}",
    response_model=StandardResponse[AgentInDB],
    summary="更新智能体",
    description="更新智能体的配置和信息"
)
async def update_agent(
    agent_id: str = Path(..., description="智能体ID"),
    agent_data: AgentUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[AgentInDB]:
    """
    更新智能体
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.UPDATE,
            agent_id=agent_id,
            user_id=current_user.id,
            agent_data=agent_data.dict(exclude_unset=True)
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=AgentInDB(**result.data.agent_data),
                message="智能体更新成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体更新失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新智能体时发生错误: {str(e)}"
        )


@router.delete(
    "/{agent_id}",
    response_model=StandardResponse[Dict[str, str]],
    summary="删除智能体",
    description="删除指定的智能体"
)
async def delete_agent(
    agent_id: str = Path(..., description="智能体ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, str]]:
    """
    删除智能体
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.DELETE,
            agent_id=agent_id,
            user_id=current_user.id
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data={"agent_id": agent_id, "status": "deleted"},
                message="智能体删除成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体删除失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"删除智能体时发生错误: {str(e)}"
        )


@router.post(
    "/{agent_id}/start",
    response_model=StandardResponse[AgentStatusResponse],
    summary="启动智能体",
    description="启动指定的智能体"
)
async def start_agent(
    agent_id: str = Path(..., description="智能体ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[AgentStatusResponse]:
    """
    启动智能体
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.START,
            agent_id=agent_id,
            user_id=current_user.id
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=AgentStatusResponse(
                    agent_id=agent_id,
                    status=result.data.status,
                    message=result.data.message
                ),
                message="智能体启动成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体启动失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"启动智能体时发生错误: {str(e)}"
        )


@router.post(
    "/{agent_id}/stop",
    response_model=StandardResponse[AgentStatusResponse],
    summary="停止智能体",
    description="停止指定的智能体"
)
async def stop_agent(
    agent_id: str = Path(..., description="智能体ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[AgentStatusResponse]:
    """
    停止智能体
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.STOP,
            agent_id=agent_id,
            user_id=current_user.id
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=AgentStatusResponse(
                    agent_id=agent_id,
                    status=result.data.status,
                    message=result.data.message
                ),
                message="智能体停止成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体停止失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"停止智能体时发生错误: {str(e)}"
        )


@router.post(
    "/{agent_id}/execute",
    response_model=StandardResponse[Dict[str, Any]],
    summary="执行智能体任务",
    description="让智能体执行指定的任务"
)
async def execute_agent(
    agent_id: str = Path(..., description="智能体ID"),
    execute_request: AgentExecuteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    执行智能体任务
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.EXECUTE,
            agent_id=agent_id,
            user_id=current_user.id,
            execution_data={
                "task": execute_request.task,
                "inputs": execute_request.inputs,
                "parameters": execute_request.parameters
            }
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.execution_result,
                message="智能体任务执行成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体任务执行失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"执行智能体任务时发生错误: {str(e)}"
        )


@router.post(
    "/{agent_id}/collaborate",
    response_model=StandardResponse[Dict[str, Any]],
    summary="设置智能体协作",
    description="设置智能体与其他智能体的协作关系"
)
async def setup_collaboration(
    agent_id: str = Path(..., description="智能体ID"),
    collaboration_request: AgentCollaborationRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    设置智能体协作
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.COLLABORATE,
            agent_id=agent_id,
            user_id=current_user.id,
            collaboration_data={
                "collaborator_ids": collaboration_request.collaborator_ids,
                "collaboration_type": collaboration_request.collaboration_type,
                "parameters": collaboration_request.parameters
            }
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.collaboration_result,
                message="智能体协作设置成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体协作设置失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"设置智能体协作时发生错误: {str(e)}"
        )


@router.get(
    "/{agent_id}/status",
    response_model=StandardResponse[AgentStatusResponse],
    summary="获取智能体状态",
    description="获取智能体的当前状态信息"
)
async def get_agent_status(
    agent_id: str = Path(..., description="智能体ID"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[AgentStatusResponse]:
    """
    获取智能体状态
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.STATUS,
            agent_id=agent_id,
            user_id=current_user.id
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=AgentStatusResponse(
                    agent_id=agent_id,
                    status=result.data.status,
                    message=result.data.message,
                    metrics=result.data.metrics
                ),
                message="智能体状态获取成功"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=result.error or "智能体不存在"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取智能体状态时发生错误: {str(e)}"
        )


@router.get(
    "/{agent_id}/executions",
    response_model=PaginatedResponse[Dict[str, Any]],
    summary="获取智能体执行历史",
    description="获取智能体的执行历史记录"
)
async def get_agent_executions(
    agent_id: str = Path(..., description="智能体ID"),
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(20, ge=1, le=100, description="返回的记录数"),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> PaginatedResponse[Dict[str, Any]]:
    """
    获取智能体执行历史
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.HISTORY,
            agent_id=agent_id,
            user_id=current_user.id,
            filters={
                "skip": skip,
                "limit": limit
            }
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            executions = result.data.executions or []
            total = result.data.total or 0
            
            return PaginatedResponse(
                success=True,
                data=executions,
                total=total,
                skip=skip,
                limit=limit,
                message="智能体执行历史获取成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "获取执行历史失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取智能体执行历史时发生错误: {str(e)}"
        )


@router.put(
    "/{agent_id}/config",
    response_model=StandardResponse[Dict[str, Any]],
    summary="更新智能体配置",
    description="更新智能体的配置参数"
)
async def update_agent_config(
    agent_id: str = Path(..., description="智能体ID"),
    config_update: AgentConfigUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    redis: RedisManager = Depends(get_redis),
    current_user: User = Depends(get_current_user)
) -> StandardResponse[Dict[str, Any]]:
    """
    更新智能体配置
    """
    try:
        agent_service = AgentService(db, redis)
        
        request = AgentRequest(
            operation=AgentOperation.CONFIG,
            agent_id=agent_id,
            user_id=current_user.id,
            config_data=config_update.dict(exclude_unset=True)
        )
        
        result = await agent_service.execute(request)
        
        if result.success:
            return StandardResponse(
                success=True,
                data=result.data.config_result,
                message="智能体配置更新成功"
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error or "智能体配置更新失败"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"更新智能体配置时发生错误: {str(e)}"
        )